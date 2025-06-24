/**
 * Helper functions for accessing configuration values
 */

// Import environment variables using Vite's import.meta.env
export const getSupabaseConfig = (): { url: string, hasKey: boolean } => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  
  return {
    url: supabaseUrl || '',
    hasKey: !!supabaseAnonKey,
  };
};
