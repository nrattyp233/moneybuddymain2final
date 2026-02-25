import { supabase } from '../supabaseClient';

/**
 * Call a Supabase Edge Function with the current user's auth token.
 * Returns the parsed JSON response or throws on error.
 */
export async function callEdgeFunction<T = unknown>(
  functionName: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (error) {
    throw new Error(error.message || `Edge function "${functionName}" failed`);
  }

  return data as T;
}
