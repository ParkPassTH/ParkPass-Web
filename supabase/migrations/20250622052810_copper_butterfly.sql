/*
  # Create payment-slips storage bucket
  
  1. Storage Setup
    - Create 'payment-slips' bucket for storing payment slip images
    - Set bucket to be public for easy image access
    - Configure appropriate policies for authenticated users

  2. Security
    - Allow authenticated users to upload images
    - Allow public read access to images
    - Restrict delete operations to bucket owners or admins
*/

-- Create the payment-slips bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-slips',
  'payment-slips', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload payment slips
CREATE POLICY "Authenticated users can upload payment slips"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-slips');

-- Allow authenticated users to view payment slips
CREATE POLICY "Authenticated users can view payment slips"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'payment-slips');

-- Allow users to delete their own payment slips (optional, for cleanup)
CREATE POLICY "Users can delete own payment slips"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-slips' AND
  auth.uid()::text = (storage.foldername(name))[1]
);