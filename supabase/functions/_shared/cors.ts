// supabase/functions/_shared/cors.ts

// List of allowed origins
const allowedOrigins = [
  'http://localhost:3000',  // Local development
  'https://harmonicaiv3.vercel.app',  // Production Vercel domain
  'https://ymqniyhlhheafnpttgqq.supabase.co'  // Supabase domain
];

export const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
});
