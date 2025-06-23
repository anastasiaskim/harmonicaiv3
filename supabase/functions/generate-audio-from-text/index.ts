// supabase/functions/generate-audio-from-text/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log('`generate-audio-from-text` function initializing...');

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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabaseClient: SupabaseClient;
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not set for client initialization.');
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
    const body = await req.json();
    const { chapter_id, ebook_id, voice_id } = body;

    if (!chapter_id && !ebook_id) {
      return new Response(JSON.stringify({ error: 'Missing chapter_id or ebook_id in request body.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    if (chapter_id && ebook_id) {
      return new Response(JSON.stringify({ error: 'Provide either chapter_id or ebook_id, not both.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    if (!voice_id) {
      return new Response(JSON.stringify({ error: 'Missing chapter_id in request body.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    if (!voice_id) {
      return new Response(JSON.stringify({ error: 'Missing voice_id in request body.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    if (!elevenLabsApiKey) {
      return new Response(JSON.stringify({ error: 'TTS service is not configured (missing API key).' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 503, // Service Unavailable
      });
    }

    // 1. Determine target chapters
    let targetChapters: { id: string; text_content: string; ebook_id: string; status: string }[] = [];
    let currentEbookIdForBatch: string | null = null;

    if (chapter_id) {
      console.log(`Fetching text for single chapter_id: ${chapter_id}`);
      const { data: chapterData, error: chapterError } = await supabaseClient
        .from('chapters')
        .select('id, text_content, ebook_id, status')
        .eq('id', chapter_id)
        .single();

      if (chapterError) {
        console.error('Error fetching chapter:', chapterError.message);
        throw new Error(`Failed to fetch chapter: ${chapterError.message}`);
      }
      if (!chapterData) {
        return new Response(JSON.stringify({ error: `Chapter not found for chapter_id: ${chapter_id}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }
      if (chapterData.status !== 'pending_tts' && chapterData.status !== 'error_tts') { // Allow re-processing of errors
        return new Response(JSON.stringify({ error: `Chapter ${chapter_id} is not pending_tts (status: ${chapterData.status}).` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409, // Conflict
        });
      }
      if (!chapterData.text_content) {
         // Update status to error_tts if no text_content
        await supabaseClient.from('chapters').update({ status: 'error_tts', audio_url: null }).eq('id', chapter_id);
        return new Response(JSON.stringify({ error: `No text content for chapter_id: ${chapter_id}. Status set to error_tts.` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
        });
      }
      targetChapters.push(chapterData);
      currentEbookIdForBatch = chapterData.ebook_id;
    } else if (ebook_id) {
      currentEbookIdForBatch = ebook_id;
      console.log(`Fetching chapters for ebook_id: ${ebook_id} with status 'pending_tts' or 'error_tts'`);
      const { data: chaptersData, error: chaptersError } = await supabaseClient
        .from('chapters')
        .select('id, text_content, ebook_id, status')
        .eq('ebook_id', ebook_id)
        .in('status', ['pending_tts', 'error_tts']); // Process pending or errored chapters

      if (chaptersError) {
        console.error('Error fetching chapters for ebook:', chaptersError.message);
        throw new Error(`Failed to fetch chapters for ebook: ${chaptersError.message}`);
      }
      if (!chaptersData || chaptersData.length === 0) {
        return new Response(JSON.stringify({ error: `No pending or errored chapters found for ebook_id: ${ebook_id}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }
      targetChapters = chaptersData.filter(ch => ch.text_content); // Only process chapters with text
      // Handle chapters without text_content by setting them to error_tts
      const chaptersWithoutText = chaptersData.filter(ch => !ch.text_content);
      for (const ch of chaptersWithoutText) {
        await supabaseClient.from('chapters').update({ status: 'error_tts', audio_url: null }).eq('id', ch.id);
        console.warn(`Chapter ${ch.id} has no text_content, setting status to error_tts.`);
      }
      if (targetChapters.length === 0 && chaptersWithoutText.length > 0) {
         return new Response(JSON.stringify({ error: `All pending chapters for ebook_id: ${ebook_id} had no text_content. Statuses set to error_tts.` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }
    }

    const results: Array<Record<string, any>> = [];
    let allSuccessfulInBatch = true;

    for (const currentChapter of targetChapters) {
      const currentChapterId = currentChapter.id;
      const chapterText = currentChapter.text_content;
      const chapterEbookId = currentChapter.ebook_id; // ebook_id from the chapter record itself

      try {
        console.log(`Processing chapter_id: ${currentChapterId}`);
        // Update chapter status to 'processing_tts'
        await supabaseClient.from('chapters').update({ status: 'processing_tts' }).eq('id', currentChapterId).select();

    // 2. Call ElevenLabs API with text (chapterText) and voice_id
    console.log(`Calling ElevenLabs API for chapter_id: ${currentChapterId} with voice_id: ${voice_id}`);
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`;
    
    const elevenLabsResponse = await fetch(elevenLabsUrl, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey! // Non-null assertion as we checked it earlier
      },
      body: JSON.stringify({
        text: chapterText,
        model_id: 'eleven_multilingual_v2', // Or another model you prefer
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!elevenLabsResponse.ok) {
      const errorBody = await elevenLabsResponse.text();
      console.error(`ElevenLabs API error: ${elevenLabsResponse.status} ${elevenLabsResponse.statusText}`, errorBody);
      throw new Error(`ElevenLabs API request failed: ${elevenLabsResponse.status} ${errorBody}`);
    }

    const audioArrayBuffer = await elevenLabsResponse.arrayBuffer();
    console.log(`Successfully received audio from ElevenLabs for chapter_id: ${currentChapterId}. Audio size: ${audioArrayBuffer.byteLength} bytes`);

    // 3. Upload generated audio (audioArrayBuffer) to 'audiobook-outputs' storage
    const audioFileName = `ebooks/${chapterEbookId}/chapters/${currentChapterId}_${Date.now()}.mp3`;
    console.log(`Uploading audio to Supabase Storage at: ${audioFileName}`);

    const { data: storageData, error: storageError } = await supabaseClient.storage
      .from('audiobook-outputs')
      .upload(audioFileName, audioArrayBuffer, {
        contentType: 'audio/mpeg',
        upsert: false, // Don't upsert, generate new file if name collides (though unlikely with timestamp)
      });

    if (storageError) {
      console.error('Error uploading audio to Supabase Storage:', storageError.message);
      throw new Error(`Failed to upload audio: ${storageError.message}`);
    }
    if (!storageData) {
        throw new Error('No data returned from storage upload.');
    }
    
    console.log(`Successfully uploaded audio. Path: ${storageData.path}`);

    // 4. Update 'chapters' table with audio_url and status
    const { data: publicUrlData } = supabaseClient
      .storage
      .from('audiobook-outputs')
      .getPublicUrl(storageData.path);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.warn(`Could not get public URL for ${storageData.path}. Will store path instead.`);
      // Fallback or decide how to handle if public URL isn't immediately available or bucket isn't public
    }
    const audioUrl = publicUrlData.publicUrl || storageData.path; // Prefer public URL

    const { error: updateError } = await supabaseClient
      .from('chapters')
      .update({
        audio_url: audioUrl,
        status: 'complete',
        // updated_at: new Date().toISOString(), // Optional: if you have an updated_at column
      })
      .eq('id', currentChapterId)
      .select();

    if (updateError) {
      console.error('Error updating chapter record:', updateError.message);
      // Potentially try to delete the uploaded audio if the DB update fails to avoid orphaned files?
      // For now, just log and throw.
      throw new Error(`Failed to update chapter record: ${updateError.message}`);
    }

    console.log(`Successfully updated chapter ${currentChapterId} with audio URL and status.`);
        results.push({ chapter_id: currentChapterId, status: 'complete', audio_url: audioUrl.replace('http://kong:8000', 'http://localhost:54321') });

          } catch (loopError) {
        allSuccessfulInBatch = false;
        console.error(`Error processing chapter ${currentChapterId}:`, loopError.message);
        results.push({ chapter_id: currentChapterId, status: 'error_tts', error: loopError.message });
        try {
            await supabaseClient.from('chapters').update({ status: 'error_tts', error_message: loopError.message }).eq('id', currentChapterId).select();
        } catch (updateErr) {
            console.error(`Failed to update chapter ${currentChapterId} status to error_tts after loop error:`, updateErr.message);
        }
      }
    } // End of for loop for targetChapters

    // 5. Update the parent ebook's status if processing a batch and all chapters are complete
    if (ebook_id && currentEbookIdForBatch) { // Only for batch mode (ebook_id was an input)
      const { data: allChaptersStatus, error: checkError } = await supabaseClient
        .from('chapters')
        .select('status')
        .eq('ebook_id', currentEbookIdForBatch);

      if (checkError) {
        console.warn(`Warning: Could not verify all chapters status for ebook ${currentEbookIdForBatch}: ${checkError.message}`);
      } else if (allChaptersStatus && allChaptersStatus.every(ch => ch.status === 'complete')) {
        const { error: ebookUpdateError } = await supabaseClient
          .from('ebooks')
          .update({ status: 'audio_generation_complete' })
          .eq('id', currentEbookIdForBatch);
        if (ebookUpdateError) {
          console.warn(`Warning: Failed to update ebook ${currentEbookIdForBatch} to audio_generation_complete: ${ebookUpdateError.message}`);
        }
      } else {
        console.log(`Ebook ${currentEbookIdForBatch} not yet fully complete. Chapters statuses:`, allChaptersStatus?.map(s=>s.status));
        // Optionally set to 'partial_audio' or 'error_audio_generation' if some failed
        const hasErrors = allChaptersStatus?.some(ch => ch.status === 'error_tts');
        const hasPending = allChaptersStatus?.some(ch => ch.status === 'pending_tts' || ch.status === 'processing_tts');
        if (hasErrors && !hasPending) {
            await supabaseClient.from('ebooks').update({ status: 'error_audio_generation' }).eq('id', currentEbookIdForBatch);
        } else if (!hasErrors && !hasPending && !allChaptersStatus?.every(ch => ch.status === 'complete')) {
            // This case implies some chapters might be in an unexpected state or not all were processed.
            // For now, we don't set a specific ebook status here, it remains as is.
        }
      }
    } else if (chapter_id && currentEbookIdForBatch) { // For single chapter, check if this completion makes the ebook complete
        const { data: allChaptersStatus, error: checkError } = await supabaseClient
        .from('chapters')
        .select('status')
        .eq('ebook_id', currentEbookIdForBatch);

      if (checkError) {
        console.warn(`Warning: Could not verify all chapters status for ebook ${currentEbookIdForBatch} after single chapter update: ${checkError.message}`);
      } else if (allChaptersStatus && allChaptersStatus.every(ch => ch.status === 'complete')) {
        const { error: ebookUpdateError } = await supabaseClient
          .from('ebooks')
          .update({ status: 'audio_generation_complete' })
          .eq('id', currentEbookIdForBatch);
        if (ebookUpdateError) {
          console.warn(`Warning: Failed to update ebook ${currentEbookIdForBatch} to audio_generation_complete: ${ebookUpdateError.message}`);
        }
      } else {
         const hasErrors = allChaptersStatus?.some(ch => ch.status === 'error_tts');
         const hasPending = allChaptersStatus?.some(ch => ch.status === 'pending_tts' || ch.status === 'processing_tts');
         if (hasErrors && !hasPending) {
            await supabaseClient.from('ebooks').update({ status: 'error_audio_generation' }).eq('id', currentEbookIdForBatch);
         }
      }
    }
    // For local development, the public URL might be based on 'http://kong:8000',
    // which is not accessible from the host machine's browser. Replace it.
    // In a deployed environment, SUPABASE_PUBLIC_URL should be correctly set.
        let finalMessage = 'Processing complete.';
    if (results.length === 1 && results[0].status === 'complete') {
      finalMessage = 'Audio generated and chapter updated successfully.';
    } else if (results.length > 0) {
      finalMessage = `Batch processing summary: ${results.filter(r => r.status === 'complete').length} succeeded, ${results.filter(r => r.status !== 'complete').length} failed/skipped.`;
    }

    return new Response(JSON.stringify({ 
      message: finalMessage,
      details: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK
    });

  } catch (error) {
    console.error('Error processing generate-audio request:', error.message, error.stack);
    let status = 500;
    if (error.message.includes('JSON')) status = 400; // Bad request if JSON parsing fails

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    });
  }
});
