// supabase/functions/_shared/cors.ts

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()', // Explicitly set a policy to override the default and remove browser warnings.
};
