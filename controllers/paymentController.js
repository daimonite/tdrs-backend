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
    const rawOrderNumber = req.body.order_number || req.body.orderNumber;
    const rawAmount = req.body.amount_tsh || req.body.amountTsh || req.body.amountTSh;
    const phoneNumber = req.body.phone_number || req.body.phoneNumber || req.body.phone;
    const provider = req.body.provider || 'mpesa';
    const registrationId = req.body.registrationId || req.body.registration_id;

    let orderNumber = rawOrderNumber;
    let amountTsh = rawAmount ? parseInt(rawAmount, 10) : 0;

    // If registrationId is supplied without orderNumber, look up or derive matching order
    if (!orderNumber && registrationId) {
      const { data: regOrder } = await supabase
        .from('orders')
        .select('order_number, total_tsh')
        .eq('source_registration_id', registrationId)
        .maybeSingle();

      if (regOrder) {
        orderNumber = regOrder.order_number;
        if (!amountTsh) amountTsh = regOrder.total_tsh;
      } else {
        const { data: reg } = await supabase
          .from('registrations')
          .select('id, amount_tsh')
          .eq('id', registrationId)
          .maybeSingle();

        if (reg) {
          orderNumber = `TDR-REG-${reg.id.slice(0, 8).toUpperCase()}`;
          if (!amountTsh) amountTsh = reg.amount_tsh || 0;
        } else {
          orderNumber = `TDR-REG-${String(registrationId).slice(0, 8).toUpperCase()}`;
        }
      }
    }

    if (!orderNumber || !amountTsh || !phoneNumber) {
      return res.status(400).json({
        error: 'Missing required payment parameters (order_number/registrationId, amount, phone)',
        message: 'Missing required payment parameters (order_number/registrationId, amount, phone)'
      });
    }

    const paymeResult = await paymeService.initiateMobilePayment({
      orderNumber: orderNumber,
      amountTsh: amountTsh,
      phoneNumber: phoneNumber,
      provider
    });

    if (paymeResult.status === 'unconfigured' || paymeResult.status === 'failed') {
      return res.status(502).json({
        error: paymeResult.error || 'Payment provider unavailable',
        message: paymeResult.error || 'Payment provider unavailable'
      });
    }

    return res.status(200).json({
      checkoutUrl: paymeResult.checkout_url || null,
      transactionRef: paymeResult.payme_reference || paymeResult.transaction_ref || orderNumber
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    return res.status(500).json({
      error: 'Failed to initiate mobile money payment',
      message: error.message || 'Failed to initiate mobile money payment'
    });
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

    // 1. Verify HMAC signature whenever a secret is configured. This must
    // fail CLOSED: a configured secret makes the signature mandatory, not
    // "checked only if the caller happened to send one". The previous
    // `if (secret && signature)` skipped verification entirely whenever the
    // x-payme-signature header was simply omitted — letting anyone forge a
    // "payment successful" webhook for any order_number with no signature
    // at all, marking it paid and triggering real ticket issuance.
    if (process.env.PAYME_WEBHOOK_SECRET) {
      const isValid = Boolean(signature) && paymeService.verifyWebhookSignature(req.body, signature);
      if (!isValid) {
        console.warn('⚠️ Webhook signature missing or invalid');
        return res.status(401).json({ error: 'Missing or invalid HMAC webhook signature' });
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

      // The reported amount must match what the order actually owes — a
      // signature only proves the sender knows the shared secret, it
      // doesn't validate the payload's contents. Never trust a
      // client-supplied amount_tsh over the order's own recorded total.
      const reportedAmount = parseInt(amount_tsh, 10);
      if (Number.isFinite(reportedAmount) && reportedAmount !== order.total_tsh) {
        console.warn(`⚠️ Webhook amount mismatch for ${order_number}: reported ${reportedAmount}, order total ${order.total_tsh}`);
        return res.status(400).json({ error: 'Reported amount does not match order total' });
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
          amount_tsh: order.total_tsh,
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

      // Referral conversion (proposal flow 58-60): the friend's paid order
      // converts their pending referral; the referrer's reward is stamped
      // once so repeat orders don't double-reward.
      await supabase
        .from('referrals')
        .update({
          status: 'converted',
          order_id: order.id,
          converted_at: new Date().toISOString(),
          reward_label: 'Referral Bonus — Tour de Rotary DSM 2026'
        })
        .eq('referred_profile_id', order.profile_id)
        .eq('status', 'registered');

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

      const firstActivity = orderItems && orderItems.length > 0
        ? await supabase.from('activities').select('title').eq('id', orderItems[0].reference_id).maybeSingle()
        : { data: null };

      if (targetPhone && issuedTickets.length > 0) {
        await textifySms.sendTicketIssuedSms(targetPhone, {
          fullName,
          bibNumber: issuedTickets[0].bib_number,
          activityTitle: firstActivity.data?.title || 'Tour de Rotary DSM 2026',
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

export const getPaymentVerification = async (req, res) => {
  try {
    const { transactionRef } = req.params;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionRef);

    let query = supabase
      .from('orders')
      .select('status, payments(payme_reference)');

    if (isUUID) {
      query = query.or(`order_number.eq.${transactionRef},source_registration_id.eq.${transactionRef},id.eq.${transactionRef}`);
    } else {
      query = query.or(`order_number.eq.${transactionRef}`);
    }

    const { data: order, error } = await query.maybeSingle();

    let resolvedOrder = order;
    if (!resolvedOrder) {
      const { data: paymentMatch } = await supabase
        .from('payments')
        .select('orders(status)')
        .eq('payme_reference', transactionRef)
        .maybeSingle();
      resolvedOrder = paymentMatch?.orders || null;
    }

    // Direct registration check if a registration UUID was provided
    if (!resolvedOrder && isUUID) {
      const { data: reg } = await supabase
        .from('registrations')
        .select('payment_status')
        .eq('id', transactionRef)
        .maybeSingle();

      if (reg) {
        return res.status(200).json({
          status: reg.payment_status === 'completed' ? 'completed' : (reg.payment_status === 'failed' ? 'failed' : 'pending')
        });
      }
    }

    if (!resolvedOrder) {
      return res.status(404).json({ error: 'Transaction not found', message: 'Transaction not found' });
    }

    // Map internal order states to the frontend's expected 3-state enum: 'completed' | 'pending' | 'failed'
    const statusMap = { paid: 'completed', completed: 'completed', pending: 'pending', processing: 'pending', cancelled: 'failed', expired: 'failed', failed: 'failed' };

    return res.status(200).json({
      status: statusMap[resolvedOrder.status] || 'pending'
    });
  } catch (error) {
    console.error('getPaymentVerification exception:', error);
    return res.status(500).json({ error: 'Failed to verify payment', message: 'Failed to verify payment' });
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
      total_tsh: order.total_tsh,
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
      amountTsh: order.total_tsh,
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
