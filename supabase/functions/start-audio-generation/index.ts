import { serve } from 'std/http/server.ts'
import { createClient } from '@supabase/supabase-js'
import { getCorsHeaders } from 'shared/cors.ts'

serve(async (req: Request) => {
  const requestOrigin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { ebook_id } = await req.json()

    if (!ebook_id) {
      return new Response(JSON.stringify({ error: 'ebook_id is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    console.log(`Audio generation process initiated for ebook: ${ebook_id}`)

    return new Response(JSON.stringify({ message: `Audio generation process started for ebook ${ebook_id}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in start-audio-generation function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
