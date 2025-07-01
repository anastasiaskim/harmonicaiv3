import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders } from '../_shared/cors.ts';
import { BlobReader, BlobWriter, ZipReader } from '@zip.js/zip.js';
import { parse } from 'xml/mod.ts';

// Utility function to strip HTML tags
function stripHtml(html: string): string {
  // This function cleans HTML content to plain text.
  return html.replace(/<style[^>]*>.*<\/style>/gs, '') // remove style blocks
             .replace(/<[^>]*>/g, '') // remove all other tags
             .replace(/\s+/g, ' ') // replace multiple whitespace with single space
             .trim();
}

serve(async (req: Request) => {
  const requestOrigin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Initialize Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 2. Authenticate user
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // 3. Get file from request
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileName = file.name;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 4. Process EPUB file
    const zipReader = new ZipReader(new BlobReader(file));
    const entries = await zipReader.getEntries();

    // Find the content.opf file to determine chapter order
    const contentOpfEntry = entries.find(entry => entry.filename.endsWith('.opf'));
    if (!contentOpfEntry) {
      throw new Error('content.opf not found in EPUB');
    }
    const opfText = await contentOpfEntry.getData(new BlobWriter('text/xml'));
    const opfXml: any = parse(await opfText.text());

    const manifestItems = opfXml.package.manifest.item;
    const spineItems = opfXml.package.spine.itemref;

    const manifestMap = new Map<string, string>();
    manifestItems.forEach((item: any) => {
      manifestMap.set(item['@id'], item['@href']);
    });

    const opfPathParts = contentOpfEntry.filename.split('/');
    const basePath = opfPathParts.length > 1 ? opfPathParts.slice(0, -1).join('/') + '/' : '';

    // 5. Insert ebook record
    const { data: ebookData, error: ebookError } = await supabaseClient
      .from('ebooks')
      .insert({ user_id: user.id, file_name: fileName })
      .select()
      .single();

    if (ebookError) throw ebookError;

    const ebookId = ebookData.id;

    // 6. Read and process chapters in order
    const chapters = [];
    for (const itemref of spineItems) {
      const idref = itemref['@idref'];
      const href = manifestMap.get(idref);
      if (!href) continue;

      const chapterEntry = entries.find(entry => entry.filename === `${basePath}${href}`);
      if (!chapterEntry) continue;

      const chapterHtml = await chapterEntry.getData(new BlobWriter('text/html'));
      const chapterText = await chapterHtml.text();
      
      const bodyMatch = chapterText.match(/<body[^>]*>([\s\S]*)<\/body>/);
      const rawText = bodyMatch ? bodyMatch[1] : chapterText;
      const cleanedText = stripHtml(rawText);

      chapters.push({
        ebook_id: ebookId,
        chapter_number: chapters.length + 1,
        text_content: cleanedText,
      });
    }

    // 7. Insert chapter records
    const { error: chaptersError } = await supabaseClient.from('chapters').insert(chapters);
    if (chaptersError) throw chaptersError;

    await zipReader.close();

    return new Response(JSON.stringify({ ebook_id: ebookId }), {
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
