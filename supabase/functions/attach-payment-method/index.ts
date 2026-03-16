import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { payment_method_id } = await req.json();
    if (!payment_method_id || typeof payment_method_id !== 'string') {
      return new Response(JSON.stringify({ error: 'payment_method_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const serviceSupabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Server missing STRIPE_SECRET_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: profile } = await serviceSupabase.from('profiles').select('stripe_customer_id').eq('id', user.id).single();
    const customerId = profile?.stripe_customer_id;
    if (!customerId) {
      return new Response(JSON.stringify({ error: 'No Stripe customer. Add a card from Settings first.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const attachRes = await fetch(`https://api.stripe.com/v1/payment_methods/${payment_method_id}/attach`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ customer: customerId }).toString(),
    });
    const attached = await attachRes.json();
    if (attached.error) throw new Error(attached.error.message);

    const brand = (attached.card?.brand || 'card') as string;
    const last4 = attached.card?.last4 || '****';

    const { data: existing } = await serviceSupabase.from('payment_methods').select('id').eq('user_id', user.id).eq('stripe_payment_method_id', payment_method_id).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ id: existing.id, brand, last4 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const isFirst = (await serviceSupabase.from('payment_methods').select('id', { count: 'exact', head: true }).eq('user_id', user.id)).count === 0;
    const { data: row, error: insertErr } = await serviceSupabase.from('payment_methods').insert({
      user_id: user.id,
      type: 'card',
      stripe_payment_method_id: payment_method_id,
      brand,
      last4,
      is_default: isFirst,
    }).select('id, brand, last4, is_default').single();

    if (insertErr) throw new Error(insertErr.message);
    return new Response(JSON.stringify(row), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
