// supabase/functions/upload-ebook/index.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { corsHeaders } from 'shared/cors.ts';
import * as zip from '@zip.js/zip.js';
import { parse } from 'xml';

// Add debug logging
console.log('Upload-ebook function starting...');

// Type definitions
interface EpubSection {
  html: string;
  title: string;
}

interface HandlerDependencies {
  supabaseClient: SupabaseClient;
  parseEpub: (file: File) => Promise<{ sections: EpubSection[] }>;
}

// Utility function to convert HTML to clean text for TTS
function stripHtml(html: string): string {
  if (!html) return '';

  // 1. Decode common HTML entities
  let text = html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // 2. Replace block-level tags with newlines to preserve structure
  text = text.replace(/<p[^>]*>/gi, '\n\n'); // Paragraphs
  text = text.replace(/<br[^>]*>/gi, '\n');   // Line breaks
  text = text.replace(/<h[1-6][^>]*>/gi, '\n\n'); // Headings
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<li[^>]*>/gi, '\n* '); // List items

  // 3. Remove all remaining HTML tags
  text = text.replace(/<[^>]*>?/gm, '');

  // 4. Clean up extra whitespace and newlines
  text = text.replace(/\n\s*\n/g, '\n\n'); // Consolidate multiple newlines
  text = text.trim();

  return text;
}

// The core logic, now testable and separated.
export async function handleUpload(
  req: Request,
  { supabaseClient, parseEpub }: HandlerDependencies
): Promise<Response> {
  const origin = req.headers.get('Origin') || '';
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  let ebook_id: number | null = null;

  try {
    console.log('Function received a request.');
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'File not found in form data. Make sure the key is "file".' }),
        { headers: { ...headers, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const file_name = file.name;
    console.log('File received from form data:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      // @ts-ignore - webkitRelativePath might not exist in all environments
      webkitRelativePath: file.webkitRelativePath,
    });

    // Validate file type
    if (!file_name.toLowerCase().endsWith('.epub')) {
      throw new Error('Invalid file type. Please upload an EPUB file.');
    }

    // Get user from JWT to satisfy RLS
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers });
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return new Response(JSON.stringify({ error: 'Authentication error: Could not get user.' }), { status: 401, headers });
    }
    const user_id = user.id;

    // 1. Insert into the ebooks table first to get an ID
    console.log('Attempting to insert into ebooks table...');
    const { data: ebookData, error: ebookError } = await supabaseClient
      .from('ebooks')
      .insert({ file_name: file_name, title: file_name, status: 'processing', user_id: user_id })
      .select()
      .single();

    if (ebookError) {
      console.error('Error inserting into ebooks table:', ebookError);
      throw ebookError;
    }
    console.log(`Successfully inserted ebook with ID: ${ebookData.id}`);
    ebook_id = ebookData.id;

    try {
      // 2. Parse the EPUB file using the injected dependency
      const { sections } = await parseEpub(file);

      // 3. Process and insert chapters
      const chapters = sections.map((section, index) => ({
        chapter_number: index + 1,
        part_number: 1,
        title: section.title || `Chapter ${index + 1}`,
        text_content: stripHtml(section.html),
        ebook_id: ebook_id,
        status: 'pending',
      }));

      // Filter out empty chapters
      const nonEmptyChapters = chapters.filter(ch => ch.text_content && ch.text_content.trim().length > 0);

      if (nonEmptyChapters.length === 0) {
        throw new Error('Ebook has no text content after parsing.');
      }

      console.log(`Inserting ${nonEmptyChapters.length} non-empty chapters into the database...`);
      const { error: chapterError } = await supabaseClient.from('chapters').insert(nonEmptyChapters);

      if (chapterError) {
        console.error('Error inserting chapters:', chapterError);
        throw chapterError;
      }

      // 4. Update ebook status to 'processed'
      await supabaseClient.from('ebooks').update({ status: 'processed' }).eq('id', ebook_id);

      console.log('Ebook processed successfully.');

      // Return a success response with a simple payload
      return new Response(JSON.stringify({ 
        message: 'Ebook uploaded and processed successfully',
        ebook_id: ebook_id
      }), { headers });

    } catch (processingError: unknown) {
      console.error('An error occurred during EPUB processing:', processingError);
      
      if (ebook_id) {
        const errorMessage = processingError instanceof Error ? processingError.message : 'An unknown error occurred during processing.';
        console.error('Updating ebook status to failed with message:', errorMessage);
        
        await supabaseClient
          .from('ebooks')
          .update({ 
            status: 'failed', 
            status_message: errorMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', ebook_id);
      }
      
      // Re-throw the error to be caught by the outer catch
      throw processingError;
    }
  } catch (error: unknown) {
    console.error('An error occurred in the upload-ebook function:', error);
    
    let errorMessage: string;
    const errorStack = error instanceof Error ? error.stack : undefined;

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
      errorMessage = (error as { message: string }).message;
    } else {
      errorMessage = 'An unknown internal error occurred.';
    }

    // The frontend expects the specific error message in the 'error' property.
    // This change puts the specific message in the 'error' property for clearer feedback.
    return new Response(
      JSON.stringify({ error: errorMessage, stack: errorStack }),
      { headers: { ...headers, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}

// This is the actual implementation of the EPUB parser.
async function parseEpub(file: File): Promise<{ sections: EpubSection[] }> {
  let zipReader: zip.ZipReader<Blob> | null = null;
  try {
    const fileBuffer = await file.arrayBuffer();
    if (fileBuffer.byteLength === 0) {
      throw new Error('Uploaded file is empty');
    }

    const fileBlob = new Blob([fileBuffer], { type: 'application/epub+zip' });
    const blobReader = new zip.BlobReader(fileBlob);
    zipReader = new zip.ZipReader(blobReader) as zip.ZipReader<Blob>;
    const entries = await zipReader.getEntries();

    if (!entries || entries.length === 0) {
      throw new Error('EPUB file is empty or corrupted (no entries found in zip).');
    }

    const containerEntry = entries.find(entry => entry.filename.endsWith('container.xml'));
    if (!containerEntry || typeof containerEntry.getData !== 'function') {
      throw new Error('container.xml not found or is invalid in EPUB');
    }
    const containerXml = await containerEntry.getData(new zip.TextWriter());
    const containerDoc = parse(containerXml) as Record<string, any>;
    const contentPath = containerDoc.container.rootfiles.rootfile['@full-path'];

    const contentEntry = entries.find(entry => entry.filename.endsWith(contentPath));
    if (!contentEntry || typeof contentEntry.getData !== 'function') {
      throw new Error('content.opf not found or is invalid at path: ' + contentPath);
    }
    const contentXml = await contentEntry.getData(new zip.TextWriter());
    const contentDoc = parse(contentXml) as Record<string, any>;

    const manifestItems = new Map();
    contentDoc.package.manifest.item.forEach((item: Record<string, any>) => {
      manifestItems.set(item['@id'], item['@href']);
    });

    const spineRefs = contentDoc.package.spine.itemref.map((ref: Record<string, any>) => ref['@idref']);

    const sections: EpubSection[] = [];
    for (const idref of spineRefs) {
      const href = manifestItems.get(idref);
      const chapterEntry = entries.find(entry => entry.filename.endsWith(href));
      if (chapterEntry && typeof chapterEntry.getData === 'function') {
        const html = await chapterEntry.getData(new zip.TextWriter());
        const title = manifestItems.get(idref) || `Chapter ${sections.length + 1}`;
        sections.push({ html, title });
      }
    }

    console.log(`Successfully extracted ${sections.length} sections from EPUB.`);
    return { sections };
  } finally {
    if (zipReader) {
      await zipReader.close();
    }
  }
}

// The Deno.serve call is now just a wrapper that provides the real dependencies.
Deno.serve((req: Request) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  return handleUpload(req, { supabaseClient, parseEpub });
});
