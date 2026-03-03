import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox';
    const plaidUrl = plaidEnv === 'production' ? 'https://production.plaid.com' : 'https://sandbox.plaid.com';
    
    const plaidResponse = await fetch(`${plaidUrl}/link/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: Deno.env.get('PLAID_CLIENT_ID'),
        secret: Deno.env.get('PLAID_SECRET'),
        user: { client_user_id: user.id },
        client_name: 'Money Buddy',
        products: ['auth', 'transactions'],
        country_codes: ['US'],
        language: 'en',
        webhook: `${Deno.env.get('SUPABASE_URL')}/functions/v1/plaid-webhook`,
      }),
    });

    const plaidData = await plaidResponse.json();

    if (!plaidResponse.ok) {
      console.error("PLAID ERROR DETAILS:", JSON.stringify(plaidData));
      return new Response(JSON.stringify({ 
        error_message: plaidData.error_message,
        error_code: plaidData.error_code,
        error_type: plaidData.error_type
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ link_token: plaidData.link_token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
