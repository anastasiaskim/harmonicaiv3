-- Create a function to call the generate-audio-batch Edge Function
CREATE OR REPLACE FUNCTION public.trigger_generate_audio_batch()
RETURNS TRIGGER AS $$
DECLARE
  auth_header text;
  supabase_url text;
  anon_key text;
  response text;
  ebook_id uuid;
BEGIN
  -- Only proceed if this is a new chapter
  IF TG_OP = 'INSERT' THEN
    ebook_id := NEW.ebook_id;
    
    -- Get the JWT secret and other required values from environment variables
    -- These are set in the .env file and available in the database via the pgsodium extension
    SELECT current_setting('app.settings.jwt_secret', true) INTO auth_header;
    SELECT current_setting('app.settings.supabase_url', true) INTO supabase_url;
    SELECT current_setting('app.settings.anon_key', true) INTO anon_key;
    
    -- If any of the required settings are missing, log a warning and continue
    IF auth_header IS NULL OR supabase_url IS NULL OR anon_key IS NULL THEN
      RAISE WARNING 'Missing required environment variables for audio generation trigger';
      RETURN NEW;
    END IF;
    
    -- Use the Supabase HTTP extension to call the Edge Function
    -- We'll use the service_role key to bypass RLS if needed
    SELECT content::json->>'message' INTO response
    FROM http(('POST',
      supabase_url || '/functions/v1/generate-audio-batch',
      ARRAY[
        http_header('Content-Type', 'application/json')::http_header,
        http_header('Authorization', 'Bearer ' || anon_key)::http_header
      ]::http_header[],
      'application/json',
      json_build_object('ebook_id', ebook_id, 'voice_id', 'default')::text
    )::http_request);
    
    -- Log the response for debugging
    RAISE NOTICE 'Audio generation triggered for ebook_id: %. Response: %', ebook_id, response;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function after a new chapter is inserted
CREATE TRIGGER after_chapter_insert
AFTER INSERT ON public.chapters
FOR EACH ROW
EXECUTE FUNCTION public.trigger_generate_audio_batch();

-- Add a comment to explain the trigger
COMMENT ON TRIGGER after_chapter_insert ON public.chapters IS 'Triggers audio generation for new chapters';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.trigger_generate_audio_batch() TO service_role;
