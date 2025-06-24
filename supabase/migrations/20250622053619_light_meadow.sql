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

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Authenticated users can upload payment slips" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can view payment slips" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own payment slips" ON storage.objects;
  
  -- Create new policies
  CREATE POLICY "Authenticated users can upload payment slips"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-slips');

  CREATE POLICY "Authenticated users can view payment slips"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-slips');

  CREATE POLICY "Users can delete own payment slips"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-slips' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
END $$;