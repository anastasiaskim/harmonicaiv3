-- 0004_enable_rls_and_create_policies.sql

-- Enable Row Level Security for ebooks and chapters
ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public read access to ebooks
-- This allows anyone (anon, authenticated) to view ebook records.
-- In a multi-user app, you would restrict this to `USING (auth.uid() = user_id)`.
CREATE POLICY "Allow public read access to ebooks"
ON public.ebooks
FOR SELECT
USING (true);

-- Create a policy to allow public read access to chapters
-- This allows anyone (anon, authenticated) to view chapter records.
-- In a multi-user app, you would restrict this based on the ebook's ownership.
CREATE POLICY "Allow public read access to chapters"
ON public.chapters
FOR SELECT
USING (true);
