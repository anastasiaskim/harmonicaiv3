const allowedOrigins = [
  'https://harmonicaiv3-h5n2vq1dn-anastasiastkim.vercel.app',
  'https://harmonicaiv3-5ujpn1o4a-anastasiastkim.vercel.app',
  'https://harmonicaiv3-l1bpxp9zl-anastasiastkim.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

export const getCorsHeaders = (requestOrigin: string | null) => {
  const headers = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Origin': allowedOrigins[0] // Default origin
  };

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
  }

  return headers;
};
