-- Create the payment-slips bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'payment-slips') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'payment-slips',
      'payment-slips', 
      true,
      5242880, -- 5MB limit
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    );
  END IF;
END $$;

-- Check if policies exist before creating them
DO $$
BEGIN
  -- Check and create upload policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Authenticated users can upload payment slips'
  ) THEN
    CREATE POLICY "Authenticated users can upload payment slips"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'payment-slips');
  END IF;

  -- Check and create view policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Authenticated users can view payment slips'
  ) THEN
    CREATE POLICY "Authenticated users can view payment slips"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'payment-slips');
  END IF;

  -- Check and create delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can delete own payment slips'
  ) THEN
    CREATE POLICY "Users can delete own payment slips"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'payment-slips' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;