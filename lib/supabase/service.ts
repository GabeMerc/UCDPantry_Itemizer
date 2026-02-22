import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client using the service role key.
 * Bypasses RLS — use only in server-side admin API routes.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
