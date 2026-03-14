import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

// Trigger redeploy with CORS fixes
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Check required environment variables
  const plaidClientId = Deno.env.get('PLAID_CLIENT_ID');
  const plaidSecret = Deno.env.get('PLAID_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!plaidClientId || !plaidSecret || !supabaseUrl || !supabaseAnonKey) {
    const missingVars = [];
    if (!plaidClientId) missingVars.push('PLAID_CLIENT_ID');
    if (!plaidSecret) missingVars.push('PLAID_SECRET');
    if (!supabaseUrl) missingVars.push('SUPABASE_URL');
    if (!supabaseAnonKey) missingVars.push('SUPABASE_ANON_KEY');

    console.error('Missing required environment variables', { missingVars });
    return new Response(JSON.stringify({ 
      error: 'Server configuration error', 
      simple_explanation: 'The server is not fully configured.',
      what_to_do: 'Ask the developer to set the missing environment variables in the Supabase Edge Function settings.',
      missing_env_vars: missingVars,
      location: 'supabase/functions/create-link-token/index.ts:18-23'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: 'Missing Authorization header',
        simple_explanation: 'The browser did not send your login token to the server.',
        what_to_do: 'Make sure you are logged in, then try again. If this keeps happening, the frontend is not including the Authorization header.',
        location: 'supabase/functions/create-link-token/index.ts:35-38',
        debug: {
          received_headers: Array.from(req.headers.keys()),
        }
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('AUTH_ERROR_GET_USER', { authError, hasUser: !!user });
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        simple_explanation: 'Your login token was rejected by Supabase.',
        what_to_do: 'Log out and log back in. If this still fails, the Supabase URL or anon key inside the Edge Function may not match the live project.',
        location: 'supabase/functions/create-link-token/index.ts:46-52',
        debug: {
          auth_error: authError,
          has_user: !!user,
          supabase_url_env: supabaseUrl,
        }
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const plaidResponse = await fetch('https://production.plaid.com/link/token/create', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': plaidClientId,
        'PLAID-SECRET': plaidSecret,
      },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        user: { client_user_id: user.id },
        client_name: 'Money Buddy',
        products: ['auth'],
        country_codes: ['US'],
        language: 'en',
      }),
    });

    const plaidData = await plaidResponse.json();

    if (!plaidResponse.ok) {
      console.error("PLAID ERROR DETAILS:", JSON.stringify(plaidData));
      return new Response(JSON.stringify({ 
        error: 'Plaid API error',
        simple_explanation: 'Plaid rejected the request to create a link token.',
        what_to_do: 'Check that PLAID_CLIENT_ID and PLAID_SECRET are correct for the environment and that the Plaid dashboard is configured for this domain.',
        location: 'supabase/functions/create-link-token/index.ts:55-71',
        plaid_error_message: plaidData.error_message,
        plaid_error_code: plaidData.error_code,
        plaid_error_type: plaidData.error_type,
      }), {
        status: plaidResponse.status || 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ link_token: plaidData.link_token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return new Response(JSON.stringify({ 
      error: 'Unexpected server error',
      simple_explanation: 'The server crashed while trying to create the Plaid link token.',
      what_to_do: 'Check the Supabase Edge Function logs for the full stack trace.',
      location: 'supabase/functions/create-link-token/index.ts:34-92',
      debug_message: (err as Error).message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
