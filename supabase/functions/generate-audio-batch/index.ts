// supabase/functions/generate-audio-batch/index.ts

// Note: Deno-specific and URL imports will show errors in a standard TS environment.
// These are resolved by the Deno runtime and can be ignored.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log('`generate-audio-batch` function initializing...');

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
if (!elevenLabsApiKey) {
  console.warn('Missing ELEVENLABS_API_KEY. TTS functionality will be disabled.');
}

// Function to process a single chapter
async function processChapter(chapter: any, voice_id: string, supabaseClient: SupabaseClient) {
  const { id: chapter_id, text_content, ebook_id } = chapter;
  console.log(`Processing chapter_id: ${chapter_id}`);

  try {
    // 1. Call ElevenLabs API
    if (!elevenLabsApiKey) {
      throw new Error('TTS service is not configured (missing API key).');
    }
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`;
    const elevenLabsResponse = await fetch(elevenLabsUrl, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey,
      },
      body: JSON.stringify({
        text: text_content,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!elevenLabsResponse.ok) {
      const errorBody = await elevenLabsResponse.text();
      throw new Error(`ElevenLabs API error: ${elevenLabsResponse.status} ${errorBody}`);
    }

    const audioArrayBuffer = await elevenLabsResponse.arrayBuffer();

    // 2. Upload audio to storage
    const audioFileName = `ebooks/${ebook_id}/chapters/${chapter_id}_${Date.now()}.mp3`;
    const { data: storageData, error: storageError } = await supabaseClient.storage
      .from('audiobook-outputs')
      .upload(audioFileName, audioArrayBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      });

    if (storageError) throw storageError;
    if (!storageData) throw new Error('No data returned from storage upload.');

    // 3. Get public URL and update chapter record
    const { data: publicUrlData } = supabaseClient.storage
      .from('audiobook-outputs')
      .getPublicUrl(storageData.path);
      
    const audioUrl = publicUrlData.publicUrl || storageData.path;

    const { error: updateError } = await supabaseClient
      .from('chapters')
      .update({
        audio_url: audioUrl,
        status: 'audio_generated',
      })
      .eq('id', chapter_id);

    if (updateError) throw updateError;

    console.log(`Successfully processed chapter_id: ${chapter_id}`);
    return { chapter_id, status: 'success', audio_url: audioUrl };
  } catch (error) {
    console.error(`Failed to process chapter ${chapter_id}:`, error.message);
    // Update chapter status to 'failed'
    await supabaseClient
      .from('chapters')
      .update({ status: 'failed' })
      .eq('id', chapter_id);
    return { chapter_id, status: 'failed', error: error.message };
  }
}


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabaseClient: SupabaseClient;
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not set.');
    }
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to initialize Supabase client.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  try {
    const body = await req.json();
    const { ebook_id, voice_id } = body;

    if (!ebook_id || !voice_id) {
      return new Response(JSON.stringify({ error: 'Missing ebook_id or voice_id in request body.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 1. Fetch all chapters for the ebook that need processing
    const { data: chapters, error: fetchError } = await supabaseClient
      .from('chapters')
      .select('id, text_content, ebook_id')
      .eq('ebook_id', ebook_id)
      .in('status', ['pending', 'failed']); // Re-process failed chapters too

    if (fetchError) throw fetchError;

    if (!chapters || chapters.length === 0) {
      return new Response(JSON.stringify({ message: 'No chapters found for this ebook that require processing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    // 2. Process all chapters in parallel
    console.log(`Starting batch processing for ${chapters.length} chapters from ebook_id: ${ebook_id}`);
    const processingPromises = chapters.map(chapter => processChapter(chapter, voice_id, supabaseClient));
    const results = await Promise.all(processingPromises);

    const successfulChapters = results.filter(r => r.status === 'success');
    const failedChapters = results.filter(r => r.status === 'failed');

    console.log(`Batch processing complete. Success: ${successfulChapters.length}, Failed: ${failedChapters.length}`);

    // 3. Update parent ebook status
    // If all chapters are done (none are pending/failed), mark ebook as complete.
    const { count: remainingCount } = await supabaseClient
      .from('chapters')
      .select('*', { count: 'exact', head: true })
      .eq('ebook_id', ebook_id)
      .in('status', ['pending', 'failed']);

    if (remainingCount === 0) {
      await supabaseClient
        .from('ebooks')
        .update({ status: 'complete' })
        .eq('id', ebook_id);
      console.log(`Ebook ${ebook_id} marked as complete.`);
    } else {
       await supabaseClient
        .from('ebooks')
        .update({ status: 'processing' }) // Or 'partial'
        .eq('id', ebook_id);
      console.log(`Ebook ${ebook_id} has ${remainingCount} chapters remaining.`);
    }

    return new Response(JSON.stringify({
      message: 'Batch processing finished.',
      successful_count: successfulChapters.length,
      failed_count: failedChapters.length,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('An unexpected error occurred in the main handler:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
