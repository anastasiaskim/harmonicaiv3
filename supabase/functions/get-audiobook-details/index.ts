// supabase/functions/get-audiobook-details/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log('`get-audiobook-details` function initializing...');

serve(async (req: Request) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabaseClient: SupabaseClient;
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for client initialization.');
      throw new Error('Supabase environment variables not set.');
    }
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  } catch (e) {
    console.error('Failed to initialize Supabase client:', e.message);
    return new Response(JSON.stringify({ error: 'Failed to initialize Supabase client.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  try {
    const url = new URL(req.url);
    const ebookId = url.searchParams.get('ebook_id');

    if (!ebookId) {
      return new Response(JSON.stringify({ error: 'Missing ebook_id query parameter' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 1. Fetch ebook details
    console.log(`Fetching details for ebook_id: ${ebookId}`);
    const { data: ebookData, error: ebookError } = await supabaseClient
      .from('ebooks')
      .select('*') // Select all columns or specific ones as needed: id, file_name, original_file_type, status, created_at, extracted_text_preview
      .eq('id', ebookId)
      .single();

    if (ebookError) {
      console.error(`Error fetching ebook ${ebookId}:`, ebookError.message);
      throw ebookError; // Let global error handler catch it
    }
    if (!ebookData) {
      return new Response(JSON.stringify({ error: 'Ebook not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // 2. Fetch associated chapter details
    console.log(`Fetching chapters for ebook_id: ${ebookId}`);
    const { data: chaptersData, error: chaptersError } = await supabaseClient
      .from('chapters')
      .select('id, chapter_number, title, status, audio_url, text_content') // Consider if text_content is always needed here
      .eq('ebook_id', ebookId)
      .order('chapter_number', { ascending: true });

    if (chaptersError) {
      console.error(`Error fetching chapters for ebook ${ebookId}:`, chaptersError.message);
      throw chaptersError; // Let global error handler catch it
    }

    console.log(`Successfully fetched details for ebook ${ebookId} with ${chaptersData?.length || 0} chapters.`);
    return new Response(JSON.stringify({ ebook: ebookData, chapters: chaptersData || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in get-audiobook-details:', error.message);
    // Check if the error is a PostgrestError for more specific status codes
    if (error.name === 'PostgrestError') {
        return new Response(JSON.stringify({ error: error.message, details: error.details }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: parseInt(error.code, 10) || 500, // Use Postgrest error code if available
        });
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
