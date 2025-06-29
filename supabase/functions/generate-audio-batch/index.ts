// supabase/functions/generate-audio-batch/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') || '';

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  let supabaseClient;
  let ebook_id;
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: corsHeaders(origin) });
  }

  try {
    const body = await req.json();
    ebook_id = body.ebook_id;
    const voice_id = body.voice_id;

    if (!ebook_id) {
      throw new Error('Missing ebook_id in request body');
    }

    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 1. Update ebook status to 'generating_audio'
    await supabaseClient
      .from('ebooks')
      .update({ status: 'generating_audio', status_message: 'Starting audio generation...' })
      .eq('id', ebook_id);

    // 2. Find all chapters for the ebook that are pending
    const { data: chapters, error: chaptersError } = await supabaseClient
      .from('chapters')
      .select('id')
      .eq('ebook_id', ebook_id)
      .eq('status', 'pending');

    if (chaptersError) {
      throw chaptersError;
    }

    // 3. Process chapters in controlled batches
    const batchSize = 5; // Process 5 chapters at a time
    let processedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < chapters.length; i += batchSize) {
      const batch = chapters.slice(i, i + batchSize);
      console.log(`Processing batch of ${batch.length} chapters...`);

      for (const chapter of batch) {
        try {
          await supabaseClient.functions.invoke('generate-audio-from-text', {
            body: { chapter_id: chapter.id, voice_id },
            headers: { Authorization: authHeader },
          });
          // Since the invocation is now awaited, we can assume success unless it throws.
          // The downstream function will update its own status.
          processedCount++;
        } catch (error) {
          console.error(`Error invoking function for chapter ${chapter.id}:`, error);
          await supabaseClient
            .from('chapters')
            .update({ status: 'failed', status_message: `Batch processor failed to invoke function: ${error.message}` })
            .eq('id', chapter.id);
          failedCount++;
        }
      }
    }

    // 5. Update final ebook status
    const finalStatus = failedCount > 0 ? 'processed_with_errors' : 'processed';
    const finalMessage = `Audio generation complete. ${processedCount} chapters succeeded, ${failedCount} failed.`;
    await supabaseClient
      .from('ebooks')
      .update({ status: finalStatus, status_message: finalMessage })
      .eq('id', ebook_id);

    return new Response(JSON.stringify({ success: true, message: finalMessage }), {
      headers: { 
        ...corsHeaders(origin),
        'Content-Type': 'application/json' 
      },
      status: 200,
    });
  } catch (error) {
    console.error(`An error occurred in the generate-audio-batch function: ${error.message}`);
    if (supabaseClient && ebook_id) {
      await supabaseClient
        .from('ebooks')
        .update({ status: 'failed', status_message: error.message })
        .eq('id', ebook_id);
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 
        ...corsHeaders(origin),
        'Content-Type': 'application/json' 
      },
      status: 500,
    });
  }
});
