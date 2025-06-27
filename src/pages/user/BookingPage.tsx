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
  AlertCircle,
  Upload,
  Image,
  X
} from 'lucide-react';
import { supabase, saveBookingSession, getBookingSession, clearBookingSession } from '../../lib/supabase';
import { ParkingSpot, Vehicle, PaymentMethod } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { PaymentSlipUpload } from '../../components/PaymentSlipUpload';
import { QRCodeGenerator } from '../../components/QRCodeGenerator';
import { TimeSlotAvailability } from '../../components/TimeSlotAvailability';

export const BookingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<'type' | 'time' | 'payment' | 'upload' | 'success'>('type');
  const [bookingType, setBookingType] = useState<'hourly' | 'daily' | 'monthly'>('hourly');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [startDate, setStartDate] = useState(() => {
    // Get today's date in Thailand timezone
    const now = new Date();
    const thailandTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
    return thailandTime.toISOString().split('T')[0];
  });
  const [spot, setSpot] = useState<ParkingSpot | null>(null);
  
  // Set default times (1 hour from now for start, 3 hours from now for end)
  const getDefaultTimes = () => {
    // Get current time in Thailand timezone (GMT+7)
    const now = new Date();
    const thailandTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
    
    const startTime = new Date(thailandTime.getTime() + 60 * 60 * 1000); // 1 hour from now
    const endTime = new Date(thailandTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now
    
    return {
      start: startTime.toTimeString().substring(0, 5),
      end: endTime.toTimeString().substring(0, 5)
    };
  };
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]); // For daily booking
  const [endDate, setEndDate] = useState(''); // For monthly booking
  const [monthsToBook, setMonthsToBook] = useState(1); // Number of months for monthly booking
  const [monthlyConflicts, setMonthlyConflicts] = useState<string[]>([]); // Booked days in monthly period
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Start from today for daily booking
    const now = new Date();
    const thailandTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
    return thailandTime.toISOString().split('T')[0];
  });
  
  // Function to toggle day selection for daily booking (updated to work with TimeSlotAvailability)
  function toggleDay(date: string) {
    // Prevent selection of past dates
    if (isDayPast(date)) {
      return;
    }
    
    setSelectedDays((prev) => {
      if (prev.includes(date)) {
        // Remove the day
        return prev.filter((d) => d !== date);
      } else {
        // Add the day - let TimeSlotAvailability handle availability checking
        return [...prev, date].sort();
      }
    });
  }

  // Generate week dates for daily booking
  function generateWeekDates(weekStart: string) {
    const dates = [];
    const start = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }

  // Generate day slots for daily booking (similar to time slots but for days)
  function generateDaySlots(weekStart: string) {
    const dates = generateWeekDates(weekStart);
    return dates.map(date => {
      const dateObj = new Date(date);
      return {
        date: date,
        displayTime: dateObj.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        }),
        dayNumber: dateObj.getDate(),
        dayName: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
        monthName: dateObj.toLocaleDateString('en-US', { month: 'long' }),
        isPast: isDayPast(date)
      };
    });
  }

  // Helper function to check if a day is in the past
  function isDayPast(date: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return date < today;
  }



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
    // Get current time in Thailand timezone
    const now = new Date();
    const thailandTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
    
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
        now: thailandTime.toISOString(),
        slotStart: slotStartDateTime.toISOString(),
        slotEnd: slotEndDateTime.toISOString(),
        remainingMs: slotEndDateTime.getTime() - thailandTime.getTime(),
        remainingMinutes: Math.floor((slotEndDateTime.getTime() - thailandTime.getTime()) / (1000 * 60)),
        hasMinTime: Math.floor((slotEndDateTime.getTime() - thailandTime.getTime()) / (1000 * 60)) >= 30
      });
    }
    
    // Check if there are at least 30 minutes remaining until the slot ends
    const remainingMs = slotEndDateTime.getTime() - now.getTime();
    const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
    
    return remainingMinutes >= 30;
  }

  // Helper function to calculate remaining time until END of slot (in minutes)
  function getRemainingTimeInSlot(slotStart: string): number {
    // Get current time in Thailand timezone
    const now = new Date();
    const thailandTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
    
    // Parse date and time more reliably
    const [year, month, day] = startDate.split('-').map(Number);
    const [hour, minute] = slotStart.split(':').map(Number);
    
    // Create date in local timezone to avoid timezone issues
    const slotStartDateTime = new Date(year, month - 1, day, hour, minute, 0);
    // Calculate end time of the slot (1 hour later)
    const slotEndDateTime = new Date(slotStartDateTime.getTime() + 60 * 60 * 1000);
    
    const remainingMs = slotEndDateTime.getTime() - thailandTime.getTime();
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
  const [dayAvailability, setDayAvailability] = useState<{[date: string]: {booked: number, available: number}}>({});
  const [monthlyAvailability, setMonthlyAvailability] = useState<{[date: string]: {booked: number, available: number}}>({});
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

  // Function to fetch booked days for monthly booking period
  const fetchMonthlyBookedDays = async () => {
    if (!spot || bookingType !== 'monthly' || !startDate || !endDate) return [];
    
    console.log('Fetching monthly availability for period:', { startDate, endDate });
    
    // Convert dates to UTC for database query
    const startDateUTC = new Date(`${startDate}T00:00:00+07:00`).toISOString();
    const endDateUTC = new Date(`${endDate}T23:59:59+07:00`).toISOString();
    
    console.log('Monthly query range:', {
      startLocal: startDate,
      endLocal: endDate,
      startUTC: startDateUTC,
      endUTC: endDateUTC
    });
    
    const { data, error } = await supabase
      .from('bookings')
      .select('start_time, end_time, status, id, user_id, booking_type')
      .eq('spot_id', spot.id)
      .in('status', ['confirmed', 'active', 'pending'])
      .or(`and(start_time.lte.${endDateUTC},end_time.gte.${startDateUTC})`);
      
    if (error) {
      console.error('Error fetching monthly availability:', error);
      return [];
    }
    
    // Generate all dates in the monthly period
    const allDates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      allDates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    // Calculate availability for each day
    const availability: {[date: string]: {booked: number, available: number}} = {};
    const totalSlots = spot.total_slots || 1;
    
    // Initialize all dates with full availability
    allDates.forEach(date => {
      availability[date] = { booked: 0, available: totalSlots };
    });
    
    const bookedDaysList: string[] = [];
    
    if (data) {
      console.log('Raw monthly booking data:', data);
      
      data.forEach((booking: any) => {
        // Convert UTC dates to Thailand timezone for comparison
        const startDateUTC = new Date(booking.start_time);
        const endDateUTC = new Date(booking.end_time);
        
        // Convert to Thailand timezone (GMT+7)
        const startDateTH = new Date(startDateUTC.getTime() + (7 * 60 * 60 * 1000));
        const endDateTH = new Date(endDateUTC.getTime() + (7 * 60 * 60 * 1000));
        
        console.log('Processing monthly booking:', {
          id: booking.id,
          type: booking.booking_type,
          startUTC: booking.start_time,
          endUTC: booking.end_time,
          startTH: startDateTH.toISOString(),
          endTH: endDateTH.toISOString(),
          startDateStr: startDateTH.toISOString().split('T')[0],
          endDateStr: endDateTH.toISOString().split('T')[0]
        });
        
        // Count bookings that affect each day
        if (booking.booking_type === 'daily' || booking.booking_type === 'monthly') {
          // For daily/monthly bookings, they take up 1 slot for the entire duration
          const current = new Date(startDateTH);
          while (current <= endDateTH) {
            const dateStr = current.toISOString().split('T')[0];
            if (allDates.includes(dateStr) && availability[dateStr]) {
              availability[dateStr].booked += 1;
              availability[dateStr].available = Math.max(0, totalSlots - availability[dateStr].booked);
              console.log(`Updated monthly availability for ${dateStr}:`, availability[dateStr]);
            }
            current.setDate(current.getDate() + 1);
          }
        } else if (booking.booking_type === 'hourly') {
          // For hourly bookings, they only take up 1 slot for the specific day
          const dateStr = startDateTH.toISOString().split('T')[0];
          if (allDates.includes(dateStr) && availability[dateStr]) {
            availability[dateStr].booked += 1;
            availability[dateStr].available = Math.max(0, totalSlots - availability[dateStr].booked);
            console.log(`Updated monthly availability for ${dateStr} (hourly):`, availability[dateStr]);
          }
        }
        
        // Add to booked days list if fully booked
        const dateStr = startDateTH.toISOString().split('T')[0];
        if (allDates.includes(dateStr) && availability[dateStr]?.available <= 0 && !bookedDaysList.includes(dateStr)) {
          bookedDaysList.push(dateStr);
        }
      });
      
      console.log('Monthly availability calculated:', availability);
      console.log('Monthly booking conflicts found:', bookedDaysList);
    }
    
    setMonthlyAvailability(availability);
    return bookedDaysList;
  };

  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!spot || !startDate) return;
      
      console.log('Fetching booked slots for:', {
        spotId: spot.id,
        date: startDate,
        dateRange: `${startDate}T00:00:00 to ${startDate}T23:59:59`
      });
      
      const { data, error } = await supabase
        .from('bookings')
        .select('start_time, end_time, status, id, user_id')
        .eq('spot_id', spot.id)
        .in('status', ['confirmed', 'active', 'pending']) // เพิ่ม pending
        .gte('start_time', `${startDate}T00:00:00`)
        .lt('start_time', `${startDate}T23:59:59`);
        
      if (error) {
        console.error('Error fetching booked slots:', error);
        return;
      }
      
      if (data) {
        console.log('Raw booking data:', data);
        const processedSlots = data.map((b: any) => ({
          start: b.start_time.slice(11, 16),
          end: b.end_time.slice(11, 16),
          status: b.status,
          bookingId: b.id,
          userId: b.user_id
        }));
        console.log('Processed booked slots:', processedSlots);
        setBookedSlots(processedSlots.map(slot => ({ start: slot.start, end: slot.end })));
      }
    };

    // Function to fetch booked days for daily booking
    const fetchBookedDays = async () => {
      if (!spot || bookingType !== 'daily') return;
      
      // Get the current week dates to check
      const weekDates = generateWeekDates(currentWeekStart);
      console.log('Fetching availability for week:', weekDates);
      
      // Convert week dates to UTC for database query (subtract 7 hours)
      const startDateUTC = new Date(`${weekDates[0]}T00:00:00+07:00`).toISOString();
      const endDateUTC = new Date(`${weekDates[weekDates.length - 1]}T23:59:59+07:00`).toISOString();
      
      console.log('Query range:', {
        weekDatesLocal: weekDates,
        startUTC: startDateUTC,
        endUTC: endDateUTC
      });
      
      const { data, error } = await supabase
        .from('bookings')
        .select('start_time, end_time, status, id, user_id, booking_type')
        .eq('spot_id', spot.id)
        .in('status', ['confirmed', 'active', 'pending'])
        .gte('start_time', startDateUTC)
        .lte('end_time', endDateUTC);
        
      if (error) {
        console.error('Error fetching booked days:', error);
        return;
      }
      
      if (data) {
        console.log('Raw daily booking data:', data);
        
        // Calculate availability for each day
        const availability: {[date: string]: {booked: number, available: number}} = {};
        const totalSlots = spot.total_slots || 1;
        
        // Initialize all week dates with full availability
        weekDates.forEach(date => {
          availability[date] = { booked: 0, available: totalSlots };
        });
        
        data.forEach((booking: any) => {
          // Convert UTC dates to Thailand timezone for comparison
          const startDateUTC = new Date(booking.start_time);
          const endDateUTC = new Date(booking.end_time);
          
          // Convert to Thailand timezone (GMT+7)
          const startDateTH = new Date(startDateUTC.getTime() + (7 * 60 * 60 * 1000));
          const endDateTH = new Date(endDateUTC.getTime() + (7 * 60 * 60 * 1000));
          
          console.log('Processing booking:', {
            id: booking.id,
            type: booking.booking_type,
            startUTC: booking.start_time,
            endUTC: booking.end_time,
            startTH: startDateTH.toISOString(),
            endTH: endDateTH.toISOString(),
            startDateStr: startDateTH.toISOString().split('T')[0],
            endDateStr: endDateTH.toISOString().split('T')[0]
          });
          
          // Count bookings that affect each day
          if (booking.booking_type === 'daily' || booking.booking_type === 'monthly') {
            // For daily/monthly bookings, they take up 1 slot for the entire duration
            const current = new Date(startDateTH);
            while (current <= endDateTH) {
              const dateStr = current.toISOString().split('T')[0];
              if (weekDates.includes(dateStr) && availability[dateStr]) {
                availability[dateStr].booked += 1;
                availability[dateStr].available = Math.max(0, totalSlots - availability[dateStr].booked);
                console.log(`Updated availability for ${dateStr}:`, availability[dateStr]);
              }
              current.setDate(current.getDate() + 1);
            }
          } else if (booking.booking_type === 'hourly') {
            // For hourly bookings, they only take up 1 slot for the specific day
            const dateStr = startDateTH.toISOString().split('T')[0];
            if (weekDates.includes(dateStr) && availability[dateStr]) {
              availability[dateStr].booked += 1;
              availability[dateStr].available = Math.max(0, totalSlots - availability[dateStr].booked);
              console.log(`Updated availability for ${dateStr} (hourly):`, availability[dateStr]);
            }
          }
        });
        
        console.log('Final daily availability:', availability);
        setDayAvailability(availability);
        
        // Update bookedDays to only include fully booked days (for backward compatibility)
        const fullyBookedDays = weekDates.filter(date => availability[date]?.available <= 0);
        console.log('Fully booked days:', fullyBookedDays);
      }
    };

    if (bookingType === 'hourly') {
      // Reset other availability data when switching to hourly
      setDayAvailability({});
      setMonthlyAvailability({});
      fetchBookedSlots();
    } else if (bookingType === 'daily') {
      // Reset other availability data when switching to daily
      setMonthlyAvailability({});
      setMonthlyConflicts([]);
      fetchBookedDays();
    } else if (bookingType === 'monthly') {
      // Reset daily availability data when switching to monthly
      setDayAvailability({});
    }
  }, [spot, startDate, bookingType, currentWeekStart]);

  // Separate useEffect for monthly booking conflicts
  useEffect(() => {
    const checkMonthlyConflicts = async () => {
      if (bookingType === 'monthly' && startDate && endDate) {
        const conflicts = await fetchMonthlyBookedDays();
        setMonthlyConflicts(conflicts);
      } else {
        setMonthlyConflicts([]);
      }
    };

    checkMonthlyConflicts();
  }, [spot, startDate, endDate, bookingType, monthsToBook]);



  function isSlotBooked(slot: { start: string, end: string }) {
    // If start time >= end time, no need to check
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
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [paymentSlipUrl, setPaymentSlipUrl] = useState<string | null>(null);
  const [ownerPaymentMethod, setOwnerPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  const [showPaymentSlipUpload, setShowPaymentSlipUpload] = useState(false);
  const [showQRCodeOverlay, setShowQRCodeOverlay] = useState(false);
  const [showSessionRestoreDialog, setShowSessionRestoreDialog] = useState(false);
  const [pendingSession, setPendingSession] = useState<any>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Check for existing booking session on mount
  useEffect(() => {
    const session = getBookingSession();
    console.log('Checking for existing session:', session);
    
    if (session && session.spotId === id) {
      console.log('Found existing session for spot:', id, 'with step:', session.step);
      
      // If booking is completed (success step), redirect to bookings page
      if (session.step === 'success') {
        console.log('Booking already completed, redirecting to bookings page');
        clearBookingSession(); // Clear completed session
        navigate('/bookings');
        return;
      }
      
      // Don't show restore dialog if the user is still on the type selection step
      // or if the session is from type step - just clear it and start fresh
      if (session.step === 'type' || !session.step) {
        console.log('Session is on type step, clearing and starting fresh');
        clearBookingSession();
        setIsInitializing(false);
      } else {
        // Show confirmation dialog for incomplete bookings beyond type step
        setPendingSession(session);
        setShowSessionRestoreDialog(true);
        setIsInitializing(false);
      }
    } else {
      console.log('No existing session found, creating new booking');
      // Generate new booking ID, QR code and PIN with unique identifiers
      const newBookingId = 'BK' + Date.now();
      const newQrCode = `BK-${id}-${crypto.randomUUID()}`;
      const newPin = generateSecurePin(newBookingId, id || '');
      
      setBookingId(newBookingId);
      setQrCode(newQrCode);
      setPin(newPin);
      
      // Allow saving session after initial setup is done
      setTimeout(() => {
        setIsInitializing(false);
      }, 100);
    }
  }, [id]);

  const handleRestoreSession = () => {
    if (pendingSession) {
      console.log('Starting session restore process');
      
      // If booking is already completed, redirect to bookings page instead
      if (pendingSession.step === 'success') {
        console.log('Booking already completed in restore, redirecting to bookings page');
        clearBookingSession();
        setShowSessionRestoreDialog(false);
        setPendingSession(null);
        navigate('/bookings');
        return;
      }
      
      setIsRestoringSession(true);
      
      // Restore session state
      setBookingType(pendingSession.bookingType || 'hourly');
      setStartDate(pendingSession.startDate || startDate);
      setMonthsToBook(pendingSession.monthsToBook || 1);
      
      // For monthly booking, auto-calculate end date based on months
      if (pendingSession.bookingType === 'monthly' && pendingSession.startDate) {
        const months = pendingSession.monthsToBook || 1;
        const start = new Date(pendingSession.startDate);
        const end = new Date(start);
        end.setMonth(start.getMonth() + months);
        setEndDate(end.toISOString().split('T')[0]);
      } else {
        setEndDate(pendingSession.endDate || '');
      }
      
      setStartTime(pendingSession.startTime || startTime);
      setEndTime(pendingSession.endTime || endTime);
      setSelectedVehicle(pendingSession.selectedVehicle || '');
      
      // Restore selected slots and days
      if (pendingSession.selectedSlots && Array.isArray(pendingSession.selectedSlots)) {
        setSelectedSlots(pendingSession.selectedSlots);
      }
      if (pendingSession.selectedDays && Array.isArray(pendingSession.selectedDays)) {
        setSelectedDays(pendingSession.selectedDays);
      }
      if (pendingSession.currentWeekStart) {
        setCurrentWeekStart(pendingSession.currentWeekStart);
      }
      
      if (pendingSession.createdBookingId) {
        setCreatedBookingId(pendingSession.createdBookingId);
      }
      
      if (pendingSession.paymentSlipUrl) {
        setPaymentSlipUrl(pendingSession.paymentSlipUrl);
      }
      
      if (pendingSession.bookingId) {
        setBookingId(pendingSession.bookingId);
      }
      
      if (pendingSession.qrCode) {
        setQrCode(pendingSession.qrCode);
      }
      
      if (pendingSession.pin) {
        setPin(pendingSession.pin);
      }
      
      // Restore selected slots from session
      if (pendingSession.selectedSlots && Array.isArray(pendingSession.selectedSlots)) {
        setSelectedSlots(pendingSession.selectedSlots);
      } else if (pendingSession.startTime && pendingSession.endTime) {
        // Fallback: generate selected slots from session times
        const sessionSlots = [];
        const startSlot = slots.find(slot => slot.start === pendingSession.startTime);
        if (startSlot) {
          let currentTime = pendingSession.startTime;
          while (currentTime !== pendingSession.endTime) {
            sessionSlots.push(currentTime);
            const currentSlot = slots.find(slot => slot.start === currentTime);
            if (currentSlot) {
              currentTime = currentSlot.end;
            } else {
              break;
            }
          }
        }
        setSelectedSlots(sessionSlots);
      }
      
      // Set the correct step based on session state
      // Use the exact step that was saved, with minimal validation
      let targetStep = pendingSession.step || 'type';
      
      // Only override if there's a clear data inconsistency
      if (targetStep === 'time') {
        // Make sure we have booking type selected
        if (!pendingSession.bookingType) {
          console.log('Session data incomplete - no booking type, resetting to type step');
          targetStep = 'type';
        }
      } else if (targetStep === 'payment' || targetStep === 'upload') {
        // Make sure we have minimum required data for these steps
        if (!pendingSession.bookingType || !pendingSession.selectedVehicle) {
          console.log('Session data incomplete for step:', targetStep, {
            bookingType: pendingSession.bookingType,
            selectedVehicle: pendingSession.selectedVehicle
          });
          targetStep = 'type';
        }
        
        // Additional validation based on booking type
        if (pendingSession.bookingType === 'hourly' && (!pendingSession.selectedSlots?.length)) {
          targetStep = 'time';
        } else if (pendingSession.bookingType === 'daily' && !pendingSession.startDate) {
          targetStep = 'time';
        } else if (pendingSession.bookingType === 'monthly' && (!pendingSession.startDate || !pendingSession.endDate)) {
          targetStep = 'time';
        }
      }
      
      console.log('Restoring session to step:', targetStep, 'from saved step:', pendingSession.step);
      
      setStep(targetStep);
      setShowSessionRestoreDialog(false);
      setPendingSession(null);
      
      // Show success message with step information
      const stepNames = {
        type: t('booking_type_step'),
        time: t('time_selection_step'),
        payment: t('payment_step'),
        upload: t('verification_step')
      };
      
      // Use timeout to ensure UI is updated first, then reset the restore flag
      setTimeout(() => {
        alert(t('booking_session_restored') + ' - ' + t('restored_to_step') + ': ' + stepNames[targetStep as keyof typeof stepNames]);
        setIsRestoringSession(false);
        console.log('Session restore completed');
      }, 100);
    }
  };

  const handleStartNewBooking = () => {
    console.log('Starting new booking - clearing session');
    // Clear the session and start fresh
    clearBookingSession();
    setShowSessionRestoreDialog(false);
    setPendingSession(null);
    
    // Set initializing flag to prevent immediate session save
    setIsInitializing(true);
    
    // Reset all booking-related state to initial values using Thailand timezone
    const now = new Date();
    const thailandTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
    
    setStartDate(thailandTime.toISOString().split('T')[0]); // Today's date in Thailand
    setEndDate('');
    setMonthsToBook(1); // Reset to 1 month
    setStartTime('');
    setEndTime('');
    setSelectedSlots([]);
    setSelectedDays([]);
    setCurrentWeekStart(thailandTime.toISOString().split('T')[0]); // Reset to today
    setSelectedVehicle('');
    setBookingType('hourly');
    setStep('type');
    setCreatedBookingId(null);
    setPaymentSlipUrl(null);
    
    // Reset availability data
    setDayAvailability({});
    setMonthlyAvailability({});
    setMonthlyConflicts([]);
    
    // Generate new booking ID, QR code and PIN
    const newBookingId = 'BK' + Date.now();
    const newQrCode = `BK-${id}-${crypto.randomUUID()}`;
    const newPin = generateSecurePin(newBookingId, id || '');
    
    setBookingId(newBookingId);
    setQrCode(newQrCode);
    setPin(newPin);
    
    // Allow saving session after reset is complete
    setTimeout(() => {
      setIsInitializing(false);
      console.log('New booking initialization completed');
    }, 100);
  };

  // Save booking session whenever relevant state changes
  useEffect(() => {
    // Don't save session while initializing to prevent overwriting existing session
    if (isInitializing) {
      console.log('Skipping session save during initialization');
      return;
    }
    
    // Don't save session while restoring to prevent overwriting
    if (isRestoringSession) {
      console.log('Skipping session save during restore process');
      return;
    }
    
    if (id) {
      const sessionData = {
        spotId: id,
        bookingType,
        startDate,
        endDate,
        monthsToBook,
        startTime,
        endTime,
        selectedVehicle,
        selectedSlots,
        selectedDays,
        currentWeekStart,
        step,
        createdBookingId,
        paymentSlipUrl,
        bookingId,
        qrCode,
        pin,
        timestamp: new Date().getTime()
      };
      
      console.log('Saving session with step:', step, sessionData);
      saveBookingSession(sessionData);
    }
  }, [id, bookingType, startDate, endDate, monthsToBook, startTime, endTime, selectedVehicle, selectedSlots, selectedDays, currentWeekStart, step, createdBookingId, paymentSlipUrl, bookingId, qrCode, pin, isRestoringSession, isInitializing]);

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

  // Manual booking type selection via type step - no auto-selection needed

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
        
        setVehicles(data || []);
        
        if (data && data.length > 0) {
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
    if (!spot) return 0;
    
    // Parse pricing config - same logic as in booking type selection
    let pricingConfig: any = {};
    if (spot.pricing) {
      if (typeof spot.pricing === 'string') {
        try {
          pricingConfig = JSON.parse(spot.pricing);
        } catch (e) {
          console.error('Failed to parse pricing config:', e);
        }
      } else {
        pricingConfig = spot.pricing;
      }
    }
    
    // If no pricing config exists, create default config
    if (!pricingConfig || Object.keys(pricingConfig).length === 0) {
      pricingConfig = {
        hour: { enabled: true, price: spot.price || 50 },
        day: { enabled: !!spot.daily_price, price: spot.daily_price || (spot.price || 50) * 24 },
        month: { enabled: !!spot.monthly_price, price: spot.monthly_price || ((spot.daily_price || (spot.price || 50) * 24) * 30) }
      };
    }
    
    if (bookingType === 'hourly') {
      if (selectedSlots.length === 0) return 0;
      
      let total = 0;
      console.log('=== Hourly Price Calculation Debug ===');
      selectedSlots.forEach(slotStart => {
        const slotPrice = calculateSlotPrice(slotStart);
        const remaining = getRemainingTimeInSlot(slotStart);
        console.log(`Slot ${slotStart}: ${remaining}min remaining = ฿${slotPrice}`);
        total += slotPrice;
      });
      console.log(`Total: ฿${total}`);
      console.log('===============================');
      
      return Math.ceil(total); // Round up, no decimals
    } 
    
    if (bookingType === 'daily') {
      if (selectedDays.length === 0) return 0;
      // Use daily rate from pricing config and multiply by number of selected days
      const dailyRate = pricingConfig.day?.price || spot.daily_price || (spot.price * 24);
      return dailyRate * selectedDays.length;
    }
    
    if (bookingType === 'monthly') {
      if (!startDate || monthsToBook <= 0) return 0;
      
      // Use monthly rate from pricing config and multiply by selected months
      const monthlyRate = pricingConfig.month?.price || spot.monthly_price || ((spot.daily_price || (spot.price * 24)) * 30);
      return monthlyRate * monthsToBook;
    }
    
    return 0;
  };

  const handleBooking = async () => {
    if (step === 'type') {
      // Move to time selection step
      console.log('Moving from type to time step with booking type:', bookingType);
      setStep('time');
    } else if (step === 'time') {
      // Validate time step based on booking type
      if (bookingType === 'hourly') {
        if (selectedSlots.length === 0) {
          alert('Please select at least one time slot');
          return;
        }
      } else if (bookingType === 'daily') {
        if (selectedDays.length === 0) {
          alert('Please select at least one day');
          return;
        }
      } else if (bookingType === 'monthly') {
        if (!startDate || !endDate || monthsToBook < 1) {
          alert('Please select start date and duration');
          return;
        }
        
        // Check for booking conflicts in the monthly period
        if (monthlyConflicts.length > 0) {
          // Check if there are any available slots in the conflict days
          const hasAvailableSlots = monthlyConflicts.some(date => {
            const availability = monthlyAvailability[date];
            return availability && availability.available > 0;
          });
          
          if (!hasAvailableSlots) {
            const conflictDates = monthlyConflicts.sort().join(', ');
            alert(`Cannot book this period. The following dates are fully booked: ${conflictDates}`);
            return;
          } else {
            // Show warning but allow booking
            const conflictDetails = monthlyConflicts.map(date => {
              const availability = monthlyAvailability[date];
              return `${date}: ${availability?.available || 0}/${spot?.total_slots || 1} slots available`;
            }).join('\n');
            
            const proceed = confirm(`Some dates have limited availability:\n${conflictDetails}\n\nDo you want to proceed with the booking?`);
            if (!proceed) {
              return;
            }
          }
        }
      }
      
      if (!selectedVehicle) {
        alert('Please select a vehicle');
        return;
      }
      
      console.log('Moving from time to payment step');
      setStep('payment');
    } else if (step === 'payment') {
      if (!paymentMethod) {
        alert(t('please_select_payment_method'));
        return;
      }
      
      // Just move to upload step without creating booking yet
      console.log('Moving from payment to upload step');
      setStep('upload');
    }
  };

  const handlePaymentSlipUpload = async (imageUrl: string) => {
    try {
      // Generate a fresh unique QR code for the actual booking to prevent duplicates
      const uniqueQrCode = `BK-${id}-${crypto.randomUUID()}`;
      
      // Generate secure PIN based on booking and spot
      const securePin = generateSecurePin(bookingId, id || '');
      
      // Format the start and end times correctly based on booking type
      let startDateTime: Date;
      let endDateTime: Date;
      
      if (bookingType === 'hourly') {
        // Use selected time slots for hourly booking
        if (selectedSlots.length === 0) {
          throw new Error('No time slots selected for hourly booking');
        }
        
        // Use first and last selected slots
        const sortedSlots = [...selectedSlots].sort();
        const firstSlot = sortedSlots[0];
        const lastSlot = slots.find(slot => slot.start === sortedSlots[sortedSlots.length - 1]);
        
        startDateTime = new Date(`${startDate}T${firstSlot}`);
        endDateTime = new Date(`${startDate}T${lastSlot?.end || firstSlot}`);
      } else if (bookingType === 'daily') {
        // For daily booking, use selected days
        if (selectedDays.length === 0) {
          throw new Error('No days selected for daily booking');
        }
        
        // For multiple days, create separate bookings or use first and last day
        const sortedDays = [...selectedDays].sort();
        startDateTime = new Date(`${sortedDays[0]}T00:00:00`);
        endDateTime = new Date(`${sortedDays[sortedDays.length - 1]}T23:59:59`);
      } else if (bookingType === 'monthly') {
        // For monthly booking, use start and end dates
        startDateTime = new Date(`${startDate}T00:00:00`);
        endDateTime = new Date(`${endDate}T23:59:59`);
      } else {
        throw new Error('Invalid booking type');
      }
      
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
          pin: securePin,
          booking_type: bookingType
        })
        .select();
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const newBookingId = data[0].id;
        setCreatedBookingId(newBookingId);
        
        // Save payment slip record
        const { error: dbError } = await supabase
          .from('payment_slips')
          .insert({
            booking_id: newBookingId,
            image_url: imageUrl,
            status: 'pending'
          });

        if (dbError) throw dbError;

        // Update booking payment status
        const { error: bookingError } = await supabase
          .from('bookings')
          .update({ payment_status: 'pending' })
          .eq('id', newBookingId);

        if (bookingError) throw bookingError;
        
        console.log('Payment slip uploaded successfully. Waiting for admin verification.');
        
        // Update the QR code and PIN state with the ones actually used in the database
        setQrCode(uniqueQrCode);
        setPin(securePin);
        setPaymentSlipUrl(imageUrl);
        setShowPaymentSlipUpload(false);
        // Move to success step after upload and booking creation
        setStep('success');
        
        // Clear booking session as booking is now complete
        clearBookingSession();
      }
    } catch (err: any) {
      console.error('Error creating booking:', err);
      alert(t('failed_create_booking'));
    }
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
            {t('spot_not_found_message')}
          </p>
          <button 
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            {t('return_to_home')}
          </button>
        </div>
      </div>
    );
  }

  // Upload Step (Payment Slip Upload)
  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <button 
              onClick={() => setStep('payment')}
              className="text-blue-600 text-sm mb-2 flex items-center"
            >
              ← Back to Payment Selection
            </button>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Upload Payment Proof
            </h1>
          </div>

          {/* Payment Amount */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Amount to Pay
            </h2>
            
            <div className="text-center">
              <div className="bg-blue-50 rounded-lg p-6">
                <p className="text-3xl font-bold text-blue-900 mb-2">
                  ฿{calculateTotal()}
                </p>
                <p className="text-sm text-blue-700">
                  {bookingType === 'hourly' && 'Hourly Booking'}
                  {bookingType === 'daily' && 'Daily Booking'}
                  {bookingType === 'monthly' && 'Monthly Booking'}
                </p>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Upload Transfer Slip
            </h2>
            
            <div className="text-center">
              <button 
                onClick={async () => {
                  // Create file input element
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      try {
                        // Upload to Supabase storage
                        const fileExt = file.name.split('.').pop();
                        const fileName = `payment-slip-${Date.now()}.${fileExt}`;
                        
                        const { error } = await supabase.storage
                          .from('payment-slips')
                          .upload(fileName, file);
                          
                        if (error) throw error;
                        
                        // Get public URL
                        const { data: urlData } = supabase.storage
                          .from('payment-slips')
                          .getPublicUrl(fileName);
                          
                        await handlePaymentSlipUpload(urlData.publicUrl);
                      } catch (err) {
                        console.error('Upload error:', err);
                        alert('Unable to upload. Please try again.');
                      }
                    }
                  };
                  input.click();
                }}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="text-gray-500 mb-2">
                  
                </div>
                <div className="text-gray-700 font-medium">Click to Upload Slip</div>
                <div className="text-sm text-gray-500">Supports JPG, PNG files</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success Step (Booking Confirmation)
  if (step === 'success') {
    console.log('Rendering success page with navigation buttons');
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-8">
          {/* Success Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 text-center">
            <div className="text-green-500 mb-4">
              <Check className="h-16 w-16 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Booking Successful!
            </h1>
            <p className="text-gray-600">
              Your booking has been created. Waiting for admin verification.
            </p>
          </div>

          {/* QR Code Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Your QR Code
            </h2>
            <QRCodeGenerator 
              value={qrCode}
              size={180}
              className="mb-4"
            />
            <p className="text-sm text-gray-600">
              Show this QR code at the parking entrance
            </p>
          </div>

          {/* Booking Details */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Booking Details
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Booking ID:</span>
                <span className="font-mono text-sm">#{createdBookingId ? createdBookingId.slice(-6) : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">PIN:</span>
                <span className="font-mono text-lg font-bold">{pin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="capitalize">{bookingType} Booking</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Cost:</span>
                <span className="font-semibold">฿{calculateTotal()}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4 pb-8">
            <button 
              onClick={() => {
                // Open Google Maps with directions to the parking spot
                const destination = encodeURIComponent(`${spot.address}, ${spot.name}`);
                const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
                
                // For mobile devices, try to open Google Maps app first
                if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                  // Try Google Maps app first, fallback to web
                  const googleMapsApp = `comgooglemaps://?daddr=${destination}&directionsmode=driving`;
                  const fallbackWeb = googleMapsUrl;
                  
                  window.open(googleMapsApp, '_system');
                  
                  // Fallback to web version after a short delay
                  setTimeout(() => {
                    window.open(fallbackWeb, '_blank', 'noopener,noreferrer');
                  }, 1000);
                } else {
                  // Desktop - open in new tab
                  window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
                }
                
                console.log('Opening directions to parking spot:', spot.address);
              }}
              className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg text-lg"
            >
              🗺️ Get Directions to Parking Spot
            </button>
            <button 
              onClick={() => {
                console.log('Navigating to bookings page');
                navigate('/bookings');
              }}
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg text-lg"
            >
              View My Bookings
            </button>
            <button 
              onClick={() => {
                console.log('Navigating to home page');
                navigate('/');
              }}
              className="w-full border-2 border-gray-300 text-gray-700 py-4 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-sm text-lg"
            >
              Back to Home
            </button>
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
          <span>{t('back')}</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Progress Indicator */}
          <div className="bg-gray-50 px-6 py-4">
            <div className="flex items-center">
              <div className={`flex items-center space-x-2 ${
                step === 'type' ? 'text-blue-600' : 'text-green-600'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step === 'type' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                }`}>
                  {step === 'type' ? '1' : <Check className="h-4 w-4" />}
                </div>
                {/* <span className="text-sm font-medium">{t('select_booking_type')}</span> */}
                <span className="text-sm font-medium">Select Booking Type</span>
              </div>
              <div className="flex-1 h-px bg-gray-300 mx-2"></div>
              <div className={`flex items-center space-x-2 ${
                step === 'time' ? 'text-blue-600' : (['payment', 'upload', 'success'].includes(step)) ? 'text-green-600' : 'text-gray-400'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step === 'time' ? 'bg-blue-600 text-white' : 
                  (['payment', 'upload', 'success'].includes(step)) ? 'bg-green-600 text-white' : 
                  'bg-gray-300 text-gray-600'
                }`}>
                  {step === 'time' ? '2' : (['payment', 'upload', 'success'].includes(step)) ? <Check className="h-4 w-4" /> : '2'}
                </div>
                <span className="text-sm font-medium">{t('select_time')}</span>
              </div>
              <div className="flex-1 h-px bg-gray-300 mx-2"></div>
              <div className={`flex items-center space-x-2 ${
                step === 'payment' ? 'text-blue-600' : ((step as any) === 'upload' || (step as any) === 'success') ? 'text-green-600' : 'text-gray-400'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step === 'payment' ? 'bg-blue-600 text-white' : 
                  ((step as any) === 'upload' || (step as any) === 'success') ? 'bg-green-600 text-white' : 
                  'bg-gray-300 text-gray-600'
                }`}>
                  {step === 'payment' ? '3' : ((step as any) === 'upload' || (step as any) === 'success') ? <Check className="h-4 w-4" /> : '3'}
                </div>
                <span className="text-sm font-medium">{t('payment_step')}</span>
              </div>
              <div className="flex-1 h-px bg-gray-300 mx-2"></div>
              <div className={`flex items-center space-x-2 ${
                (step as any) === 'upload' ? 'text-blue-600' : (step as any) === 'success' ? 'text-green-600' : 'text-gray-400'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${
                  (step as any) === 'upload' ? 'bg-blue-600 text-white' : 
                  (step as any) === 'success' ? 'bg-green-600 text-white' : 
                  'bg-gray-300 text-gray-600'
                }`}>
                  {(step as any) === 'upload' ? '4' : (step as any) === 'success' ? <Check className="h-4 w-4" /> : '4'}
                </div>
                <span className="text-sm font-medium">{t('verification')}</span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Parking Spot Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-1">{spot.name}</h3>
              <p className="text-sm text-gray-600">{spot.address}</p>
              <p className="text-sm text-blue-600 font-medium">
                {(() => {
                  // Parse pricing config to show relevant price based on booking type
                  let pricingConfig: any = {};
                  if (spot.pricing) {
                    if (typeof spot.pricing === 'string') {
                      try {
                        pricingConfig = JSON.parse(spot.pricing);
                      } catch (e) {
                        console.error('Failed to parse pricing config:', e);
                      }
                    } else {
                      pricingConfig = spot.pricing;
                    }
                  }
                  
                  // If no pricing config exists, create default config
                  if (!pricingConfig || Object.keys(pricingConfig).length === 0) {
                    pricingConfig = {
                      hour: { enabled: true, price: spot.price || 50 },
                      day: { enabled: !!spot.daily_price, price: spot.daily_price || (spot.price || 50) * 24 },
                      month: { enabled: !!spot.monthly_price, price: spot.monthly_price || ((spot.daily_price || (spot.price || 50) * 24) * 30) }
                    };
                  }
                  
                  if (bookingType === 'hourly') {
                    return `฿${pricingConfig.hour?.price || spot.price}/hour`;
                  } else if (bookingType === 'daily') {
                    return `฿${pricingConfig.day?.price || spot.daily_price || (spot.price * 24)}/day`;
                  } else if (bookingType === 'monthly') {
                    return `฿${pricingConfig.month?.price || spot.monthly_price || ((spot.daily_price || (spot.price * 24)) * 30)}/month`;
                  }
                  // Default to hourly if no booking type selected yet
                  return `฿${pricingConfig.hour?.price || spot.price}/hour`;
                })()}
              </p>
              
              {/* Current Time Display */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  {t('current_time_thailand')}: <span className="font-mono">
                    {new Date().toLocaleString('en-US', { 
                      timeZone: 'Asia/Bangkok',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </span>
                </p>
              </div>
            </div>

            {step === 'type' && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Select Booking Type
                </h2>
                <div className="space-y-4">
                  {(() => {
                    // Parse pricing config - fallback to default if not available
                    let pricingConfig: any = {};
                    if (spot.pricing) {
                      if (typeof spot.pricing === 'string') {
                        try {
                          pricingConfig = JSON.parse(spot.pricing);
                        } catch (e) {
                          console.error('Failed to parse pricing config:', e);
                        }
                      } else {
                        pricingConfig = spot.pricing;
                      }
                    }
                    
                    // If no pricing config exists, create default config based on available spot data
                    if (!pricingConfig || Object.keys(pricingConfig).length === 0) {
                      pricingConfig = {
                        hour: { enabled: true, price: spot.price || 50 },
                        day: { enabled: !!spot.daily_price, price: spot.daily_price || (spot.price || 50) * 24 },
                        month: { enabled: !!spot.monthly_price, price: spot.monthly_price || ((spot.daily_price || (spot.price || 50) * 24) * 30) }
                      };
                    }
                    
                    console.log('Pricing config:', pricingConfig);
                    
                    return (
                      <>
                        {/* Hourly Booking */}
                        {pricingConfig?.hour?.enabled && (
                          <div 
                            onClick={() => setBookingType('hourly')}
                            className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
                              bookingType === 'hourly' 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center space-x-4">
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                bookingType === 'hourly' ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                              }`}>
                                {bookingType === 'hourly' && (
                                  <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                  Hourly Booking
                                </h3>
                                <p className="text-sm text-gray-600 mb-2">
                                  Perfect for short-term parking. Choose flexible time slots that suit your schedule.
                                </p>
                                <div className="flex items-center space-x-4 text-sm">
                                  <span className="text-blue-600 font-medium">
                                    ฿{pricingConfig.hour.price}/hour
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Daily Booking */}
                        {pricingConfig?.day?.enabled && (
                          <div 
                            onClick={() => setBookingType('daily')}
                            className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
                              bookingType === 'daily' 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center space-x-4">
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                bookingType === 'daily' ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                              }`}>
                                {bookingType === 'daily' && (
                                  <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                  Daily Booking
                                </h3>
                                <p className="text-sm text-gray-600 mb-2">
                                  Park for the entire day (24 hours). More economical than hourly rates.
                                </p>
                                <div className="flex items-center space-x-4 text-sm">
                                  <span className="text-blue-600 font-medium">
                                    ฿{pricingConfig.day.price}/day
                                  </span>
                                  <span className="text-gray-500">
                                    00:00 - 23:59
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Monthly Booking */}
                        {pricingConfig?.month?.enabled && (
                          <div 
                            onClick={() => setBookingType('monthly')}
                            className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
                              bookingType === 'monthly' 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center space-x-4">
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                bookingType === 'monthly' ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                              }`}>
                                {bookingType === 'monthly' && (
                                  <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                  Monthly Booking
                                </h3>
                                <p className="text-sm text-gray-600 mb-2">
                                  Ideal for long-term parking. Best value for continuous usage.
                                </p>
                                <div className="flex items-center space-x-4 text-sm">
                                  <span className="text-blue-600 font-medium">
                                    ฿{pricingConfig.month.price}/month
                                  </span>
                                  <span className="text-gray-500">
                                    Minimum 30 days
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            )}

            {step === 'time' && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  {bookingType === 'hourly' && 'Select Time Slots'}
                  {bookingType === 'daily' && 'Select Date'}
                  {bookingType === 'monthly' && 'Select Monthly Booking Period'}
                </h2>
                <div className="space-y-6">
                  {/* Booking Type Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                      <span className="font-medium text-blue-900">
                        {bookingType === 'hourly' && 'Hourly Booking'}
                        {bookingType === 'daily' && 'Daily Booking'}
                        {bookingType === 'monthly' && 'Monthly Booking'}
                      </span>
                    </div>
                    <p className="text-sm text-blue-700">
                      {(() => {
                        // Parse pricing config - same logic as in booking type selection
                        let pricingConfig: any = {};
                        if (spot.pricing) {
                          if (typeof spot.pricing === 'string') {
                            try {
                              pricingConfig = JSON.parse(spot.pricing);
                            } catch (e) {
                              console.error('Failed to parse pricing config:', e);
                            }
                          } else {
                            pricingConfig = spot.pricing;
                          }
                        }
                        
                        // If no pricing config exists, create default config
                        if (!pricingConfig || Object.keys(pricingConfig).length === 0) {
                          pricingConfig = {
                            hour: { enabled: true, price: spot.price || 50 },
                            day: { enabled: !!spot.daily_price, price: spot.daily_price || (spot.price || 50) * 24 },
                            month: { enabled: !!spot.monthly_price, price: spot.monthly_price || ((spot.daily_price || (spot.price || 50) * 24) * 30) }
                          };
                        }
                        
                        if (bookingType === 'hourly') {
                          return `Price: ฿${pricingConfig.hour?.price || spot.price}/hour - Choose flexible time slots`;
                        } else if (bookingType === 'daily') {
                          return `Price: ฿${pricingConfig.day?.price || spot.daily_price || (spot.price * 24)}/day - Park for 24 hours`;
                        } else if (bookingType === 'monthly') {
                          return `Price: ฿${pricingConfig.month?.price || spot.monthly_price || ((spot.daily_price || (spot.price * 24)) * 30)}/month - Minimum 30 days`;
                        }
                        return '';
                      })()}
                    </p>
                  </div>

                  {/* Date Selection for Hourly */}
                  {bookingType === 'hourly' && (
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
                  )}

                  {/* Day Slot Selection for Daily */}
                  {bookingType === 'daily' && (
                    <div>
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          <Calendar className="inline h-4 w-4 mr-1" />
                          Select Days (Multiple Days Allowed)
                        </label>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <h4 className="font-medium text-blue-900 mb-2 text-sm">Daily Booking Rules</h4>
                        <ul className="text-xs text-blue-800 space-y-1">
                          <li>• Select multiple days (they don't need to be consecutive)</li>
                          <li>• Each day provides 24-hour parking access</li>
                          <li>• Park any time during selected days</li>
                          <li>• Total price: ฿{(() => {
                            let pricingConfig: any = {};
                            if (spot.pricing) {
                              if (typeof spot.pricing === 'string') {
                                try {
                                  pricingConfig = JSON.parse(spot.pricing);
                                } catch (e) {
                                  console.error('Failed to parse pricing config:', e);
                                }
                              } else {
                                pricingConfig = spot.pricing;
                              }
                            }
                            return pricingConfig.day?.price || spot.daily_price || (spot.price * 24);
                          })()} per day</li>
                        </ul>
                      </div>

                      {/* Status Legend - Updated to match hourly booking */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-blue-600 rounded"></div>
                            <span>Selected</span>
                          </div>
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
                            <span>Full/Past</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Day Slots Grid - Using TimeSlotAvailability Style */}
                      <div className="space-y-4">
                        {/* Week Header */}
                        <div className="text-center">
                          <h3 className="text-sm font-medium text-gray-700">
                            Week of {new Date(currentWeekStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </h3>
                        </div>
                        
                        {/* Mobile Horizontal Scroll Layout - matching hourly style */}
                        <div className="block sm:hidden">
                          <div className="flex overflow-x-auto space-x-3 pb-4 scrollbar-hide">
                            {generateDaySlots(currentWeekStart).map((daySlot) => {
                              const isSelected = selectedDays.includes(daySlot.date);
                              const availability = dayAvailability[daySlot.date];
                              const isFullyBooked = availability && availability.available <= 0;
                              
                              return (
                                <TimeSlotAvailability
                                  key={daySlot.date}
                                  spotId={spot?.id || ''}
                                  totalSlots={spot?.total_slots || 1}
                                  date={daySlot.date}
                                  timeSlot="00:00" // Use start of day for daily bookings
                                  bookingType="daily"
                                  isBooked={isFullyBooked}
                                  isSelected={isSelected}
                                  onClick={() => toggleDay(daySlot.date)}
                                  className="min-w-[140px] flex-shrink-0 h-16"
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Tablet and Desktop Grid Layout - matching hourly style */}
                        <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                          {generateDaySlots(currentWeekStart).map((daySlot) => {
                            const isSelected = selectedDays.includes(daySlot.date);
                            const availability = dayAvailability[daySlot.date];
                            const isFullyBooked = availability && availability.available <= 0;
                            
                            return (
                              <TimeSlotAvailability
                                key={daySlot.date}
                                spotId={spot?.id || ''}
                                totalSlots={spot?.total_slots || 1}
                                date={daySlot.date}
                                timeSlot="00:00" // Use start of day for daily bookings
                                bookingType="daily"
                                isBooked={isFullyBooked}
                                isSelected={isSelected}
                                onClick={() => toggleDay(daySlot.date)}
                              />
                            );
                          })}
                        </div>
                        
                        {/* Week Navigation */}
                        <div className="flex justify-center items-center space-x-3 mt-4">
                          {(() => {
                            // Check if we can go back (not showing current week)
                            const today = new Date().toISOString().split('T')[0];
                            const canGoBack = currentWeekStart > today;
                            
                            return (
                              <>
                                {canGoBack && (
                                  <button
                                    onClick={() => {
                                      const prevWeek = new Date(currentWeekStart);
                                      prevWeek.setDate(prevWeek.getDate() - 7);
                                      setCurrentWeekStart(prevWeek.toISOString().split('T')[0]);
                                    }}
                                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                                  >
                                    ← Previous
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    const nextWeek = new Date(currentWeekStart);
                                    nextWeek.setDate(nextWeek.getDate() + 7);
                                    setCurrentWeekStart(nextWeek.toISOString().split('T')[0]);
                                  }}
                                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                                >
                                  Next 7 Days →
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      
                      {selectedDays.length > 0 && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium text-green-800">
                                Selected: {selectedDays.length} day{selectedDays.length > 1 ? 's' : ''}
                              </p>
                              <p className="text-xs text-green-600 mt-1">
                                {selectedDays.sort().map(date => {
                                  const dateObj = new Date(date);
                                  return dateObj.toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  });
                                }).join(', ')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-green-800">
                                ฿{calculateTotal()}
                              </p>
                              <p className="text-xs text-green-600">
                                Total Cost
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Date Selection for Monthly */}
                  {bookingType === 'monthly' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Calendar className="inline h-4 w-4 mr-1" />
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            // Auto-set end date based on selected months
                            if (e.target.value) {
                              const start = new Date(e.target.value);
                              const end = new Date(start);
                              end.setMonth(start.getMonth() + monthsToBook);
                              setEndDate(end.toISOString().split('T')[0]);
                            }
                          }}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration (Months)
                        </label>
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={() => {
                              const newMonths = Math.max(1, monthsToBook - 1);
                              setMonthsToBook(newMonths);
                              // Update end date when months change
                              if (startDate) {
                                const start = new Date(startDate);
                                const end = new Date(start);
                                end.setMonth(start.getMonth() + newMonths);
                                setEndDate(end.toISOString().split('T')[0]);
                              }
                            }}
                            disabled={monthsToBook <= 1}
                            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                          >
                            <span className="text-lg font-bold">-</span>
                          </button>
                          
                          <div className="flex-1 text-center">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg py-3 px-4">
                              <span className="text-2xl font-bold text-blue-900">{monthsToBook}</span>
                              <span className="text-sm text-blue-700 ml-1">month{monthsToBook > 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const newMonths = Math.min(12, monthsToBook + 1);
                              setMonthsToBook(newMonths);
                              // Update end date when months change
                              if (startDate) {
                                const start = new Date(startDate);
                                const end = new Date(start);
                                end.setMonth(start.getMonth() + newMonths);
                                setEndDate(end.toISOString().split('T')[0]);
                              }
                            }}
                            disabled={monthsToBook >= 12}
                            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                          >
                            <span className="text-lg font-bold">+</span>
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Choose between 1-12 months
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Calendar className="inline h-4 w-4 mr-1" />
                          End Date (Auto-calculated)
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          disabled
                          className="w-full px-3 py-3 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          End date is automatically calculated based on selected duration
                        </p>
                      </div>
                      
                      {startDate && endDate && (
                        <>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-medium text-green-900 mb-2">Booking Summary</h4>
                            <div className="space-y-1 text-sm text-green-800">
                              <p>Period: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}</p>
                              <p>Duration: {monthsToBook} month{monthsToBook > 1 ? 's' : ''}</p>
                              <p className="font-semibold">Total Cost: ฿{calculateTotal()}</p>
                            </div>
                          </div>
                          
                          {/* Show availability info if there are bookings in the period */}
                          {monthlyConflicts.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <h4 className="font-medium text-yellow-900 mb-2">📊 Availability Information</h4>
                              <div className="space-y-2 text-sm text-yellow-800">
                                <p>Some dates in your selected period have existing bookings:</p>
                                <div className="bg-yellow-100 border border-yellow-300 rounded p-2 max-h-32 overflow-y-auto">
                                  <div className="space-y-1 text-xs">
                                    {monthlyConflicts.sort().map((date, index) => {
                                      const availability = monthlyAvailability[date];
                                      const availableSlots = availability?.available || 0;
                                      const totalSlots = spot?.total_slots || 1;
                                      const isFullyBooked = availableSlots <= 0;
                                      
                                      return (
                                        <div key={index} className={`flex justify-between items-center px-2 py-1 rounded ${
                                          isFullyBooked 
                                            ? 'bg-red-200 text-red-900' 
                                            : 'bg-green-200 text-green-900'
                                        }`}>
                                          <span className="font-medium">
                                            {new Date(date).toLocaleDateString('en-US', { 
                                              month: 'short', 
                                              day: 'numeric' 
                                            })}
                                          </span>
                                          <span className="text-xs">
                                            {isFullyBooked 
                                              ? 'Fully Booked' 
                                              : `${availableSlots}/${totalSlots} slots`
                                            }
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                {monthlyConflicts.some(date => (monthlyAvailability[date]?.available || 0) <= 0) && (
                                  <p className="font-semibold text-red-700">
                                    ⚠️ Some dates are fully booked. Please choose a different period or shorter duration.
                                  </p>
                                )}
                                {monthlyConflicts.every(date => (monthlyAvailability[date]?.available || 0) > 0) && (
                                  <p className="font-semibold text-green-700">
                                    ✅ All dates have available slots. You can proceed with booking.
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Time Slot Selection - Only for Hourly Booking */}
                  {bookingType === 'hourly' && (
                    <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        {t('select_time_slots')}
                      </label>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <h4 className="font-medium text-blue-900 mb-2 text-sm">{t('booking_rules')}</h4>
                      <ul className="text-xs text-blue-800 space-y-1">
                        <li>• {t('consecutive_slots_only')}</li>
                        <li>• {t('thirty_min_rule')}</li>
                        <li>• {t('pricing_rule')}</li>
                        <li>• {t('prorated_rule')}</li>
                        <li>• {t('base_price')}: ฿{spot.price}{t('per_hour_unit')}</li>
                      </ul>
                    </div>

                    {/* Status Legend */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                          <span>{t('available')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                          <span>{t('limited')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                          <span>{t('full')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gray-200 border border-gray-300 rounded"></div>
                          <span>{t('unavailable')}</span>
                        </div>
                      </div>
                    </div>

                    {(!isOpen || slots.length === 0) ? (
                      <div className="p-4 bg-red-50 rounded-lg text-center text-red-600 font-semibold">
                        {t('closed_for_service')}
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
                              
                              const hasMinTime = hasMinimumTime(slot.start);
                              const isDisabled = isBooked || isPast || !hasMinTime;

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
                                    totalSlots={spot?.total_slots || 1}
                                    date={startDate}
                                    timeSlot={slot.start}
                                    isBooked={isDisabled}
                                    isSelected={isSelected}
                                    onClick={() => !isDisabled ? toggleSlot(slot.start) : undefined}
                                    className="h-16"
                                    bookingType="hourly"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <div className="text-xs text-gray-500 text-center mt-2">
                            {t('swipe_for_more_slots')}
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
                            
                            const hasMinTime = hasMinimumTime(slot.start);
                            const isDisabled = isBooked || isPast || !hasMinTime;

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
                                  totalSlots={spot?.total_slots || 1}
                                  date={startDate}
                                  timeSlot={slot.start}
                                  isBooked={isDisabled}
                                  isSelected={isSelected}
                                  onClick={() => !isDisabled ? toggleSlot(slot.start) : undefined}
                                  bookingType="hourly"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  )}

                  {/* Selected Slots Summary - Only for Hourly Booking */}
                  {bookingType === 'hourly' && selectedSlots.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">{t('selected_time_slots')}</span>
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
                              <span className="text-blue-700">{t('start_time')}:</span>
                              <span className="font-medium text-blue-800">{startTime}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-blue-700">{t('end_time')}:</span>
                              <span className="font-medium text-blue-800">{endTime}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-blue-700">{t('duration')}:</span>
                              <span className="font-medium text-blue-800">{calculateDuration().toFixed(1)} {t('hours')}</span>
                            </div>
                            {selectedSlots.some(slot => getRemainingTimeInSlot(slot) < 60) && (
                              <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded mt-2">
                                <div className="font-medium mb-1">⚠️ {t('prorated_pricing_applied')}:</div>
                                {selectedSlots.map(slot => {
                                  const remaining = getRemainingTimeInSlot(slot);
                                  if (remaining < 60 && remaining >= 30) {
                                    const price = calculateSlotPrice(slot);
                                    return (
                                      <div key={slot} className="text-xs">
                                        {slot}: {remaining}{t('min_remaining')} = ฿{price.toFixed(2)} ({t('half_price_extra')})
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
                      {t('select_vehicle')}
                    </label>
                    
                    {vehiclesLoading ? (
                      <div className="flex items-center space-x-2 text-gray-500 text-sm">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                        <span>{t('loading_vehicles')}</span>
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
                              {t('go_to_profile')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cost Summary */}
                  {((bookingType === 'hourly' && selectedSlots.length > 0 && startTime && endTime) || 
                    (bookingType === 'daily' && selectedDays.length > 0) || 
                    (bookingType === 'monthly' && startDate && endDate)) && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Booking Summary</span>
                      </div>
                      <div className="space-y-2">
                        {bookingType === 'hourly' && (
                          <>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-blue-700">Duration:</span>
                              <span className="font-medium text-blue-900">{calculateDuration().toFixed(1)} hours</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-blue-700">Service Rate:</span>
                              <span className="font-medium text-blue-900">฿{spot.price}/hour</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-blue-700">Selected Slots:</span>
                              <span className="font-medium text-blue-900">{selectedSlots.length} slot(s)</span>
                            </div>
                          </>
                        )}
                        
                        {bookingType === 'daily' && (
                          <>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-blue-700">Selected Days:</span>
                              <span className="font-medium text-blue-900">{selectedDays.length} day{selectedDays.length > 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-blue-700">Duration:</span>
                              <span className="font-medium text-blue-900">24 hours per day</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-blue-700">Service Rate:</span>
                              <span className="font-medium text-blue-900">฿{(() => {
                                let pricingConfig: any = {};
                                if (spot.pricing) {
                                  if (typeof spot.pricing === 'string') {
                                    try {
                                      pricingConfig = JSON.parse(spot.pricing);
                                    } catch (e) {
                                      console.error('Failed to parse pricing config:', e);
                                    }
                                  } else {
                                    pricingConfig = spot.pricing;
                                  }
                                }
                                return pricingConfig.day?.price || spot.daily_price || (spot.price * 24);
                              })()}/day</span>
                            </div>
                          </>
                        )}
                        
                        {bookingType === 'monthly' && (
                          <>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-blue-700">Period:</span>
                              <span className="font-medium text-blue-900">{startDate} - {endDate}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-blue-700">Duration:</span>
                              <span className="font-medium text-blue-900">
                                {monthsToBook} month{monthsToBook > 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-blue-700">Service Rate:</span>
                              <span className="font-medium text-blue-900">฿{(() => {
                                let pricingConfig: any = {};
                                if (spot.pricing) {
                                  if (typeof spot.pricing === 'string') {
                                    try {
                                      pricingConfig = JSON.parse(spot.pricing);
                                    } catch (e) {
                                      console.error('Failed to parse pricing config:', e);
                                    }
                                  } else {
                                    pricingConfig = spot.pricing;
                                  }
                                }
                                return pricingConfig.month?.price || spot.monthly_price || ((spot.daily_price || (spot.price * 24)) * 30);
                              })()}/month</span>
                            </div>
                          </>
                        )}
                        
                        <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
                          <span className="text-base font-semibold text-blue-900">Total Price:</span>
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
                  {t('payment_details')}
                </h2>

                <div className="space-y-6">
                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      {t('payment_method')}
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
                          {t('qr_payment_only_available')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Instructions */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-3">{t('payment_instructions')}</h4>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center text-blue-700 font-medium flex-shrink-0">1</div>
                        <div>
                          <p className="text-sm text-blue-800 font-medium">{t('scan_qr_banking_app')}</p>
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
                                  {t('qr_not_available')}<br/>{t('contact_owner')}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center text-blue-700 font-medium flex-shrink-0">2</div>
                        <div>
                          <p className="text-sm text-blue-800 font-medium">{t('transfer_exact_amount', { amount: calculateTotal() })}</p>
                          <p className="text-xs text-blue-700 mt-1">{t('include_booking_reference')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center text-blue-700 font-medium flex-shrink-0">3</div>
                        <div>
                          <p className="text-sm text-blue-800 font-medium">{t('take_screenshot_confirmation')}</p>
                          <p className="text-xs text-blue-700 mt-1">{t('upload_next_step')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Booking Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">{t('booking_summary')}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>{t('date')}:</span>
                        <span>{startDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('start_time')}:</span>
                        <span>{startTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('end_time')}:</span>
                        <span>{endTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('duration')}:</span>
                        <span>{calculateDuration().toFixed(1)} {t('hours')}</span>
                      </div>
                      {selectedSlots.length > 0 && (
                        <div className="flex justify-between">
                          <span>{t('selected_slots')}:</span>
                          <span>{selectedSlots.length} {t('slot')}{selectedSlots.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {selectedSlots.some(slot => getRemainingTimeInSlot(slot) < 60) && (
                        <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                          ⚠️ {t('prorated_pricing_applied')}
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-base pt-2 border-t">
                        <span>{t('total')}:</span>
                        <span>฿{calculateTotal()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {(step as any) === 'upload' && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  {t('upload_payment_slip')}
                </h2>

                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">{t('upload_payment_confirmation')}</p>
                        <p className="text-xs text-blue-700 mt-1">
                          {t('upload_payment_instructions')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {paymentSlipUrl ? (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{t('payment_slip_uploaded_title')}</h4>
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
                        {t('payment_being_verified')}
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                      onClick={() => setShowPaymentSlipUpload(true)}
                    >
                      <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-700 font-medium mb-1">{t('click_upload_payment')}</p>
                      <p className="text-sm text-gray-500">
                        {t('supported_formats')}
                      </p>
                    </div>
                  )}

                  {/* Booking Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">{t('booking_summary')}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>{t('date')}:</span>
                        <span>{startDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('start_time')}:</span>
                        <span>{startTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('end_time')}:</span>
                        <span>{endTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('duration')}:</span>
                        <span>{calculateDuration().toFixed(1)} {t('hours')}</span>
                      </div>
                      {selectedSlots.length > 0 && (
                        <div className="flex justify-between">
                          <span>{t('selected_slots')}:</span>
                          <span>{selectedSlots.length} {t('slot')}{selectedSlots.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-base pt-2 border-t">
                        <span>{t('total')}:</span>
                        <span>฿{calculateTotal()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4">
              {step === 'type' && (
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 border border-gray-200 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back Home
                </button>
              )}
              
              {step === 'time' && (
                <button
                  onClick={() => setStep('type')}
                  className="flex-1 border border-gray-200 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              )}
              
              {step === 'payment' && (
                <button
                  onClick={() => setStep('time')}
                  className="flex-1 border border-gray-200 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              )}
              
              {(step as any) === 'upload' && (
                <button
                  onClick={() => setStep('payment')}
                  className="flex-1 border border-gray-200 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              )}
              
              {(step === 'type' || step === 'time' || step === 'payment') && (
                <button
                  onClick={handleBooking}
                  disabled={
                    (step === 'type' && !bookingType) ||
                    (step === 'time' && (
                      (bookingType === 'hourly' && (selectedSlots.length === 0 || !selectedVehicle)) ||
                      (bookingType === 'daily' && (selectedDays.length === 0 || !selectedVehicle)) ||
                      (bookingType === 'monthly' && (!startDate || !endDate || !selectedVehicle || monthlyConflicts.length > 0))
                    )) ||
                    (step === 'payment' && !paymentMethod) ||
                    vehicles.length === 0
                  }
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {step === 'type' && 'Continue'}
                  {step === 'time' && 'Go to Payment'}
                  {step === 'payment' && 'Upload Payment Proof'}
                </button>
              )}
              
              {(step as any) === 'upload' && !paymentSlipUrl && (
                <button
                  onClick={() => setShowPaymentSlipUpload(true)}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  {t('upload_payment_slip')}
                </button>
              )}
              
              {(step as any) === 'upload' && paymentSlipUrl && (
                <div className="flex-1 bg-green-50 border border-green-200 py-3 px-4 rounded-lg text-center">
                  <span className="text-green-700 font-semibold">{t('payment_slip_uploaded_title')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Slip Upload Modal */}
      {showPaymentSlipUpload && (
        <PaymentSlipUpload 
          bookingId={bookingId}
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
              <h3 className="text-xl font-bold">{t('scan_qr_code')}</h3>
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
                {t('scan_qr_payment_amount', { amount: calculateTotal() })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Session Restore Dialog */}
      {showSessionRestoreDialog && pendingSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">{t('incomplete_booking_found')}</h3>
              </div>

              <div className="mb-6">
                {pendingSession.step === 'success' ? (
                  <p className="text-green-600 mb-4">
                    {t('booking_already_completed_message')}
                  </p>
                ) : (
                  <p className="text-gray-600 mb-4">
                    {t('incomplete_booking_message')}
                  </p>
                )}
                
                {pendingSession.step && (
                  <div className={`rounded-lg p-4 mb-4 ${
                    pendingSession.step === 'success' ? 'bg-green-50' : 'bg-blue-50'
                  }`}>
                    <div className={`text-sm mb-1 ${
                      pendingSession.step === 'success' ? 'text-green-700' : 'text-blue-700'
                    }`}>
                      {pendingSession.step === 'success' ? t('booking_status') : t('incomplete_session_description')}:
                    </div>
                    <div className={`font-semibold ${
                      pendingSession.step === 'success' ? 'text-green-900' : 'text-blue-900'
                    }`}>
                      {pendingSession.step === 'type' && t('incomplete_session_step_booking_type')}
                      {pendingSession.step === 'time' && t('incomplete_session_step_time_selection')}
                      {pendingSession.step === 'payment' && t('incomplete_session_step_payment_method')}
                      {pendingSession.step === 'upload' && t('incomplete_session_step_upload_slip')}
                      {pendingSession.step === 'success' && t('incomplete_session_step_completed')}
                      {!['type', 'time', 'payment', 'upload', 'success'].includes(pendingSession.step) && t('incomplete_session_step_unknown')}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleStartNewBooking}
                  className="flex-1 border border-gray-200 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  {t('start_new_booking')}
                </button>
                <button
                  onClick={handleRestoreSession}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                    pendingSession.step === 'success' 
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {pendingSession.step === 'success' ? t('view_bookings') : t('continue_booking')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingPage;