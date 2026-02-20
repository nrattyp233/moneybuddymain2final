import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { transaction_id, current_lat, current_lng } = await req.json();

    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch transaction
    const { data: tx, error: txError } = await serviceSupabase
      .from('transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (txError || !tx) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the user is the recipient
    if (tx.recipient_id !== user.id && tx.recipient_email?.toLowerCase() !== user.email?.toLowerCase()) {
      return new Response(JSON.stringify({ error: 'Only the recipient can release escrow' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (tx.status !== 'pending_escrow' && tx.status !== 'locked') {
      return new Response(JSON.stringify({ error: `Transaction is not in escrow (status: ${tx.status})` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check time lock
    if (tx.time_lock_until) {
      const lockTime = new Date(tx.time_lock_until);
      if (new Date() < lockTime) {
        return new Response(JSON.stringify({
          error: 'Time lock has not expired yet',
          time_lock_until: tx.time_lock_until,
          remaining_seconds: Math.ceil((lockTime.getTime() - Date.now()) / 1000),
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check geo-fence
    if (tx.geo_fence_lat != null && tx.geo_fence_lng != null && tx.geo_fence_radius != null) {
      if (current_lat == null || current_lng == null) {
        return new Response(JSON.stringify({ error: 'Location is required for this geo-fenced transaction' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const distance = haversineDistance(
        tx.geo_fence_lat, tx.geo_fence_lng,
        current_lat, current_lng
      );

      if (distance > tx.geo_fence_radius) {
        return new Response(JSON.stringify({
          error: 'You are outside the geo-fence area',
          required_radius_m: tx.geo_fence_radius,
          your_distance_m: Math.round(distance),
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // All conditions met -- create the Stripe Transfer
    // Get recipient's Stripe Connect account
    const { data: recipientProfile } = await serviceSupabase
      .from('profiles')
      .select('stripe_connect_account_id, stripe_connect_onboarded')
      .eq('id', tx.recipient_id || '')
      .single();

    if (!recipientProfile?.stripe_connect_account_id) {
      // Also try by email
      const { data: profileByEmail } = await serviceSupabase
        .from('profiles')
        .select('stripe_connect_account_id, stripe_connect_onboarded')
        .eq('email', tx.recipient_email.toLowerCase())
        .single();

      if (!profileByEmail?.stripe_connect_account_id) {
        return new Response(JSON.stringify({ error: 'Recipient has not connected a bank account via Stripe yet' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      recipientProfile.stripe_connect_account_id = profileByEmail.stripe_connect_account_id;
    }

    // Calculate transfer amount (98% of original -- 2% platform fee stays)
    const amountCents = Math.round(tx.amount * 100);
    const platformFeeCents = Math.round(amountCents * 0.02);
    const transferAmountCents = amountCents - platformFeeCents;

    const transferParams = new URLSearchParams();
    transferParams.append('amount', transferAmountCents.toString());
    transferParams.append('currency', 'usd');
    transferParams.append('destination', recipientProfile.stripe_connect_account_id);
    transferParams.append('source_transaction', tx.stripe_payment_intent_id);
    transferParams.append('metadata[transaction_id]', tx.id);
    transferParams.append('metadata[platform_fee_cents]', platformFeeCents.toString());

    const transferRes = await fetch('https://api.stripe.com/v1/transfers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: transferParams.toString(),
    });

    const transfer = await transferRes.json();

    if (transfer.error) {
      throw new Error(transfer.error.message);
    }

    // Update transaction status
    await serviceSupabase
      .from('transactions')
      .update({
        status: 'completed',
        stripe_transfer_id: transfer.id,
        platform_fee_amount: platformFeeCents / 100,
        completed_at: new Date().toISOString(),
      })
      .eq('id', transaction_id);

    // Update platform revenue
    await serviceSupabase
      .from('platform_revenue')
      .update({
        total_yield: serviceSupabase.rpc ? undefined : undefined, // handled by trigger
        last_updated: new Date().toISOString(),
      });

    // Audit log
    await serviceSupabase.from('audit_log').insert({
      event_type: 'ESCROW_RELEASED',
      user_id: user.id,
      transaction_id: tx.id,
      metadata: {
        transfer_id: transfer.id,
        amount: tx.amount,
        platform_fee: platformFeeCents / 100,
        net_to_recipient: transferAmountCents / 100,
        location: { lat: current_lat, lng: current_lng },
      },
    });

    return new Response(JSON.stringify({
      success: true,
      transfer_id: transfer.id,
      amount_transferred: transferAmountCents / 100,
      platform_fee: platformFeeCents / 100,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
