const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';

export const supabaseUrl = configuredUrl.replace(/\/+$/, '');
export const projectId = supabaseUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/i)?.[1] ?? '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
export const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || supabaseAnonKey;
