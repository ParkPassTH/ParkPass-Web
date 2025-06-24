/*
  # Add OCR fields to payment_slips table
  
  1. New Fields
    - `ocr_text` - Stores the raw text extracted from the payment slip image
    - `ocr_verification` - Boolean indicating if OCR verification was successful
    - `ocr_confidence` - Numeric value representing confidence level of OCR verification
    - `ocr_amount` - Extracted payment amount from the slip
    - `ocr_date` - Extracted payment date from the slip
  
  2. Purpose
    - Enable automated verification of payment slips
    - Store OCR results for audit and review
    - Support manual verification workflow
*/

-- Add OCR-related fields to payment_slips table
ALTER TABLE payment_slips 
ADD COLUMN IF NOT EXISTS ocr_text TEXT,
ADD COLUMN IF NOT EXISTS ocr_verification BOOLEAN,
ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS ocr_amount NUMERIC,
ADD COLUMN IF NOT EXISTS ocr_date TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on verification status
CREATE INDEX IF NOT EXISTS idx_payment_slips_verification ON payment_slips(ocr_verification);

-- Create function to trigger OCR verification when a new payment slip is uploaded
CREATE OR REPLACE FUNCTION trigger_payment_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- This function would normally call an external service or edge function
  -- For now, we'll just set a placeholder
  NEW.ocr_text := 'Pending OCR processing';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically initiate verification
DROP TRIGGER IF EXISTS payment_slip_verification_trigger ON payment_slips;
CREATE TRIGGER payment_slip_verification_trigger
BEFORE INSERT ON payment_slips
FOR EACH ROW
EXECUTE FUNCTION trigger_payment_verification();