/*
  # Create Storage Bucket for Parking Spot Images
  
  1. New Storage Bucket
    - Creates 'parking-spots' bucket for storing parking spot images
    - Sets appropriate file size limits and MIME types
  
  2. Security Policies
    - Public read access for all parking spot images
    - Upload permissions for authenticated users
    - Update/delete permissions for image owners
*/

-- Create the parking-spots bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'parking-spots',
  'parking-spots',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Add policies with existence checks
DO $$
BEGIN
  -- Public read access policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Public read access for parking spot images'
  ) THEN
    CREATE POLICY "Public read access for parking spot images"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'parking-spots');
  END IF;

  -- Upload policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Authenticated users can upload parking spot images'
  ) THEN
    CREATE POLICY "Authenticated users can upload parking spot images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'parking-spots');
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can update own parking spot images'
  ) THEN
    CREATE POLICY "Users can update own parking spot images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'parking-spots' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can delete own parking spot images'
  ) THEN
    CREATE POLICY "Users can delete own parking spot images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'parking-spots' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;