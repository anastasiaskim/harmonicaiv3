// supabase/functions/generate-audio-from-text/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
// NOTE: You can find your voice IDs here: https://elevenlabs.io/voice-library
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Default: Rachel

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { chapter_id } = await req.json();

    if (!chapter_id) {
      throw new Error('Missing chapter_id in request body');
    }

    // Create a Supabase client with the user's authorization
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 1. Fetch chapter content from the database
    const { data: chapterData, error: chapterError } = await supabaseClient
      .from('chapters')
      .select('text_content, ebook_id')
      .eq('id', chapter_id)
      .single();

    if (chapterError) throw chapterError;
    if (!chapterData) throw new Error('Chapter not found');

    const { text_content, ebook_id } = chapterData;

    // 2. Generate audio using ElevenLabs API
    const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text: text_content,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (!elevenLabsResponse.ok) {
      const errorBody = await elevenLabsResponse.text();
      throw new Error(`ElevenLabs API failed: ${errorBody}`);
    }

    const audioBlob = await elevenLabsResponse.blob();

    // 3. Upload audio to Supabase Storage
    const storagePath = `ebooks/${ebook_id}/chapters/${chapter_id}.mp3`;
    const { error: uploadError } = await supabaseClient.storage
      .from('audiobook_files')
      .upload(storagePath, audioBlob, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 4. Get public URL and update the chapters table
    const { data: urlData } = supabaseClient.storage
      .from('audiobook_files')
      .getPublicUrl(storagePath);

    const audio_url = urlData.publicUrl;

    const { error: updateError } = await supabaseClient
      .from('chapters')
      .update({ audio_url, status: 'completed' })
      .eq('id', chapter_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, audio_url }), {
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
