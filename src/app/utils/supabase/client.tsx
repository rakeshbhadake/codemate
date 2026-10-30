import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { publicAnonKey, supabaseUrl } from './info';

let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient(
      supabaseUrl,
      publicAnonKey
    );
  }
  return supabaseClient;
}
