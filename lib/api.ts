import { supabase } from '../supabaseClient';

/**
 * Call a Supabase Edge Function with the current user's auth token.
 * Returns the parsed JSON response or throws on error.
 */
export async function callEdgeFunction<T = unknown>(
  functionName: string,
  body: Record<string, unknown>
): Promise<T> {
  // Retrieve the current session to get the JWT
  const { data: { session } } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers: {
      // Manually passing the Authorization header ensures the Edge Function 
      // can identify the user and create the Stripe Connect account.
      Authorization: `Bearer ${session?.access_token}`,
    },
  });

  if (error) {
    throw new Error(error.message || `Edge function "${functionName}" failed`);
  }

  return data as T;
}
