import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { crypto } from 'https://deno.land/std/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('PLAID_ENV') === 'development' ? '*' : 'https://your-domain.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Verify Stripe webhook signature
async function verifyStripeSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    const signatureParts = signature.split(',');
    let timestamp: string | null = null;
    let signedPayload: string | null = null;

    for (const part of signatureParts) {
      const [key, value] = part.trim().split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key.startsWith('v1')) {
        signedPayload = value;
      }
    }

    if (!timestamp || !signedPayload) {
      return false;
    }

    // Check timestamp is within 5 minutes
    const now = Math.floor(Date.now() / 1000);
    const eventTime = parseInt(timestamp);
    if (now - eventTime > 300) {
      return false;
    }

    const payload = `${timestamp}.${body}`;
    const payloadData = encoder.encode(payload);
    const signatureData = encoder.encode(signedPayload);

    return await crypto.subtle.verify('HMAC', key, signatureData, payloadData);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      return new Response(JSON.stringify({ error: 'Missing signature or secret' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the webhook signature
    const isValid = await verifyStripeSignature(body, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(body);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

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
