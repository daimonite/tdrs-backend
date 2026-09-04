import crypto from 'crypto';
import { supabase } from '../config/supabase.js';
import paymeService from '../services/paymeService.js';
import textifySms from '../services/textifySmsService.js';

/**
 * Payment Controller - Handles PayMe Africa Checkout & Idempotent Webhook
 * Stores verified payment ledger and issues unique QR BIB tickets
 */
export const initiatePayment = async (req, res) => {
  try {
    const { order_number, amount_tsh, phone_number, provider = 'mpesa' } = req.body;

    if (!order_number || !amount_tsh || !phone_number) {
      return res.status(400).json({ error: 'Missing required payment parameters (order_number, amount_tsh, phone_number)' });
    }

    const paymeResult = await paymeService.initiateMobilePayment({
      orderNumber: order_number,
      amountTsh: parseInt(amount_tsh, 10),
      phoneNumber: phone_number,
      provider
    });

    return res.status(200).json({
      success: true,
      message: 'Payment intent created and USSD push initiated.',
      data: paymeResult
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    return res.status(500).json({ error: 'Failed to initiate mobile money payment' });
  }
};

export const handlePayMeWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-payme-signature'];
    const {
      idempotency_key,
      event_type,
      order_number,
      amount_tsh,
      payme_reference,
      phone_number,
      provider = 'mpesa',
      status
    } = req.body;

    console.log(`[PayMe Webhook] Received ${event_type} for order ${order_number}`);

    // 1. Verify HMAC Signature if secret is configured
    if (process.env.PAYME_WEBHOOK_SECRET && signature) {
      const isValid = paymeService.verifyWebhookSignature(req.body, signature);
      if (!isValid) {
        console.warn('⚠️ Webhook signature mismatch');
        return res.status(401).json({ error: 'Invalid HMAC webhook signature' });
      }
    }

    // 2. Idempotency Check in Supabase
    if (idempotency_key) {
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('*')
        .eq('idempotency_key', idempotency_key)
        .maybeSingle();

      if (existingPayment) {
        return res.status(200).json({
          status: 'ok',
          duplicate_prevented: true,
          message: 'Payment was already processed idempotently',
          payment: existingPayment
        });
      }
    }

    // 3. Process Successful Payment
    if (status === 'success' || event_type === 'charge.completed') {
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', order_number)
        .single();

      if (orderErr || !order) {
        return res.status(404).json({ error: `Order ${order_number} not found in database` });
      }

      // Record payment in ledger
      const paymentKey = idempotency_key || `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const { data: paymentRecord, error: payErr } = await supabase
        .from('payments')
        .insert([{
          order_id: order.id,
          idempotency_key: paymentKey,
          payme_reference: payme_reference || `PAYME-${Date.now()}`,
          payment_method: provider,
          phone_number: phone_number || order.billing_phone,
          amount_tsh: parseInt(amount_tsh, 10) || order.total_amount_tsh,
          status: 'successful',
          paid_at: new Date().toISOString()
        }])
        .select('*')
        .single();

      if (payErr) {
        console.error('Error logging payment in Supabase:', payErr.message);
      }

      // Update order status to paid
      await supabase
        .from('orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', order.id);

      // Mark inventory reservations as completed_paid
      await supabase
        .from('inventory_reservations')
        .update({ status: 'completed_paid' })
        .eq('order_id', order.id);

      // Find activity items to issue tickets
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)
        .eq('item_type', 'activity_ticket');

      const issuedTickets = [];

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          const { data: act } = await supabase
            .from('activities')
            .select('*')
            .eq('id', item.reference_id)
            .maybeSingle();

          const category = act?.category || 'Cycling';
          const prefix = category.substring(0, 3).toUpperCase();
          const bibNumber = `${prefix}-2026-${Math.floor(100 + Math.random() * 900)}`;
          const qrVerificationToken = crypto.randomBytes(16).toString('hex');

          const { data: ticket } = await supabase
            .from('tickets')
            .insert([{
              order_id: order.id,
              profile_id: order.profile_id,
              activity_id: item.reference_id,
              bib_number: bibNumber,
              qr_verification_token: qrVerificationToken,
              checked_in: false
            }])
            .select('*')
            .single();

          if (ticket) {
            issuedTickets.push(ticket);

            // Increment registered_count on activity
            if (act) {
              await supabase
                .from('activities')
                .update({ registered_count: (act.registered_count || 0) + 1 })
                .eq('id', act.id);
            }
          }
        }
      }

      // Fetch user profile name for confirmation SMS
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', order.profile_id)
        .maybeSingle();

      const fullName = profile?.full_name || 'Participant';
      const targetPhone = phone_number || order.billing_phone;

      if (targetPhone && issuedTickets.length > 0) {
        await textifySms.sendTicketIssuedSms(targetPhone, {
          fullName,
          bibNumber: issuedTickets[0].bib_number,
          activityTitle: 'Tour de Rotary DSM 2026',
          qrToken: issuedTickets[0].qr_verification_token
        });
      }

      return res.status(200).json({
        status: 'ok',
        message: 'Payment recorded, order confirmed, and tickets issued.',
        payment: paymentRecord,
        tickets_issued: issuedTickets
      });
    }

    return res.status(200).json({ status: 'ignored', message: `Unhandled event status: ${status}` });
  } catch (error) {
    console.error('Webhook processing exception:', error);
    return res.status(500).json({ error: 'Webhook processing failure' });
  }
};

export const getPaymentStatus = async (req, res) => {
  try {
    const { order_number } = req.params;

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, payments(*)')
      .eq('order_number', order_number)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: `Order ${order_number} not found` });
    }

    const payment = order.payments?.[0];

    return res.status(200).json({
      status: 'success',
      order_number: order.order_number,
      payment_status: order.status.toUpperCase(),
      total_amount_tsh: order.total_amount_tsh,
      currency: 'TZS',
      payment_method: payment?.payment_method || null,
      payme_reference: payment?.payme_reference || null,
      paid_at: payment?.paid_at || null
    });
  } catch (error) {
    console.error('getPaymentStatus exception:', error);
    return res.status(500).json({ error: 'Failed to retrieve payment status' });
  }
};

export const retryPayment = async (req, res) => {
  try {
    const { order_number, phone_number, provider = 'mpesa' } = req.body;

    if (!order_number || !phone_number) {
      return res.status(400).json({ error: 'order_number and phone_number are required for payment retry' });
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', order_number)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: `Order ${order_number} not found in database` });
    }

    if (order.status === 'paid') {
      return res.status(400).json({ error: `Order ${order_number} has already been paid` });
    }

    const paymeResult = await paymeService.initiateMobilePayment({
      orderNumber: order.order_number,
      amountTsh: order.total_amount_tsh,
      phoneNumber: phone_number,
      provider
    });

    return res.status(200).json({
      status: 'success',
      message: 'Payment retry initiated. Please check your phone for the USSD prompt.',
      data: paymeResult
    });
  } catch (error) {
    console.error('retryPayment exception:', error);
    return res.status(500).json({ error: 'Failed to retry payment' });
  }
};
