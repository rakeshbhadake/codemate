const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';

export const supabaseUrl = configuredUrl.replace(/\/+$/, '');
export const projectId = supabaseUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/i)?.[1] ?? '';
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
