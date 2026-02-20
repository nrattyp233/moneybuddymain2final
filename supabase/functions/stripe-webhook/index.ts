import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const event = JSON.parse(body);

    // In production, verify the Stripe webhook signature:
    // const sig = req.headers.get('stripe-signature');
    // Use Stripe's webhook signature verification with STRIPE_WEBHOOK_SECRET

    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        // Move transaction from pending_payment to pending_escrow (locked)
        await serviceSupabase
          .from('transactions')
          .update({ status: 'pending_escrow' })
          .eq('stripe_payment_intent_id', pi.id)
          .eq('status', 'pending_payment');

        await serviceSupabase.from('audit_log').insert({
          event_type: 'PAYMENT_SUCCEEDED',
          user_id: pi.metadata?.sender_id || null,
          metadata: { payment_intent_id: pi.id, amount: pi.amount / 100 },
        });
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        await serviceSupabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', pi.id);

        await serviceSupabase.from('audit_log').insert({
          event_type: 'PAYMENT_FAILED',
          user_id: pi.metadata?.sender_id || null,
          metadata: {
            payment_intent_id: pi.id,
            failure_message: pi.last_payment_error?.message,
          },
        });
        break;
      }

      case 'account.updated': {
        const account = event.data.object;
        // Update stripe_connect_onboarded status
        if (account.charges_enabled && account.payouts_enabled) {
          await serviceSupabase
            .from('profiles')
            .update({ stripe_connect_onboarded: true })
            .eq('stripe_connect_account_id', account.id);
        }
        break;
      }

      default:
        // Unhandled event type
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
