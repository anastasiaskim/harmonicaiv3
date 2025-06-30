import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// This is a critical check. If the environment variables are missing,
// the application should not attempt to run. This prevents it from
// running in a misconfigured state, which can lead to hard-to-debug errors.
if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is not defined. Please check your environment variables.');
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is not defined. Please check your environment variables.');
}

// Create and export the Supabase client.
// The auth options are the defaults but are stated here for clarity.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: (...args) => {
      // Check for Edge Function URLs specifically
      const url = args[0]?.toString() || '';
      if (url.includes('/functions/v1/')) {
        console.log(`Making Edge Function request to: ${url}`);
      }
      return fetch(...args);
    }
  }
});
