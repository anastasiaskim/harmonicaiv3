-- Create storage buckets
-- This migration ensures that the necessary storage buckets are created automatically.

-- Bucket for original ebook file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ebook-uploads', 'ebook-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket for generated audio outputs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audiobook-outputs', 'audiobook-outputs', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for ebook-uploads bucket (if needed, for now keeping it private)
-- Example: Allow authenticated users to upload
-- CREATE POLICY "Allow authenticated uploads" ON storage.objects
-- FOR INSERT TO authenticated
-- WITH CHECK (bucket_id = 'ebook-uploads');

-- Create policies for audiobook-outputs bucket
-- Allow public read access to all files in the audiobook-outputs bucket
CREATE POLICY "Public read access for audio files" ON storage.objects
FOR SELECT
USING (bucket_id = 'audiobook-outputs');

-- Allow service_role to perform all actions (upload, delete, etc.)
CREATE POLICY "Allow all actions for service role" ON storage.objects
FOR ALL
USING (bucket_id = 'audiobook-outputs' AND auth.role() = 'service_role');
