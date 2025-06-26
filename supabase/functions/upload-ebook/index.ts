// supabase/functions/upload-ebook/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { parseEpub } from 'npm:@gxl/epub-parser';
import { Buffer } from "https://deno.land/std@0.140.0/node/buffer.ts";

// Utility function to strip HTML tags
function stripHtml(html: string): string {
  // A simple regex to remove HTML tags.
  // For more complex HTML, a more robust library might be needed.
  return html.replace(/<[^>]*>?/gm, '');
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') || '';

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  try {
    console.log('Function received a request.');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    console.log('Supabase client created.');

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('File not found in form data. Make sure the key is "file".');
    }

    const file_name = file.name;
    console.log(`Received file: ${file_name}`);

    // 1. Insert into the ebooks table first to get an ID
    console.log('Attempting to insert into ebooks table...');
    const { data: ebookData, error: ebookError } = await supabaseClient
      .from('ebooks')
      .insert({ file_name: file_name, title: file_name, status: 'processing' }) // Set status to 'processing'
      .select()
      .single();

    if (ebookError) {
      console.error('Error inserting into ebooks table:', ebookError);
      throw ebookError;
    }
    console.log(`Successfully inserted ebook with ID: ${ebookData.id}`);
    const ebook_id = ebookData.id;

    // 2. Parse the EPUB file
    console.log('Parsing EPUB file...');
    const fileBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);
    const parsedEpub = await parseEpub(buffer);
    console.log('EPUB file parsed successfully.');

    if (!parsedEpub.sections || parsedEpub.sections.length === 0) {
        // If parsing fails or there are no sections, update ebook status to 'failed'
        await supabaseClient.from('ebooks').update({ status: 'failed', status_message: 'No chapters found in EPUB file.' }).eq('id', ebook_id);
        throw new Error('No chapters found in the EPUB file.');
    }

    // 3. Prepare chapter records for insertion
    const chapterRecords = parsedEpub.sections.map((section, index) => {
      const text_content = stripHtml(section.raw || '');
      return {
        ebook_id: ebook_id,
        chapter_number: index + 1,
        // Use the title from the EPUB if available, otherwise generate one
        title: section.title || `Chapter ${index + 1}`,
        text_content: text_content,
        status: 'pending',
      };
    });
    console.log(`Found ${chapterRecords.length} chapters.`);

    // 4. Insert chapters into the chapters table
    console.log('Attempting to insert into chapters table...');
    const { data: insertedChapters, error: chaptersError } = await supabaseClient
      .from('chapters')
      .insert(chapterRecords)
      .select();

    if (chaptersError) {
      console.error('Error inserting into chapters table:', chaptersError);
      // Rollback or update ebook status to 'failed'
      await supabaseClient.from('ebooks').update({ status: 'failed', status_message: chaptersError.message }).eq('id', ebook_id);
      throw chaptersError;
    }
    console.log('Successfully inserted chapters.');

    // 5. Update ebook status to 'processed'
    await supabaseClient.from('ebooks').update({ status: 'processed' }).eq('id', ebook_id);
    console.log(`Ebook ID ${ebook_id} status updated to processed.`);


    return new Response(
      JSON.stringify({
        message: 'Ebook uploaded and processed successfully',
        ebook: ebookData,
        chapters: insertedChapters,
      }),
      {
        headers: { 
          ...corsHeaders(origin),
          'Content-Type': 'application/json' 
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('An error occurred in the upload-ebook function:', error);
    // Note: The ebook status might need to be updated to 'failed' here as well,
    // depending on where the error occurred.
    return new Response(JSON.stringify({ 
      error: 'An internal error occurred.',
      message: error.message,
      stack: error.stack,
    }), {
      headers: { 
        ...corsHeaders(origin),
        'Content-Type': 'application/json' 
      },
      status: 500,
    });
  }
});
