/// <reference types="https://deno.land/x/deno/cli/types/deno.d.ts" />

// supabase/functions/generate-audio-from-text/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
// NOTE: You can find your voice IDs here: https://elevenlabs.io/voice-library
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Default: Rachel

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req.headers.get('Origin')) });
  }

  let chapter_id;

  try {
    const body = await req.json();
    chapter_id = body.chapter_id;
    const voice_id = body.voice_id || DEFAULT_VOICE_ID;

    if (!chapter_id) {
      throw new Error('Missing chapter_id in request body');
    }

    // Create a Supabase client with the user's auth context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    console.log(`Processing chapter ${chapter_id} with voice ${voice_id}`);

    // Diagnostic log to check the user context
    const { data: { user } } = await supabaseClient.auth.getUser();
    console.log(`Function is running as user: ${user?.id ?? 'not authenticated'}`);

    // 1. Fetch chapter content
    const { data: chapterData, error: chapterError } = await supabaseClient
      .from('chapters')
      .select('text_content, ebook_id')
      .eq('id', chapter_id)
      .single();

    if (chapterError) throw new Error(`DB error fetching chapter: ${chapterError.message}`);
    if (!chapterData) throw new Error('Chapter not found');

    const { text_content, ebook_id } = chapterData;

    // 2. Generate audio
    const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text: text_content,
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.5 },
      }),
    });

    if (!elevenLabsResponse.ok) {
      const errorBody = await elevenLabsResponse.text();
      throw new Error(`ElevenLabs API failed: ${errorBody}`);
    }

    const audioBlob = await elevenLabsResponse.blob();

    // 3. Upload audio to Storage
    const storagePath = `ebooks/${ebook_id}/chapters/${chapter_id}.mp3`;
    const { error: uploadError } = await supabaseClient.storage
      .from('audiobook-files')
      .upload(storagePath, audioBlob, { contentType: 'audio/mpeg', upsert: true });

    if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`);

    // 4. Get public URL and update the database
    const { data: urlData } = supabaseClient.storage.from('audiobook-files').getPublicUrl(storagePath);

    // Update the chapter record with the audio URL and set status to 'complete'
    let audio_url: string | null = null;
    if (urlData.publicUrl) {
      audio_url = urlData.publicUrl;
      const adminSupabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { error: updateError } = await adminSupabaseClient
        .from('chapters')
        .update({ 
          audio_url: urlData.publicUrl,
          status: 'complete'
        })
        .eq('id', chapter_id);

      if (updateError) {
        console.error(`Failed to update chapter ${chapter_id}:`, updateError);
        // Even if DB update fails, we don't want to fail the whole process
        // The audio is generated, and a retry mechanism could fix the DB state.
      }
    }

    console.log(`Successfully processed chapter ${chapter_id}`);
    return new Response(JSON.stringify({ success: true, audio_url }), {
      headers: { ...getCorsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(`Error processing chapter ${chapter_id}:`, error.message);

    // Attempt to update the chapter status to 'error_tts' to stop polling
    if (chapter_id) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
      );
      await supabaseClient
        .from('chapters')
        .update({ status: 'error_tts', error_message: error.message })
        .eq('id', chapter_id);
    }

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...getCorsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
