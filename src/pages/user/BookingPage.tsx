import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Car, 
  CreditCard,
  QrCode,
  Check,
  Copy,
  Download,
  AlertCircle,
  Upload,
  Image,
  X,
  Navigation
} from 'lucide-react';
import { QRCodeGenerator } from '../../components/QRCodeGenerator';
import { TimeSlotAvailability } from '../../components/TimeSlotAvailability';
import { supabase, saveBookingSession, getBookingSession, clearBookingSession } from '../../lib/supabase';
import { ParkingSpot, Vehicle, PaymentMethod } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PaymentSlipUpload } from '../../components/PaymentSlipUpload';

export const BookingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<'time' | 'payment' | 'upload' | 'success'>('time');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [spot, setSpot] = useState<ParkingSpot | null>(null);
  
  // Set default times (1 hour from now for start, 3 hours from now for end)
  const getDefaultTimes = () => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const endTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now
    
    return {
      start: startTime.toTimeString().substring(0, 5),
      end: endTime.toTimeString().substring(0, 5)
    };
  };
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  
  // ฟังก์ชัน toggle slot with consecutive validation
  function toggleSlot(slotStart: string) {
    setSelectedSlots((prev) => {
      if (prev.includes(slotStart)) {
        // Remove the slot
        return prev.filter((s) => s !== slotStart);
      } else {
        // Add the slot and check if consecutive
        const newSlots = [...prev, slotStart].sort();
        
        // Validate consecutive slots
        if (areConsecutiveSlots(newSlots)) {
          return newSlots;
        } else {
          // If not consecutive, show alert and don't add
          alert('You can only select consecutive time slots. Please select adjacent time slots.');
          return prev;
        }
      }
    });
  }

  // Helper function to check if slots are consecutive
  function areConsecutiveSlots(slots: string[]): boolean {
    if (slots.length <= 1) return true;
    
    const sortedSlots = [...slots].sort();
    for (let i = 1; i < sortedSlots.length; i++) {
      const currentSlot = sortedSlots[i];
      const previousSlot = sortedSlots[i - 1];
      
      // Find the end time of the previous slot
      const previousSlotData = generateTimeSlots(openTime, closeTime).find(s => s.start === previousSlot);
      if (!previousSlotData || previousSlotData.end !== currentSlot) {
        return false;
      }
    }
    return true;
  }
  // Helper function to check if slot has at least 30 minutes remaining until END of slot
  function hasMinimumTime(slotStart: string): boolean {
    const now = new Date();
    
    // Parse date and time more reliably
    const [year, month, day] = startDate.split('-').map(Number);
    const [hour, minute] = slotStart.split(':').map(Number);
    
    // Create date in local timezone to avoid timezone issues
    const slotStartDateTime = new Date(year, month - 1, day, hour, minute, 0);
    // Calculate end time of the slot (1 hour later)
    const slotEndDateTime = new Date(slotStartDateTime.getTime() + 60 * 60 * 1000);
    
    // Debug logging for midnight and early morning slots
    if (slotStart === '00:00' || slotStart === '01:00') {
      console.log(`BookingPage hasMinimumTime debug for ${slotStart}:`, {
        startDate,
        now: now.toISOString(),
        slotStart: slotStartDateTime.toISOString(),
        slotEnd: slotEndDateTime.toISOString(),
        remainingMs: slotEndDateTime.getTime() - now.getTime(),
        remainingMinutes: Math.floor((slotEndDateTime.getTime() - now.getTime()) / (1000 * 60)),
        hasMinTime: Math.floor((slotEndDateTime.getTime() - now.getTime()) / (1000 * 60)) >= 30
      });
    }
    
    // Check if there are at least 30 minutes remaining until the slot ends
    const remainingMs = slotEndDateTime.getTime() - now.getTime();
    const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
    
    return remainingMinutes >= 30;
  }

  // Helper function to calculate remaining time until END of slot (in minutes)
  function getRemainingTimeInSlot(slotStart: string): number {
    const now = new Date();
    
    // Parse date and time more reliably
    const [year, month, day] = startDate.split('-').map(Number);
    const [hour, minute] = slotStart.split(':').map(Number);
    
    // Create date in local timezone to avoid timezone issues
    const slotStartDateTime = new Date(year, month - 1, day, hour, minute, 0);
    // Calculate end time of the slot (1 hour later)
    const slotEndDateTime = new Date(slotStartDateTime.getTime() + 60 * 60 * 1000);
    
    const remainingMs = slotEndDateTime.getTime() - now.getTime();
    return Math.max(0, Math.floor(remainingMs / (1000 * 60))); // convert to minutes
  }

  // Helper function to calculate prorated price for a slot
  function calculateSlotPrice(slotStart: string): number {
    if (!spot) return 0;
    
    const remainingMinutes = getRemainingTimeInSlot(slotStart);
    
    if (remainingMinutes <= 0) return 0;
    
    // If more than 60 minutes remaining, full price
    if (remainingMinutes >= 60) {
      return spot.price; // Full price ฿20
    }
    
    // If between 30-59 minutes remaining, prorated pricing
    if (remainingMinutes >= 30) {
      // Half price + proportional time before 30 min mark
      const halfPrice = spot.price * 0.5; // ฿10
      const extraMinutes = remainingMinutes - 30; // Minutes above 30
      const extraPrice = (extraMinutes / 30) * (spot.price * 0.5); // Proportional to remaining half
      const totalPrice = halfPrice + extraPrice;
      return Math.ceil(totalPrice); // ปัดขึ้นไม่เอาทศนิยม
    }
    
    // If less than 30 minutes, cannot book (should not reach here)
    return 0;
  }

  let hours: any = undefined;
  if (spot?.operating_hours) {
    if (typeof spot.operating_hours === "string") {
      try {
        hours = JSON.parse(spot.operating_hours);
      } catch (e) {
  
      }
    } else {
      hours = spot.operating_hours;
    }
  }
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const jsDay = new Date(startDate).getDay();
  const selectedDay = days[(jsDay + 6) % 7];

  // หา key แบบ normalize ด้วย Object.entries
  let dayHours: any = undefined;
  if (hours) {
    const entries = Object.entries(hours);
    const found = entries.find(
      ([k]) => k.trim().toLowerCase() === selectedDay.trim().toLowerCase()
    );
    dayHours = found ? found[1] : undefined;
    // log keys จริงๆ
  }
  
  let isOpen = false;
  let openTime: string = "";
  let closeTime: string = "";

  if (spot?.operating_hours === "24/7 Access") {
    isOpen = true;
    openTime = "00:00";
    closeTime = "24:00";
  } else if (dayHours?.isOpen) {
    isOpen = true;
    if (dayHours.is24Hours) {
      openTime = "00:00";
      closeTime = "24:00";
    } else {
      openTime = dayHours.openTime || "09:00";
      closeTime = dayHours.closeTime || "17:00";
    }
  } else {
    isOpen = false;
  }


  const [bookedSlots, setBookedSlots] = useState<{start: string, end: string}[]>([]);
  function generateTimeSlots(open = "09:00", close = "17:00") {
    const slots = [];
    let [h, m] = open.split(":").map(Number);
    let [endH, endM] = close.split(":").map(Number);
    // ถ้า closeTime เป็น 24:00 ให้ endH = 24, endM = 0
    if (close === "24:00") {
      endH = 24;
      endM = 0;
    }
    while (h < endH || (h === endH && m < endM)) {
      const start = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      let nextH = h, nextM = m + 60;
      if (nextM >= 60) { nextH += 1; nextM -= 60; }
      const end = `${nextH.toString().padStart(2, "0")}:${nextM.toString().padStart(2, "0")}`;
      slots.push({ start, end });
      h = nextH; m = nextM;
    }
    return slots;
  }
  const slots = generateTimeSlots(openTime, closeTime);

  useEffect(() => {
    if (selectedSlots.length > 0) {
      // sort slot ตามเวลา
      const sorted = [...selectedSlots].sort();
      setStartTime(sorted[0]);
      // หา end ของ slot สุดท้าย
      const lastSlot = slots.find(slot => slot.start === sorted[sorted.length - 1]);
      if (lastSlot) setEndTime(lastSlot.end);
    } else {
      // ถ้าไม่เลือก slot ให้ reset เป็นค่าว่าง
      setStartTime('');
      setEndTime('');
    }
  }, [selectedSlots, slots]);

  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!spot || !startDate) return;
      const { data, error } = await supabase
        .from('bookings')
        .select('start_time, end_time, status')
        .eq('spot_id', spot.id)
        .in('status', ['confirmed', 'active'])
        .gte('start_time', `${startDate}T00:00:00`)
        .lt('start_time', `${startDate}T23:59:59`);
      if (!error && data) {
        const processedSlots = data.map((b: any) => ({
          start: b.start_time.slice(11, 16),
          end: b.end_time.slice(11, 16)
        }));
        console.log('Fetched bookedSlots:', processedSlots);
        setBookedSlots(processedSlots);
      }
    };
    fetchBookedSlots();
  }, [spot, startDate]);

  function isSlotBooked(slot: { start: string, end: string }) {
  // ถ้าเวลาเริ่ม >= เวลาสิ้นสุด ไม่ต้องเช็ค
    if (slot.start >= slot.end) return true;
    const isBooked = bookedSlots.some(
      b => (slot.start < b.end && slot.end > b.start) // overlap
    );
    
    // Debug log for 00:00 slot
    if (slot.start === '00:00') {
      console.log('isSlotBooked debug for 00:00:', {
        slot,
        bookedSlots,
        isBooked
      });
    }
    
    return isBooked;
  }


  const defaultTimes = getDefaultTimes();
  const [startTime, setStartTime] = useState(defaultTimes.start);
  const [endTime, setEndTime] = useState(defaultTimes.end);
  
  const [paymentMethod, setPaymentMethod] = useState('qr_code');
  const [bookingId, setBookingId] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [showPaymentSlipUpload, setShowPaymentSlipUpload] = useState(false);
  const [paymentSlipUrl, setPaymentSlipUrl] = useState<string | null>(null);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [ownerPaymentMethod, setOwnerPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  const [showQRCodeOverlay, setShowQRCodeOverlay] = useState(false);
  
  // Check for existing booking session on mount
  useEffect(() => {
    const session = getBookingSession();
    if (session && session.spotId === id) {
      // Restore session state
      setStartDate(session.startDate || startDate);
      setStartTime(session.startTime || startTime);
      setEndTime(session.endTime || endTime);
      setSelectedVehicle(session.selectedVehicle || '');
      setStep(session.step || 'time');
      
      if (session.createdBookingId) {
        setCreatedBookingId(session.createdBookingId);
      }
      
      if (session.paymentSlipUrl) {
        setPaymentSlipUrl(session.paymentSlipUrl);
      }
      
      if (session.bookingId) {
        setBookingId(session.bookingId);
      }
      
      if (session.qrCode) {
        setQrCode(session.qrCode);
      }
      
      if (session.pin) {
        setPin(session.pin);
      }
    } else {
      // Generate new booking ID, QR code and PIN with unique identifiers
      const newBookingId = 'BK' + Date.now();
      const newQrCode = `BK-${id}-${crypto.randomUUID()}`;
      const newPin = generateSecurePin(newBookingId, id || '');
      
      setBookingId(newBookingId);
      setQrCode(newQrCode);
      setPin(newPin);
    }
  }, [id]);

  // Save booking session whenever relevant state changes
  useEffect(() => {
    if (id) {
      saveBookingSession({
        spotId: id,
        startDate,
        startTime,
        endTime,
        selectedVehicle,
        step,
        createdBookingId,
        paymentSlipUrl,
        bookingId,
        qrCode,
        pin
      });
    }
  }, [id, startDate, startTime, endTime, selectedVehicle, step, createdBookingId, paymentSlipUrl, bookingId, qrCode, pin]);

  useEffect(() => {
    const fetchSpotDetails = async () => {
      if (!id) {
        setError('No parking spot ID provided');
        setLoading(false);
        return;
      }
      
      console.log('Fetching spot details for ID:', id);
      setLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('parking_spots')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        // Transform database field names to match our interface
        const transformedSpot = {
          ...data,
          totalSlots: data.total_slots || 1,  // Transform total_slots to totalSlots
          openingHours: data.operating_hours  // Transform operating_hours to openingHours
        };
        
        // Debug log for spot data transformation
        console.log('Spot data transformation:', {
          originalData: data,
          transformedSpot,
          totalSlotsField: data.total_slots,
          transformedTotalSlots: transformedSpot.totalSlots,
          operatingHours: data.operating_hours,
          operatingHoursType: typeof data.operating_hours,
          transformedOpeningHours: transformedSpot.openingHours
        });
        
        setSpot(transformedSpot);
        
        // Fetch owner's payment methods
        if (data && data.owner_id) {
          fetchOwnerPaymentMethods(data.owner_id);
        }
      } catch (err: any) {
        console.error('Error fetching spot details:', err);
        setError(err.message || 'Failed to load parking spot details');
      } finally {
        setLoading(false);
      }
    };

    fetchSpotDetails();
  }, [id]);

  const fetchOwnerPaymentMethods = async (ownerId: string) => {
    setPaymentMethodsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('type', 'qr_code')
        .eq('is_active', true)
        .maybeSingle();
        
      if (error) throw error;
      
      if (data) {
        setOwnerPaymentMethod(data);
      }
    } catch (err) {
      console.error('Error fetching owner payment methods:', err);
    } finally {
      setPaymentMethodsLoading(false);
    }
  };

  useEffect(() => {
    const fetchVehicles = async () => {
      if (!user) return;
      
      setVehiclesLoading(true);
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          setVehicles(data);
          // Only set selected vehicle if not already set from session
          if (!selectedVehicle) {
            setSelectedVehicle(data[0].id);
          }
        }
      } catch (err: any) {
        console.error('Error fetching vehicles:', err);
      } finally {
        setVehiclesLoading(false);
      }
    };

    fetchVehicles();
  }, [user, selectedVehicle]);

  const calculateDuration = () => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`2024-01-01 ${startTime}`);
    const end = new Date(`2024-01-01 ${endTime}`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
  };

  const calculateTotal = () => {
    if (!spot || selectedSlots.length === 0) return 0;
    
    let total = 0;
    console.log('=== Price Calculation Debug ===');
    selectedSlots.forEach(slotStart => {
      const slotPrice = calculateSlotPrice(slotStart);
      const remaining = getRemainingTimeInSlot(slotStart);
      console.log(`Slot ${slotStart}: ${remaining}min remaining = ฿${slotPrice}`);
      total += slotPrice;
    });
    console.log(`Total: ฿${total}`);
    console.log('===============================');
    
    return Math.ceil(total); // ปัดขึ้นไม่เอาทศนิยม
  };

  const handleBooking = async () => {
    if (step === 'time') {
      if (!startDate || !startTime || !endTime) {
        alert('Please select date and time');
        return;
      }
      setStep('payment');
    } else if (step === 'payment') {
      if (!paymentMethod) {
        alert('Please select a payment method');
        return;
      }
      
      try {
        // Generate a fresh unique QR code for the actual booking to prevent duplicates
        const uniqueQrCode = `BK-${id}-${crypto.randomUUID()}`;
        
        // Generate secure PIN based on booking and spot
        const securePin = generateSecurePin(bookingId, id || '');
        
        // Format the start and end times correctly for the database
        // Use ISO format with the correct timezone
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${startDate}T${endTime}`);
        
        // Create the booking in the database
        const { data, error } = await supabase
          .from('bookings')
          .insert({
            user_id: user?.id,
            spot_id: id,
            vehicle_id: selectedVehicle,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            total_cost: calculateTotal(),
            payment_method: paymentMethod,
            status: 'pending',
            payment_status: 'pending',
            qr_code: uniqueQrCode,
            pin: securePin
          })
          .select();
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          setCreatedBookingId(data[0].id);
          // Update the QR code and PIN state with the ones actually used in the database
          setQrCode(uniqueQrCode);
          setPin(securePin);
          // Move to payment slip upload step
          setStep('upload');
          setShowPaymentSlipUpload(true);
        }
      } catch (err: any) {
        console.error('Error creating booking:', err);
        alert('Failed to create booking. Please try again.');
      }
    }
  };

  const handlePaymentSlipUpload = (imageUrl: string) => {
    setPaymentSlipUrl(imageUrl);
    setShowPaymentSlipUpload(false);
    // Move to success step after upload
    setStep('success');
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    alert(`${type} copied to clipboard!`);
  };

  // Function to generate secure PIN from booking and spot ID
  const generateSecurePin = (bookingId: string, spotId: string) => {
    // Create a hash-like string from booking and spot ID
    const combined = `${bookingId}-${spotId}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to positive 4-digit number
    return Math.abs(hash % 9000 + 1000).toString();
  };

  // Function to download QR code with PIN
  const downloadQR = async () => {
    try {
      const qrImage = document.getElementById('booking-qr-code') as HTMLImageElement;
      
      if (!qrImage) {
        alert('QR code not found');
        return;
      }

      // Create a canvas element to render the QR code
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        alert('Unable to create canvas');
        return;
      }

      // Wait for image to load if it hasn't already
      if (!qrImage.complete) {
        await new Promise<void>((resolve, reject) => {
          qrImage.onload = () => resolve();
          qrImage.onerror = () => reject(new Error('Failed to load QR image'));
          setTimeout(() => reject(new Error('Timeout loading QR image')), 5000);
        });
      }

      // Set canvas dimensions
      const qrSize = 160; // Match the size from QRCodeGenerator
      canvas.width = qrSize;
      canvas.height = qrSize + 50; // Extra space for PIN text
      
      // Fill background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR code
      ctx.drawImage(qrImage, 0, 0, qrSize, qrSize);
      
      // Add PIN text
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`PIN: ${pin}`, canvas.width / 2, qrSize + 30);
      
      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png');
      
      // Create download link
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = `parkpass-qr-${bookingId.slice(-6)}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
    } catch (error) {
      console.error('Error downloading QR code:', error);
      alert('Failed to download QR code. Please try again.');
    }
  };

  // Function to navigate to parking spot
  const navigateToParking = () => {
    if (!spot || !spot.latitude || !spot.longitude) {
      alert('Location information not available for this parking spot');
      return;
    }
    
    // Open in Google Maps
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`, '_blank');
  };

  // Clear booking session when booking is completed
  useEffect(() => {
    if (step === 'success') {
      // We keep the session until the user navigates away
      // This allows them to see their booking details
    }
  }, [step]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !spot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Parking spot not found'}
          </h2>
          <p className="text-gray-600 mb-6">
            We couldn't find the parking spot you're looking for. It may have been removed or the ID is incorrect.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }


  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Success Header */}
          <div className="bg-green-50 p-6 text-center border-b">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Booking Successful!
            </h2>
            <p className="text-green-700">
              Your parking spot has been reserved
            </p>
          </div>

          <div className="p-6">
            {/* Booking Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">{spot.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{spot.address}</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{startDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Start Time:</span>
                <span className="font-medium">{startTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">End Time:</span>
                <span className="font-medium">{endTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{calculateDuration().toFixed(1)} hours</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200 mt-2">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-lg">฿{calculateTotal()}</span>
              </div>
            </div>

            {/* Payment Status */}
            <div className="bg-yellow-50 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-yellow-800 mb-1">Payment Verification Pending</h4>
                  <p className="text-sm text-yellow-700">
                    Your payment slip has been uploaded and is being processed. The booking will be confirmed once the payment is verified.
                  </p>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="bg-blue-50 rounded-lg p-4 mb-4 text-center">
              <h4 className="font-semibold text-blue-900 mb-3">Entry QR Code</h4>
              <QRCodeGenerator 
                bookingId={bookingId} 
                spotId={id}
                size={160}
                className="mb-3"
                id="booking-qr-code"
              />
              <p className="text-sm text-blue-700 mb-3">
                Show this QR code at the parking spot for verification. This QR code is specific to your booking and parking spot.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={downloadQR}
                  className="flex-1 flex items-center justify-center space-x-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Save QR</span>
                </button>
                {/* <button
                  onClick={() => copyToClipboard(qrCode, 'QR Code')}
                  className="flex-1 flex items-center justify-center space-x-1 border border-blue-200 text-blue-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </button> */}
              </div>
            </div>

            {/* PIN Backup */}
            <div className="bg-orange-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <QrCode className="h-5 w-5 text-orange-600" />
                  <span className="font-semibold text-orange-900">Backup PIN</span>
                </div>
                <button
                  onClick={() => copyToClipboard(pin, 'PIN')}
                  className="p-1 hover:bg-orange-100 rounded transition-colors"
                >
                  <Copy className="h-4 w-4 text-orange-600" />
                </button>
              </div>
              <div className="text-3xl font-bold text-orange-900 text-center mb-2 font-mono tracking-wider">
                {pin}
              </div>
              <p className="text-sm text-orange-700 text-center">
                Use this PIN if QR code doesn't work - specific to this booking and spot
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button 
                onClick={navigateToParking}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Navigation className="h-5 w-5" />
                <span>Navigate to Parking</span>
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => {
                    clearBookingSession();
                    navigate('/bookings');
                  }}
                  className="border border-gray-200 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  My Bookings
                </button>
                <button 
                  onClick={() => {
                    clearBookingSession();
                    navigate('/');
                  }}
                  className="border border-gray-200 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  Book More
                </button>
              </div>
            </div>

            {/* Booking ID */}
            <div className="mt-4 pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">
                Booking ID: <span className="font-mono">{bookingId}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Progress Indicator */}
          <div className="bg-gray-50 px-6 py-4">
            <div className="flex items-center">
              <div className={`flex items-center space-x-2 ${
                step === 'time' ? 'text-blue-600' : 'text-green-600'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step === 'time' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                }`}>
                  {step === 'time' ? '1' : <Check className="h-4 w-4" />}
                </div>
                <span className="text-sm font-medium">Select Time</span>
              </div>
              <div className="flex-1 h-px bg-gray-300 mx-2"></div>
              <div className={`flex items-center space-x-2 ${
                step === 'payment' ? 'text-blue-600' : (step === 'upload' || step === 'success') ? 'text-green-600' : 'text-gray-400'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step === 'payment' ? 'bg-blue-600 text-white' : 
                  (step === 'upload' || step === 'success') ? 'bg-green-600 text-white' : 
                  'bg-gray-300 text-gray-600'
                }`}>
                  {step === 'payment' ? '2' : (step === 'upload' || step === 'success') ? <Check className="h-4 w-4" /> : '2'}
                </div>
                <span className="text-sm font-medium">Payment</span>
              </div>
              <div className="flex-1 h-px bg-gray-300 mx-2"></div>
              <div className={`flex items-center space-x-2 ${
                step === 'upload' ? 'text-blue-600' : step === 'success' ? 'text-green-600' : 'text-gray-400'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step === 'upload' ? 'bg-blue-600 text-white' : 
                  step === 'success' ? 'bg-green-600 text-white' : 
                  'bg-gray-300 text-gray-600'
                }`}>
                  {step === 'upload' ? '3' : step === 'success' ? <Check className="h-4 w-4" /> : '3'}
                </div>
                <span className="text-sm font-medium">Verification</span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Parking Spot Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-1">{spot.name}</h3>
              <p className="text-sm text-gray-600">{spot.address}</p>
              <p className="text-sm text-blue-600 font-medium">
                ฿{spot.price}/{spot.price_type || 'hour'}
              </p>
            </div>

            {step === 'time' && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Select Parking Time
                </h2>
                <div className="space-y-6">
                  {/* Date Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  {/* Time Slot Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Time Slots
                    </label>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <h4 className="font-medium text-blue-900 mb-2 text-sm">Booking Rules</h4>
                      <ul className="text-xs text-blue-800 space-y-1">
                        <li>• You can only select consecutive time slots</li>
                        <li>• Booking is allowed only if more than 30 minutes remain until slot ends</li>
                        <li>• Pricing: Full price if ≥60min remaining, prorated if 30-59min remaining</li>
                        <li>• Prorated = Half price + proportional extra (minimum 50% of base price)</li>
                        <li>• Base price: ฿{spot.price}/hour</li>
                      </ul>
                    </div>

                    {/* Status Legend */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                          <span>Available</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                          <span>Limited</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                          <span>Full</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gray-200 border border-gray-300 rounded"></div>
                          <span>Unavailable</span>
                        </div>
                      </div>
                    </div>

                    {(!isOpen || slots.length === 0) ? (
                      <div className="p-4 bg-red-50 rounded-lg text-center text-red-600 font-semibold">
                        ปิดให้บริการ
                      </div>
                    ) : (
                      <>
                        {/* Mobile Horizontal Scroll Layout */}
                        <div className="block sm:hidden">
                          <div className="flex overflow-x-auto space-x-3 pb-4 scrollbar-hide">
                            {slots.map((slot) => {
                              const isBooked = isSlotBooked(slot);
                              const isSelected = selectedSlots.includes(slot.start);

                              const [year, month, day] = startDate.split('-').map(Number);
                              const [hour, minute] = slot.start.split(':').map(Number);
                              const slotStartDateTime = new Date(year, month - 1, day, hour, minute, 0);
                              const slotEndDateTime = new Date(slotStartDateTime.getTime() + 60 * 60 * 1000);
                              const now = new Date();
                              
                              // For all slots, check if current time has passed the end of the slot
                              // This allows booking as long as there's time left in the slot
                              const isPast = slotEndDateTime <= now;
                              
                              // Debug log for midnight and early morning slots
                              if (slot.start === '00:00' || slot.start === '01:00') {
                                console.log(`BookingPage isPast debug for ${slot.start} (mobile):`, {
                                  startDate,
                                  slotStart: slot.start,
                                  now: now.toISOString(),
                                  slotStartTime: slotStartDateTime.toISOString(),
                                  slotEndTime: slotEndDateTime.toISOString(),
                                  isPast: slotEndDateTime <= now,
                                  remainingMinutes: Math.floor((slotEndDateTime.getTime() - now.getTime()) / (1000 * 60))
                                });
                              }
                              const hasMinTime = hasMinimumTime(slot.start);
                              const isDisabled = isBooked || isPast || !hasMinTime;

                              // Debug log for specific slot
                              if (slot.start === '00:00' || slot.start === '01:00') {
                                console.log(`Debug ${slot.start} slot:`, {
                                  slotStart: slot.start,
                                  currentTime: now.toTimeString(),
                                  slotStartTime: slotStartDateTime.toTimeString(),
                                  slotEndTime: slotEndDateTime.toTimeString(),
                                  isPast,
                                  hasMinTime,
                                  isBooked,
                                  isDisabled,
                                  remainingTimeUntilEnd: getRemainingTimeInSlot(slot.start)
                                });
                              }

                              return (
                                <div key={slot.start} className="flex-none w-28 relative">
                                  {/* Prorated pricing indicator */}
                                  {!isDisabled && getRemainingTimeInSlot(slot.start) < 60 && getRemainingTimeInSlot(slot.start) >= 30 && (
                                    <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1 py-0.5 rounded-full text-[10px] font-bold z-10">
                                      $
                                    </div>
                                  )}

                                  <TimeSlotAvailability
                                    spotId={spot?.id || ''}
                                    totalSlots={spot?.totalSlots || 1}
                                    date={startDate}
                                    timeSlot={slot.start}
                                    isBooked={isDisabled}
                                    isSelected={isSelected}
                                    onClick={() => !isDisabled ? toggleSlot(slot.start) : undefined}
                                    className="h-16"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <div className="text-xs text-gray-500 text-center mt-2">
                            ← Swipe to see more time slots →
                          </div>
                        </div>

                        {/* Tablet and Desktop Grid Layout */}
                        <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                          {slots.map((slot) => {
                            const isBooked = isSlotBooked(slot);
                            const isSelected = selectedSlots.includes(slot.start);

                            const [year, month, day] = startDate.split('-').map(Number);
                            const [hour, minute] = slot.start.split(':').map(Number);
                            const slotStartDateTime = new Date(year, month - 1, day, hour, minute, 0);
                            const slotEndDateTime = new Date(slotStartDateTime.getTime() + 60 * 60 * 1000);
                            const now = new Date();
                            
                            // For all slots, check if current time has passed the end of the slot
                            // This allows booking as long as there's time left in the slot
                            const isPast = slotEndDateTime <= now;
                            
                            // Debug log for midnight and early morning slots
                            if (slot.start === '00:00' || slot.start === '01:00') {
                              console.log(`BookingPage isPast debug for ${slot.start} (desktop):`, {
                                startDate,
                                slotStart: slot.start,
                                now: now.toISOString(),
                                slotStartTime: slotStartDateTime.toISOString(),
                                slotEndTime: slotEndDateTime.toISOString(),
                                isPast: slotEndDateTime <= now,
                                remainingMinutes: Math.floor((slotEndDateTime.getTime() - now.getTime()) / (1000 * 60))
                              });
                            }
                            const hasMinTime = hasMinimumTime(slot.start);
                            const isDisabled = isBooked || isPast || !hasMinTime;

                            // Debug log for specific slot
                            if (slot.start === '00:00' || slot.start === '01:00') {
                              console.log(`Debug ${slot.start} slot (desktop):`, {
                                slotStart: slot.start,
                                currentTime: now.toTimeString(),
                                slotStartTime: slotStartDateTime.toTimeString(),
                                slotEndTime: slotEndDateTime.toTimeString(),
                                isPast,
                                hasMinTime,
                                isBooked,
                                isDisabled,
                                remainingTimeUntilEnd: getRemainingTimeInSlot(slot.start)
                              });
                            }

                            return (
                              <div key={slot.start} className="relative">
                                {/* Prorated pricing indicator */}
                                {!isDisabled && getRemainingTimeInSlot(slot.start) < 60 && getRemainingTimeInSlot(slot.start) >= 30 && (
                                  <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1 py-0.5 rounded-full text-[10px] font-bold z-10">
                                    $
                                  </div>
                                )}

                                <TimeSlotAvailability
                                  key={slot.start}
                                  spotId={spot?.id || ''}
                                  totalSlots={spot?.totalSlots || 1}
                                  date={startDate}
                                  timeSlot={slot.start}
                                  isBooked={isDisabled}
                                  isSelected={isSelected}
                                  onClick={() => !isDisabled ? toggleSlot(slot.start) : undefined}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Selected Slots Summary */}
                  {selectedSlots.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Selected Time Slots</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedSlots.map((slot) => (
                          <span key={slot} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {slot}
                            <button
                              onClick={() => toggleSlot(slot)}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      {startTime && endTime && (
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-blue-700">Start Time:</span>
                              <span className="font-medium text-blue-800">{startTime}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-blue-700">End Time:</span>
                              <span className="font-medium text-blue-800">{endTime}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-blue-700">Duration:</span>
                              <span className="font-medium text-blue-800">{calculateDuration().toFixed(1)} hours</span>
                            </div>
                            {selectedSlots.some(slot => getRemainingTimeInSlot(slot) < 60) && (
                              <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded mt-2">
                                <div className="font-medium mb-1">⚠️ Prorated pricing applied:</div>
                                {selectedSlots.map(slot => {
                                  const remaining = getRemainingTimeInSlot(slot);
                                  if (remaining < 60 && remaining >= 30) {
                                    const price = calculateSlotPrice(slot);
                                    return (
                                      <div key={slot} className="text-xs">
                                        {slot}: {remaining}min remaining = ฿{price.toFixed(2)} (Half price + extra)
                                      </div>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Vehicle Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Car className="inline h-4 w-4 mr-1" />
                      Select Vehicle
                    </label>
                    
                    {vehiclesLoading ? (
                      <div className="flex items-center space-x-2 text-gray-500 text-sm">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                        <span>Loading vehicles...</span>
                      </div>
                    ) : vehicles.length > 0 ? (
                      <select
                        value={selectedVehicle}
                        onChange={(e) => setSelectedVehicle(e.target.value)}
                        className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        {vehicles.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.make} {vehicle.model} - {vehicle.license_plate}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">No vehicles found</p>
                            <p className="text-xs text-yellow-700 mt-1">
                              Please add a vehicle in your profile before booking.
                            </p>
                            <button 
                              onClick={() => navigate('/profile')}
                              className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                              Go to Profile
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cost Summary */}
                  {selectedSlots.length > 0 && startTime && endTime && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Booking Summary</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-blue-700">Duration:</span>
                          <span className="font-medium text-blue-900">{calculateDuration().toFixed(1)} hours</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-blue-700">Rate:</span>
                          <span className="font-medium text-blue-900">฿{spot.price}/{spot.price_type || 'hour'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-blue-700">Time slots:</span>
                          <span className="font-medium text-blue-900">{selectedSlots.length} slots</span>
                        </div>
                        <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
                          <span className="text-base font-semibold text-blue-900">Total Cost:</span>
                          <span className="text-2xl font-bold text-blue-900">฿{calculateTotal()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {step === 'payment' && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Payment Details
                </h2>

                <div className="space-y-6">
                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Payment Method
                    </label>
                    <div className="space-y-2">
                      {/* QR Payment - Only available option */}
                      <label className="flex items-center p-3 border-2 border-blue-500 bg-blue-50 rounded-lg cursor-pointer">
                        <input
                          type="radio"
                          name="payment"
                          value="qr_code"
                          checked={paymentMethod === 'qr_code'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="mr-3"
                        />
                        <div className="flex items-center space-x-2">
                          <QrCode className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-800">QR Payment (PromptPay)</span>
                        </div>
                      </label>
                      
                      {/* Credit Card - Disabled */}
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg bg-gray-100 opacity-60 cursor-not-allowed">
                        <input
                          type="radio"
                          name="payment"
                          value="card"
                          disabled
                          className="mr-3"
                        />
                        <div className="flex items-center space-x-2 text-gray-500">
                          <CreditCard className="h-5 w-5" />
                          <span>Credit/Debit Card (Unavailable)</span>
                        </div>
                      </label>
                      
                      {/* E-Wallet - Disabled */}
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg bg-gray-100 opacity-60 cursor-not-allowed">
                        <input
                          type="radio"
                          name="payment"
                          value="wallet"
                          disabled
                          className="mr-3"
                        />
                        <div className="flex items-center space-x-2 text-gray-500">
                          <Car className="h-5 w-5" />
                          <span>E-Wallet (Unavailable)</span>
                        </div>
                      </label>
                    </div>
                    
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-yellow-700">
                          Currently, only QR payment is available. Other payment methods will be available soon.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Instructions */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-3">Payment Instructions</h4>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center text-blue-700 font-medium flex-shrink-0">1</div>
                        <div>
                          <p className="text-sm text-blue-800 font-medium">Scan the QR code below with your banking app</p>
                          <div className="mt-2 bg-white p-3 rounded-lg flex justify-center">
                            {paymentMethodsLoading ? (
                              <div className="h-40 w-40 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              </div>
                            ) : ownerPaymentMethod && ownerPaymentMethod.qr_code_url ? (
                              <div className="relative cursor-pointer group" onClick={() => setShowQRCodeOverlay(true)}>
                                <img 
                                  src={ownerPaymentMethod.qr_code_url} 
                                  alt="Payment QR Code" 
                                  className="h-40 w-40 object-contain"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center transition-all duration-200">
                                  <div className="bg-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Image className="h-5 w-5 text-gray-700" />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="h-40 w-40 flex flex-col items-center justify-center bg-gray-100 rounded-lg">
                                <QrCode className="h-10 w-10 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500 text-center">
                                  QR code not available.<br/>Please contact the owner.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center text-blue-700 font-medium flex-shrink-0">2</div>
                        <div>
                          <p className="text-sm text-blue-800 font-medium">Transfer the exact amount: ${calculateTotal()}</p>
                          <p className="text-xs text-blue-700 mt-1">Make sure to include the booking reference in the payment notes</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center text-blue-700 font-medium flex-shrink-0">3</div>
                        <div>
                          <p className="text-sm text-blue-800 font-medium">Take a screenshot of your payment confirmation</p>
                          <p className="text-xs text-blue-700 mt-1">You'll need to upload this in the next step</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Booking Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Booking Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span>{startDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Start Time:</span>
                        <span>{startTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>End Time:</span>
                        <span>{endTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span>{calculateDuration().toFixed(1)} hours</span>
                      </div>
                      {selectedSlots.length > 0 && (
                        <div className="flex justify-between">
                          <span>Selected Slots:</span>
                          <span>{selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {selectedSlots.some(slot => getRemainingTimeInSlot(slot) < 60) && (
                        <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                          ⚠️ Prorated pricing applied due to partial time remaining in some slots
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-base pt-2 border-t">
                        <span>Total:</span>
                        <span>${calculateTotal()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 'upload' && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Upload Payment Confirmation
                </h2>

                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Please upload your payment confirmation</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Take a screenshot of your payment confirmation and upload it here. This will be used to verify your payment.
                        </p>
                      </div>
                    </div>
                  </div>

                  {paymentSlipUrl ? (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Payment Slip Uploaded</h4>
                        <Check className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="bg-gray-100 rounded-lg overflow-hidden">
                        <img 
                          src={paymentSlipUrl} 
                          alt="Payment Confirmation" 
                          className="w-full h-48 object-contain"
                        />
                      </div>
                      <div className="mt-3 text-sm text-gray-600">
                        Your payment is being verified. This usually takes a few minutes.
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                      onClick={() => setShowPaymentSlipUpload(true)}
                    >
                      <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-700 font-medium mb-1">Click to upload payment confirmation</p>
                      <p className="text-sm text-gray-500">
                        Supported formats: JPG, PNG, GIF (Max 5MB)
                      </p>
                    </div>
                  )}

                  {/* Booking Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Booking Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span>{startDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Start Time:</span>
                        <span>{startTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>End Time:</span>
                        <span>{endTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span>{calculateDuration().toFixed(1)} hours</span>
                      </div>
                      {selectedSlots.length > 0 && (
                        <div className="flex justify-between">
                          <span>Selected Slots:</span>
                          <span>{selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-base pt-2 border-t">
                        <span>Total:</span>
                        <span>${calculateTotal()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4">
              {step === 'payment' && (
                <button
                  onClick={() => setStep('time')}
                  className="flex-1 border border-gray-200 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              )}
              
              {step === 'upload' && (
                <button
                  onClick={() => setStep('payment')}
                  className="flex-1 border border-gray-200 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              )}
              
              {(step === 'time' || step === 'payment') && (
                <button
                  onClick={handleBooking}
                  disabled={
                    (step === 'time' && (
                      !startDate || !startTime || !endTime || !selectedVehicle ||
                      isSlotBooked({ start: startTime, end: endTime }) || startTime >= endTime
                    )) ||
                    (step === 'payment' && !paymentMethod) ||
                    vehicles.length === 0
                  }
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {step === 'time' ? 'Proceed to Payment' : 'Proceed to Upload Slip'}
                </button>
              )}
              
              {step === 'upload' && paymentSlipUrl && (
                <button
                  onClick={() => setStep('success')}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Complete Booking
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Slip Upload Modal */}
      {showPaymentSlipUpload && createdBookingId && (
        <PaymentSlipUpload 
          bookingId={createdBookingId}
          onUploadComplete={handlePaymentSlipUpload}
          onClose={() => setShowPaymentSlipUpload(false)}
        />
      )}

      {/* QR Code Overlay */}
      {showQRCodeOverlay && ownerPaymentMethod && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowQRCodeOverlay(false)}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Scan QR Code</h3>
              <button 
                onClick={() => setShowQRCodeOverlay(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="text-center">
              <img 
                src={ownerPaymentMethod.qr_code_url} 
                alt="Payment QR Code" 
                className="max-w-full h-auto mx-auto rounded-lg"
              />
              <p className="mt-4 text-gray-700">
                Scan this QR code with your banking app to make a payment of ${calculateTotal()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};