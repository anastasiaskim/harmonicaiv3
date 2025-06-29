-- 0008_add_insert_policies.sql

-- Allow authenticated users to insert their own ebooks
CREATE POLICY "Allow insert for authenticated users on ebooks"
ON public.ebooks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to insert chapters for their own ebooks
CREATE POLICY "Allow insert for authenticated users on chapters"
ON public.chapters
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT user_id FROM public.ebooks WHERE id = ebook_id) = auth.uid()
);
