// supabase/functions/upload-ebook/index.ts

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import * as zip from 'npm:@zip.js/zip.js';
import { Buffer } from "https://deno.land/std@0.140.0/node/buffer.ts";
import { parse } from "https://deno.land/x/xml@2.1.3/mod.ts";

// Add debug logging
console.log('Upload-ebook function starting...');

// Type definitions
interface HandlerDependencies {
  supabaseClient: SupabaseClient;
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
export async function handleUpload(req: Request, { supabaseClient }: HandlerDependencies): Promise<Response> {
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
      throw new Error('File not found in form data. Make sure the key is "file".');
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

    // Declare zipReader at function scope so it's accessible in catch/finally
    let zipReader: any = null;
    try {
      // 2. Manually parse the EPUB file
      console.log('[Info] Manually parsing EPUB file...');
      
      console.log('Processing file as EPUB...');
      console.log('File size:', file.size, 'bytes');
      
      // Convert the file to an ArrayBuffer first
      const fileBuffer = await file.arrayBuffer();
      console.log('File buffer created, size:', fileBuffer.byteLength, 'bytes');
      
      if (fileBuffer.byteLength === 0) {
        throw new Error('Uploaded file is empty');
      }

      // Create a Blob with explicit MIME type
      const fileBlob = new Blob([fileBuffer], { type: 'application/epub+zip' });
      console.log('Blob created, size:', fileBlob.size, 'bytes');

      // Create a new BlobReader with the correct MIME type
      const blobReader = new zip.BlobReader(fileBlob);
      console.log('BlobReader created, starting to read zip entries...');

      // Create zip reader with the blob reader
      zipReader = new zip.ZipReader(blobReader);
      
      // Get all entries
      console.log('Getting zip entries...');
      const entries = await zipReader.getEntries();
      console.log(`Found ${entries.length} entries in the EPUB`);
      
      if (!entries || entries.length === 0) {
        const errorMessage = "EPUB file is empty or corrupted (no entries found in zip).";
        console.error(errorMessage);
        
        if (ebook_id) {
          await supabaseClient
            .from('ebooks')
            .update({ 
              status: 'error', 
              status_message: errorMessage,
              updated_at: new Date().toISOString()
            })
            .eq('id', ebook_id);
        }
        
        throw new Error(errorMessage);
      }

      // 3. Find and parse content.opf to get the book structure
      const opfEntry = entries.find(entry => entry.filename.endsWith('.opf'));
      if (!opfEntry) {
        throw new Error('Could not find .opf file in EPUB');
      }
      const opfContent = await opfEntry.getData(new zip.TextWriter());
      const opfXml = parse(opfContent) as any;

      // Extract manifest and spine from OPF
      const manifestItems = Array.isArray(opfXml.package.manifest.item) ? opfXml.package.manifest.item : [opfXml.package.manifest.item];
      const spineItems = Array.isArray(opfXml.package.spine.itemref) ? opfXml.package.spine.itemref : [opfXml.package.spine.itemref];

      // Create a map of manifest item IDs to their file paths (href)
      const manifestMap = new Map<string, string>();
      manifestItems.forEach((item: any) => {
        manifestMap.set(item['@id'], item['@href']);
      });

      // Get the base path from the OPF file location to resolve relative paths
      const opfPathParts = opfEntry.filename.split('/');
      const basePath = opfPathParts.length > 1 ? opfPathParts.slice(0, -1).join('/') + '/' : '';

      // 4. Extract chapters, splitting them into smaller chunks for the TTS API
      const MAX_CHUNK_SIZE = 9000; // Keep well under the 10k limit
      const chapterChunksNested = await Promise.all(spineItems.map(async (item: any, index: number) => {
        const chapterId = item['@idref'];
        const chapterHref = manifestMap.get(chapterId);
        if (!chapterHref) {
          console.warn(`Could not find chapter with idref ${chapterId} in manifest.`);
          return [];
        }

        const chapterPath = basePath + chapterHref;
        const chapterEntry = entries.find(entry => entry.filename === chapterPath);
        if (!chapterEntry) {
          console.warn(`Could not find chapter file: ${chapterPath}`);
          return [];
        }

        const chapterHtml = await chapterEntry.getData(new zip.TextWriter());
        const textContent = stripHtml(chapterHtml).trim();

        if (textContent.length > 0) {
          const chunks = [];
          for (let i = 0; i < textContent.length; i += MAX_CHUNK_SIZE) {
            chunks.push(textContent.substring(i, i + MAX_CHUNK_SIZE));
          }

          return chunks.map((chunk, partIndex) => ({
            ebook_id: ebook_id,
            chapter_number: index + 1,
            part_number: partIndex + 1,
            title: chunks.length > 1 ? `Chapter ${index + 1}, Part ${partIndex + 1}` : `Chapter ${index + 1}`,
            text_content: chunk,
            status: 'pending' as const,
          }));
        }
        return [];
      }));

      const chapters = chapterChunksNested.flat();

      if (chapters.length === 0) {
        throw new Error('Ebook has no text content after parsing.');
      }

      // 4. Insert chapters
      console.log('Attempting to insert into chapters table...');
      const { data: insertedChapters, error: chaptersError } = await supabaseClient
        .from('chapters')
        .insert(chapters)
        .select();

      if (chaptersError) {
        throw chaptersError;
      }
      console.log('Successfully inserted chapters.');

      // 5. Update ebook status to 'processed'
      await supabaseClient.from('ebooks').update({ status: 'processed' }).eq('id', ebook_id);

      // 6. Asynchronously invoke the audio generation batch function
      console.log(`[Info] Invoking audio generation for ebook: ${ebook_id}`);
      supabaseClient.functions.invoke('generate-audio-batch', {
        body: {
          ebook_id: ebook_id,
          voice_id: 'pNInz6obpgDQGcFmaJgB', // Default voice, can be customized later
        },
        headers: {
          Authorization: authHeader,
        },
      });

      return new Response(JSON.stringify({ ebook_id, chapters: insertedChapters }), {
        headers: { 
          ...corsHeaders(origin),
          'Content-Type': 'application/json' 
        },
        status: 200,
      });
    } catch (processingError: unknown) {
      console.error('An error occurred during EPUB processing:', processingError);
      
      // Close zip reader if it exists
      if (zipReader) {
        try {
          await zipReader.close();
          console.log('Zip reader closed after error');
        } catch (closeError) {
          console.error('Error closing zip reader:', closeError);
        }
      }
      
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
    } finally {
      // Ensure zip reader is always closed
      if (zipReader) {
        try {
          await zipReader.close();
          console.log('Zip reader closed successfully');
        } catch (closeError) {
          console.error('Error closing zip reader in finally block:', closeError);
        }
      }
    }
  } catch (error: unknown) {
    console.error('An error occurred in the upload-ebook function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown internal error occurred.';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return new Response(
      JSON.stringify({ error: 'An internal error occurred.', message: errorMessage, stack: errorStack }),
      { headers: { ...headers, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}

// The Deno.serve call is now just a wrapper that provides the real dependencies.
Deno.serve(async (req: Request) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

    return await handleUpload(req, { supabaseClient });
});
