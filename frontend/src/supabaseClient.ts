import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Enhanced error logging
console.log('Initializing Supabase client with URL:', 
  supabaseUrl ? supabaseUrl.substring(0, 8) + '...' : 'undefined');

if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL is not defined. Please check your .env.local file.");
}

if (!supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_ANON_KEY is not defined. Please check your .env.local file.");
}

// Create Supabase client with additional options for debugging
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
