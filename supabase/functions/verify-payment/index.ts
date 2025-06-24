import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { createWorker } from 'npm:tesseract.js@4.1.1';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    const { paymentSlipId, bookingId } = await req.json();

    if (!paymentSlipId || !bookingId) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Get payment slip details
    const { data: paymentSlip, error: paymentSlipError } = await supabase
      .from('payment_slips')
      .select('*')
      .eq('id', paymentSlipId)
      .single();

    if (paymentSlipError || !paymentSlip) {
      return new Response(JSON.stringify({ error: "Payment slip not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Perform OCR on the payment slip image
    const imageUrl = paymentSlip.image_url;
    const ocrResult = await performOCR(imageUrl);
    
    // Process OCR results
    const verificationResult = verifyPaymentDetails(ocrResult, booking.total_cost);
    
    // Update payment slip with OCR results
    await supabase
      .from('payment_slips')
      .update({
        ocr_text: ocrResult,
        ocr_verification: verificationResult.verified,
        ocr_confidence: verificationResult.confidence,
        status: verificationResult.verified ? 'verified' : 'pending',
        notes: verificationResult.notes
      })
      .eq('id', paymentSlipId);
    
    // If OCR verification is successful, update booking status
    if (verificationResult.verified) {
      await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          payment_status: 'verified',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', bookingId);
        
      // Create notification for user
      await createNotification(booking.user_id, 'Payment Verified', 'Your payment has been verified and your booking is confirmed.');
    }

    return new Response(JSON.stringify({
      success: true,
      verified: verificationResult.verified,
      confidence: verificationResult.confidence,
      notes: verificationResult.notes
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error processing payment verification:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }
});

async function performOCR(imageUrl: string): Promise<string> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const imageBlob = await response.blob();
    
    // Initialize Tesseract worker
    const worker = await createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    
    // Perform OCR
    const { data: { text } } = await worker.recognize(imageBlob);
    
    // Terminate worker
    await worker.terminate();
    
    return text;
  } catch (error) {
    console.error("OCR processing error:", error);
    return "";
  }
}

function verifyPaymentDetails(ocrText: string, expectedAmount: number): { 
  verified: boolean; 
  confidence: number; 
  notes: string;
} {
  // Default result
  const result = {
    verified: false,
    confidence: 0,
    notes: "Payment verification pending manual review."
  };
  
  if (!ocrText) {
    result.notes = "OCR failed to extract text from the image.";
    return result;
  }
  
  // Convert OCR text to lowercase for easier matching
  const text = ocrText.toLowerCase();
  
  // Look for amount patterns in the text
  const amountRegex = /\$?\s*(\d+[.,]\d{2})/g;
  const amountMatches = [...text.matchAll(amountRegex)];
  
  // Look for payment confirmation keywords
  const confirmationKeywords = ['payment', 'successful', 'completed', 'confirmed', 'paid', 'transaction'];
  const keywordsFound = confirmationKeywords.filter(keyword => text.includes(keyword));
  
  // Check if we found any amounts
  if (amountMatches.length > 0) {
    // Extract amounts and convert to numbers
    const amounts = amountMatches.map(match => {
      const amountStr = match[1].replace(',', '.');
      return parseFloat(amountStr);
    });
    
    // Check if any amount matches the expected amount
    const matchingAmount = amounts.find(amount => Math.abs(amount - expectedAmount) < 0.01);
    
    if (matchingAmount) {
      result.verified = true;
      result.confidence = 0.8; // High confidence if amount matches
      result.notes = `Payment of $${matchingAmount.toFixed(2)} verified by OCR.`;
      
      // Increase confidence if confirmation keywords are found
      if (keywordsFound.length > 2) {
        result.confidence = 0.95;
      }
    } else {
      result.notes = `Found amounts (${amounts.join(', ')}) do not match expected amount ($${expectedAmount.toFixed(2)}).`;
      result.confidence = 0.3;
    }
  } else {
    result.notes = "No payment amount found in the image.";
    result.confidence = 0.1;
  }
  
  // If confidence is low but confirmation keywords are found, increase slightly
  if (!result.verified && keywordsFound.length > 2) {
    result.confidence = Math.min(0.5, result.confidence + 0.2);
    result.notes += ` Found payment keywords: ${keywordsFound.join(', ')}.`;
  }
  
  return result;
}

async function createNotification(userId: string, title: string, message: string) {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'payment_received',
      title,
      message,
      data: {},
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}