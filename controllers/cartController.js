import { supabase } from '../config/supabase.js';

/**
 * Cart Controller - Processes mixed checkout (tickets + official merchandise)
 * Creates orders and locks merchandise for 7 days in inventory_reservations
 */
export const checkoutCart = async (req, res) => {
  try {
    const { 
      full_name, 
      email, 
      phone_number, 
      activity_id, 
      merchandise_items = [], 
      tshirt_size,
      promo_code 
    } = req.body;

    if (!full_name || !email || !phone_number || !activity_id) {
      return res.status(400).json({ error: 'Missing required registration parameters (full_name, email, phone_number, activity_id)' });
    }

    // 1. Get or create participant profile.
    // This is a financial/registration path — if the database write fails,
    // the request must fail loudly. Silently continuing with a fabricated
    // profile ID would let checkout "succeed" for a participant who was
    // never actually saved, and later payment/ticketing lookups would fail.
    let profile = null;
    const { data: existingProfile, error: profileLookupErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (profileLookupErr) {
      console.error('Profile lookup failed:', profileLookupErr.message);
      return res.status(500).json({ error: 'Failed to look up participant profile' });
    }

    if (existingProfile) {
      profile = existingProfile;
    } else {
      const { data: newProfile, error: profileInsertErr } = await supabase
        .from('profiles')
        .insert([{
          full_name,
          email,
          phone_number,
          tshirt_size: tshirt_size || 'L',
          role: 'participant'
        }])
        .select('id')
        .single();

      if (profileInsertErr || !newProfile) {
        console.error('Profile creation failed:', profileInsertErr?.message);
        return res.status(500).json({ error: 'Failed to create participant profile' });
      }
      profile = newProfile;
    }

    // 2. Fetch edition
    const { data: edition } = await supabase
      .from('event_editions')
      .select('id')
      .eq('year', 2026)
      .single();

    const editionId = edition?.id || 'e2026000-0000-0000-0000-000000000001';

    // 3. Fetch activity details
    const { data: activity } = await supabase
      .from('activities')
      .select('*')
      .eq('id', activity_id)
      .single();

    const activityPriceTsh = activity ? activity.early_bird_price_tsh : 45000;
    const activityTitle = activity ? activity.title : 'Tour de Rotary 2026';

    // 4. Calculate merchandise prices
    let merchSubtotalTsh = 0;
    const resolvedMerch = [];

    for (const item of merchandise_items) {
      const qty = item.quantity || 1;
      let unitPrice = item.unit_price_tsh || 35000;

      if (item.variant_id) {
        const { data: variant } = await supabase
          .from('product_variants')
          .select('*')
          .eq('id', item.variant_id)
          .single();

        if (variant) {
          unitPrice = variant.price_tsh;
        }
      }

      const subtotal = unitPrice * qty;
      merchSubtotalTsh += subtotal;

      resolvedMerch.push({
        item_type: 'merchandise',
        reference_id: item.variant_id || activity_id,
        description: item.name || 'Official Event Merchandise',
        quantity: qty,
        unit_price_tsh: unitPrice,
        subtotal_tsh: subtotal
      });
    }

    const subtotalTsh = activityPriceTsh + merchSubtotalTsh;
    let discountTsh = 0;

    if (promo_code && promo_code.toUpperCase() === 'ROTARY2026') {
      discountTsh = Math.round(subtotalTsh * 0.10);
    }

    const totalTsh = subtotalTsh - discountTsh;
    const orderNumber = `TDR-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    // 5. Insert order into Supabase — must succeed for real, no fabricated fallback
    const { data: orderRecord, error: orderErr } = await supabase
      .from('orders')
      .insert([{
        order_number: orderNumber,
        profile_id: profile.id,
        edition_id: editionId,
        status: 'pending',
        subtotal_tsh: subtotalTsh,
        discount_tsh: discountTsh,
        total_tsh: totalTsh,
        currency: 'TZS',
        billing_phone: phone_number
      }])
      .select('*')
      .single();

    if (orderErr || !orderRecord) {
      console.error('Order creation failed:', orderErr?.message);
      return res.status(500).json({ error: 'Failed to create order' });
    }

    // 6. Insert order items
    const orderItemsToInsert = [
      {
        order_id: orderRecord.id,
        item_type: 'activity_ticket',
        reference_id: activity_id,
        description: activityTitle,
        quantity: 1,
        unit_price_tsh: activityPriceTsh,
        subtotal_tsh: activityPriceTsh
      },
      ...resolvedMerch.map(m => ({
        order_id: orderRecord.id,
        item_type: 'merchandise',
        reference_id: m.reference_id,
        description: m.description,
        quantity: m.quantity,
        unit_price_tsh: m.unit_price_tsh,
        subtotal_tsh: m.subtotal_tsh
      }))
    ];

    const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsToInsert);
    if (itemsErr) {
      console.error('Order items insert failed:', itemsErr.message);
      return res.status(500).json({ error: 'Failed to save order items' });
    }

    // 7. Lock 7-day inventory reservations for merchandise
    if (resolvedMerch.length > 0) {
      const reservations = resolvedMerch.map(m => ({
        order_id: orderRecord.id,
        variant_id: m.reference_id,
        quantity: m.quantity,
        status: 'active',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }));

      const { error: reservationErr } = await supabase.from('inventory_reservations').insert(reservations);
      if (reservationErr) {
        console.error('Inventory reservation insert failed:', reservationErr.message);
        return res.status(500).json({ error: 'Failed to reserve merchandise stock' });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Order created with 7-day inventory lock. Ready for PayMe payment.',
      order: {
        id: orderRecord.id,
        order_number: orderRecord.order_number,
        total_tsh: totalTsh,
        currency: 'TZS',
        items: orderItemsToInsert,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      next_step: {
        payme_endpoint: '/api/v1/payments/initiate',
        payload: {
          order_number: orderNumber,
          amount_tsh: totalTsh,
          phone_number
        }
      }
    });
  } catch (error) {
    console.error('Cart checkout exception:', error);
    return res.status(500).json({ error: 'Failed to process checkout' });
  }
};
