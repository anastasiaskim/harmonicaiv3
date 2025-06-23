// Note: Deno-specific and URL imports will show errors in a standard TS environment.
// These are resolved by the Deno runtime and can be ignored.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import parseEpub from 'https://esm.sh/epub-parse';
import pdf from 'https://esm.sh/pdf-extraction';

console.log('`upload-ebook` function initializing...');

// Helper function to strip HTML tags
const stripHtml = (html: string) => html.replace(/<[^>]*>?/gm, '');

// Helper function to split text into chapters
const splitTextIntoChapters = (text: string): { title: string; text_content: string }[] => {
  const chapters: { title: string; text_content: string }[] = [];
  // Regex to find chapter headings like "Chapter 1", "CHAPTER X", "Part I", etc.
  const chapterRegex = /^(Chapter|CHAPTER|Part|PART)\s+[\dIVXLC]+\s*.*$/m;
  const rawChapters = text.split(chapterRegex);

  if (rawChapters.length <= 1) {
    // No chapters found, treat as a single chapter
    return [{ title: 'Chapter 1', text_content: text.trim() }];
  }

  // The split results in an array where titles and contents alternate
  for (let i = 1; i < rawChapters.length; i += 2) {
    const title = rawChapters[i].trim();
    const content = (rawChapters[i + 1] || '').trim();
    if (content) {
      chapters.push({ title: title, text_content: content });
    }
  }

  return chapters;
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
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
    console.error('Failed to initialize Supabase client:', e.message);
    return new Response(JSON.stringify({ error: 'Failed to initialize Supabase client.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  try {
    let chaptersToInsert: { title: string; text_content: string }[] = [];
    let fileName: string | undefined;
    let fileContent: ArrayBuffer | undefined;
    let fileType: 'txt' | 'epub' | 'pdf' | 'json' = 'json';
    let fullTextForPreview = '';

    const contentType = req.headers.get('Content-Type');

    if (contentType?.includes('application/json')) {
      const body = await req.json();
      const inputText = body.inputText;
      if (!inputText || typeof inputText !== 'string' || inputText.trim() === '') {
        throw new Error('Invalid or empty inputText provided in JSON body.');
      }
      fileName = `pasted-text-${Date.now()}.txt`;
      fileType = 'txt';
      chaptersToInsert = splitTextIntoChapters(inputText);
      fullTextForPreview = inputText;
    } else if (contentType?.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) throw new Error('No file found in FormData.');

      fileName = file.name;
      fileContent = await file.arrayBuffer();

      if (file.type === 'application/epub+zip' || fileName.endsWith('.epub')) {
        fileType = 'epub';
        const parsedEpub = await parseEpub(fileContent);
        fullTextForPreview = parsedEpub.sections.map(s => stripHtml(s.html)).join(' ').substring(0, 1000);
        chaptersToInsert = parsedEpub.sections.map(section => ({
          title: section.id || 'Untitled Chapter',
          text_content: stripHtml(section.html).trim(),
        }));
      } else if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
        fileType = 'pdf';
        const data = await pdf(fileContent);
        fullTextForPreview = data.text;
        chaptersToInsert = splitTextIntoChapters(data.text);
      } else if (file.type === 'text/plain' || fileName.endsWith('.txt')) {
        fileType = 'txt';
        const textContent = await file.text();
        fullTextForPreview = textContent;
        chaptersToInsert = splitTextIntoChapters(textContent);
      } else {
        throw new Error('Unsupported file type. Please upload .txt, .epub, or .pdf files.');
      }
    } else {
      throw new Error('Unsupported Content-Type.');
    }

    if (chaptersToInsert.length === 0) {
      throw new Error('Could not extract any chapters from the document.');
    }

    const { data: ebookData, error: ebookError } = await supabaseClient
      .from('ebooks')
      .insert({
        file_name: fileName,
        original_file_type: fileType,
        status: 'pending_tts_batch',
        extracted_text_preview: fullTextForPreview.substring(0, 1000),
      })
      .select()
      .single();

    if (ebookError) throw ebookError;
    if (!ebookData) throw new Error('Failed to create ebook record.');

    const ebookId = ebookData.id;

    if (fileContent) {
      const { error: storageError } = await supabaseClient.storage
        .from('ebook-uploads')
        .upload(`ebooks/${ebookId}/original.${fileType}`, fileContent, { upsert: true });
      if (storageError) {
        console.warn(`Warning: Failed to store original file for ebook ${ebookId}: ${storageError.message}`);
      }
    }

    const chapterRecords = chaptersToInsert.map((chapter, index) => ({
      ebook_id: ebookId,
      chapter_number: index + 1,
      title: chapter.title,
      text_content: chapter.text_content,
      status: 'pending_tts', // Ensure status is explicitly set for the audio generation queue
    }));

    const { data: chaptersData, error: chaptersError } = await supabaseClient
      .from('chapters')
      .insert(chapterRecords)
      .select();

    if (chaptersError) throw chaptersError;
    if (!chaptersData) throw new Error('Failed to create chapter records.');

    return new Response(JSON.stringify({ 
      message: 'Ebook uploaded and processed successfully.',
      ebook: ebookData,
      chapters: chaptersData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing request:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message.includes('Invalid') || error.message.includes('Unsupported') ? 400 : 500,
    });
  }
});

/* 
To deploy:
1. Ensure you have the Supabase CLI installed and are logged in.
2. Navigate to the root of your Supabase project in the terminal.
3. Run: supabase functions deploy upload-ebook --project-ref YOUR_PROJECT_REF

To serve locally (for testing):
1. Navigate to the root of your Supabase project.
2. Run: supabase functions serve --no-verify-jwt

Then you can send requests to http://localhost:54321/functions/v1/upload-ebook
*/
