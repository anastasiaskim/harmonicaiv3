// A list of static origins that are always allowed
const staticOrigins = [
  'http://localhost:3000',
  'http://localhost:5173'
];

// A regular expression to match Vercel preview deployments
const vercelPreviewRegex = new RegExp(
  '^https://harmonicaiv3-.*-anastasiastkim\\.vercel\\.app$'
);

export const getCorsHeaders = (requestOrigin: string | null) => {
  const headers = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    // A sensible default for development
    'Access-Control-Allow-Origin': 'http://localhost:5173'
  };

  if (requestOrigin) {
    // Check if the origin is in our static list or matches the Vercel preview pattern
    if (staticOrigins.includes(requestOrigin) || vercelPreviewRegex.test(requestOrigin)) {
      headers['Access-Control-Allow-Origin'] = requestOrigin;
    }
  }

  return headers;
};
