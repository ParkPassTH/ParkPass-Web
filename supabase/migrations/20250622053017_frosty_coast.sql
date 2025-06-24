/*
  # Create payment-qr-codes storage bucket
  
  1. Storage Setup
    - Create 'payment-qr-codes' bucket for storing QR code payment images
    - Set bucket to be public for easy image access
    - Configure appropriate policies for authenticated users

  2. Security
    - Allow authenticated users to upload images
    - Allow public read access to images
    - Restrict delete operations to bucket owners or admins
*/

-- Create the payment-qr-codes bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-qr-codes',
  'payment-qr-codes', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload QR code images
CREATE POLICY "Authenticated users can upload QR code images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-qr-codes');

-- Allow public read access to QR code images
CREATE POLICY "Public can view QR code images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'payment-qr-codes');

-- Allow users to update their own uploaded QR code images
CREATE POLICY "Users can update own QR code images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-qr-codes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own uploaded QR code images
CREATE POLICY "Users can delete own QR code images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'payment-qr-codes' AND auth.uid()::text = (storage.foldername(name))[1]);