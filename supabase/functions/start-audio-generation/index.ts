// supabase/functions/start-audio-generation/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log('start-audio-generation function initializing');

interface GenerationRequest {
  ebook_id: string;
  voice_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { ebook_id, voice_id }: GenerationRequest = await req.json();

    if (!ebook_id || !voice_id) {
      return new Response(JSON.stringify({ error: 'ebook_id and voice_id are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch all chapters for the ebook that are in 'pending' state.
    const { data: chapters, error: fetchError } = await supabaseAdmin
      .from('chapters')
      .select('id')
      .eq('ebook_id', ebook_id)
      .eq('status', 'pending');

    if (fetchError) {
      console.error('Error fetching chapters:', fetchError);
      throw fetchError;
    }

    if (!chapters || chapters.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending chapters to process.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Update status of chapters to 'processing_tts' to prevent reprocessing
    const chapterIds = chapters.map(c => c.id);
    const { error: updateError } = await supabaseAdmin
      .from('chapters')
      .update({ status: 'processing_tts' })
      .in('id', chapterIds);

    if (updateError) {
      console.error('Error updating chapter statuses:', updateError);
      throw updateError;
    }

    // 3. Asynchronously invoke the 'generate-audio-from-text' function for each chapter.
    const invocationPromises = chapters.map(chapter =>
      supabaseAdmin.functions.invoke('generate-audio-from-text', {
        body: { chapter_id: chapter.id, voice_id },
        noWait: true, // This is crucial for asynchronous execution
      })
    );

    await Promise.all(invocationPromises);

    // 4. Return a 202 Accepted response immediately.
    return new Response(JSON.stringify({ message: `Accepted: Audio generation started for ${chapters.length} chapters.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 202,
    });

  } catch (err) {
    console.error('An unexpected error occurred:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
