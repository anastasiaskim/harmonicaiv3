// supabase/functions/upload-ebook/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Basic text splitting function (you can replace this with a more sophisticated one)
function splitIntoChapters(text: string): string[] {
  const chapterMarkers = ["Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4", "Chapter 5", "Chapter 6", "Chapter 7", "Chapter 8", "Chapter 9", "Chapter 10"]; // Add more as needed
  let content = text;
  const chapters: string[] = [];

  // A simple split, assuming chapters are clearly delineated.
  // This is a placeholder for a more robust chapter detection logic.
  const parts = content.split(/\n\nChapter \d+/i).filter(p => p.trim() !== '');
  
  if (parts.length > 1) {
    return parts.map(p => p.trim());
  } else {
    // If no chapters are found, treat the whole book as a single chapter.
    return [text];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Function received a request.');
    const { text_content, file_name } = await req.json();
    console.log(`Received file: ${file_name}`);

    if (!text_content || !file_name) {
      throw new Error('Missing text_content or file_name in request body');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    console.log('Supabase client created.');

    // 1. Insert into the ebooks table
    console.log('Attempting to insert into ebooks table...');
    const { data: ebookData, error: ebookError } = await supabaseClient
      .from('ebooks')
      .insert({ file_name: file_name, title: file_name })
      .select('id')
      .single();

    if (ebookError) {
      console.error('Error inserting into ebooks table:', ebookError);
      throw ebookError;
    }
    console.log(`Successfully inserted ebook with ID: ${ebookData.id}`);

    const ebook_id = ebookData.id;

    // 2. Split text into chapters
    console.log('Splitting text into chapters...');
    const chapters = splitIntoChapters(text_content);
    console.log(`Found ${chapters.length} chapters.`);

    // 3. Insert chapters into the chapters table
    const chapterRecords = chapters.map((content, index) => ({
      ebook_id: ebook_id,
      chapter_number: index + 1,
      text_content: content,
      status: 'pending',
    }));

    console.log('Attempting to insert into chapters table...');
    const { error: chaptersError } = await supabaseClient
      .from('chapters')
      .insert(chapterRecords);

    if (chaptersError) {
      console.error('Error inserting into chapters table:', chaptersError);
      throw chaptersError;
    }
    console.log('Successfully inserted chapters.');

    return new Response(JSON.stringify({ success: true, ebook_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('An error occurred in the upload-ebook function:', error);
    return new Response(JSON.stringify({ 
      error: 'An internal error occurred.',
      message: error.message,
      stack: error.stack,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
