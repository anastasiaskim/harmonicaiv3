-- Check if RLS is enabled on the ebooks table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('ebooks', 'chapters', 'audio_files');

-- Check existing policies on the ebooks table
SELECT * FROM pg_policies 
WHERE tablename = 'ebooks' 
AND schemaname = 'public';

-- Check the table structure to understand required fields
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'ebooks'
ORDER BY ordinal_position;

-- Check for any triggers on the ebooks table
SELECT trigger_name, event_manipulation, action_statement, action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'ebooks';
