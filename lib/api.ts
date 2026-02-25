import { supabase } from '../supabaseClient';

/**
 * Call a Supabase Edge Function with the current user's auth token.
 * Returns the parsed JSON response or throws on error.
 */
export async function callEdgeFunction<T = unknown>(
  functionName: string,
  body: Record<string, unknown>
): Promise<T> {
  console.log("[v0] Calling edge function:", functionName, body);
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  console.log("[v0] Edge function response:", functionName, "data:", data, "error:", error);

  if (error) {
    throw new Error(error.message || `Edge function "${functionName}" failed`);
  }

  return data as T;
}
