-- supabase/migrations/0010_add_storage_rls_policies.sql

-- Minimal approach for local development
-- These commands will be run by the postgres user which has limited permissions

-- 1. First, try to enable RLS if it's not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND rowsecurity = true
  ) THEN
    EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY';
    RAISE NOTICE 'RLS enabled on storage.objects';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not enable RLS on storage.objects: %', SQLERRM;
END $$;

-- 2. Create a simple policy that allows all operations for authenticated users
-- This is less secure but should work for local development
DO $$
BEGIN
  -- Check if policy already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow all for authenticated users'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all for authenticated users" 
      ON storage.objects 
      FOR ALL 
      TO authenticated 
      USING (true) 
      WITH CHECK (true)';
    RAISE NOTICE 'Created policy: Allow all for authenticated users';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create policy: %', SQLERRM;
END $$;

-- 3. Grant necessary permissions
DO $$
BEGIN
  EXECUTE 'GRANT USAGE ON SCHEMA storage TO authenticated, anon';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated';
  EXECUTE 'GRANT SELECT ON storage.objects TO anon';
  RAISE NOTICE 'Granted permissions on storage schema and objects';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not grant permissions: %', SQLERRM;
END $$;

-- 4. Notify that the migration completed
DO $$
BEGIN
  RAISE NOTICE 'Storage RLS migration completed. Check for any warnings above.';
END $$;
