// Supabase admin client — service role bypasses RLS for server-side storage/DB
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** Alias for supabaseAdmin */
export function createAdminClient() {
  return supabaseAdmin;
}
