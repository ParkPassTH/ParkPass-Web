/*
  # Storage Bucket and Policies for Parking Spot Images
  
  1. Features
    - Create storage bucket for parking spot images
    - Set up appropriate security policies
    - Enable public access for viewing images
    - Restrict upload/update/delete to authenticated users
  
  2. Security
    - Policies check for existence before creation to avoid errors
    - Proper bucket configuration with size limits and MIME type restrictions
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