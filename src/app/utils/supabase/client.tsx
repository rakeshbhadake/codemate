import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { supabasePublishableKey, supabaseUrl } from './info';

let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient(
      supabaseUrl,
      supabasePublishableKey
    );
  }
  return supabaseClient;
}
