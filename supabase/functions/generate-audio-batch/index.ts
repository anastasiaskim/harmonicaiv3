// supabase/functions/generate-audio-batch/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { ebook_id } = await req.json();

    if (!ebook_id) {
      throw new Error('Missing ebook_id in request body');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Find all chapters for the ebook that are pending
    const { data: chapters, error: chaptersError } = await supabaseClient
      .from('chapters')
      .select('id')
      .eq('ebook_id', ebook_id)
      .eq('status', 'pending');

    if (chaptersError) {
      throw chaptersError;
    }

    // Invoke the generate-audio-from-text function for each chapter
    const invocations = chapters.map((chapter) =>
      supabaseClient.functions.invoke('generate-audio-from-text', {
        body: { chapter_id: chapter.id },
      })
    );

    await Promise.all(invocations);

    return new Response(JSON.stringify({ success: true, message: `Triggered audio generation for ${chapters.length} chapters.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
