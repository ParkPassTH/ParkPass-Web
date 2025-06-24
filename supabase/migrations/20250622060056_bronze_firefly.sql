-- Check if the payment-slips bucket already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'payment-slips') THEN
    -- Create the payment-slips bucket
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

-- Drop existing policies if they exist
DO $$
BEGIN
  -- Drop existing policies to avoid conflicts
  DROP POLICY IF EXISTS "Authenticated users can upload payment slips" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can view payment slips" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own payment slips" ON storage.objects;
END $$;

-- Create new policies with unique names
CREATE POLICY "Payment slips upload policy" 
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-slips');

CREATE POLICY "Payment slips view policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'payment-slips');

CREATE POLICY "Payment slips delete policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-slips' AND
  auth.uid()::text = (storage.foldername(name))[1]
);