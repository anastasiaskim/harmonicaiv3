// supabase/functions/_shared/cors.ts

/**
 * Determines if the origin is allowed based on domain patterns
 * @param origin The origin to check
 * @returns boolean indicating if the origin is allowed
 */
const isOriginAllowed = (origin: string): boolean => {
  if (!origin) return false;
  
  // List of allowed origins and patterns
  const exactOrigins = [
    'http://localhost:3000',  // Local development
    'https://harmonicaiv3.vercel.app',  // Production Vercel domain
    'https://ymqniyhlhheafnpttgqq.supabase.co'  // Supabase domain
  ];

  // Check for exact match
  if (exactOrigins.includes(origin)) {
    return true;
  }

  // Check for Vercel preview domains
  if (origin.match(/https:\/\/harmonicaiv3-[\w-]+\.vercel\.app/) ||
      origin.endsWith('.vercel.app')) {
    return true;
  }

  return false;
};

/**
 * Generate CORS headers based on the request origin
 */
export const corsHeaders = (origin: string) => {
  // Use the requesting origin if it's allowed, otherwise use a default
  const allowedOrigin = isOriginAllowed(origin) ? origin : '*';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  };
};

