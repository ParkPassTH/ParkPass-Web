import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  QrCode, 
  MapPin, 
  Calendar, 
  Star, 
  DollarSign,
  Users,
  Car,
  Plus,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  ToggleLeft,
  ToggleRight,
  Bell,
  Download,
  Search,
  Filter,
  MoreHorizontal,
  Settings,
  FileText,
  PieChart,
  CalendarDays,
  Save,
  CreditCard,
  Building2,
  Upload,
  Copy,
  Check,
  X,
  Image,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { QRScanner } from '../../components/QRScanner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// Separate component for Account Name input to prevent re-render issues
const AccountNameInput = memo(({ 
  value, 
  onChange, 
  placeholder = "Your name or business name",
  id 
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  // Sync local value with prop value only when not focused and not typing
  useEffect(() => {
    if (!isFocused && !isTyping) {
      setLocalValue(value);
    }
  }, [value, isFocused, isTyping]);
  
  // Create debounced function with long delay for typing
  const debouncedOnChangeRef = useRef<any>();
  
  useEffect(() => {
    debouncedOnChangeRef.current = debounce((newValue: string) => {
      onChange(newValue);
      setIsTyping(false); // Mark as finished typing
    }, 2000); // 2 seconds delay - very long to avoid interrupting typing
    
    return () => {
      if (debouncedOnChangeRef.current?.cancel) {
        debouncedOnChangeRef.current.cancel();
      }
    };
  }, [onChange]);
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    setIsTyping(true); // Mark as currently typing
    
    // Call debounced function
    if (debouncedOnChangeRef.current) {
      debouncedOnChangeRef.current(newValue);
    }
  }, []);
  
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);
  
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setIsTyping(false);
    
    // Cancel any pending debounced calls
    if (debouncedOnChangeRef.current?.cancel) {
      debouncedOnChangeRef.current.cancel();
    }
    
    // Immediately sync on blur
    onChange(localValue);
  }, [localValue, onChange]);
  
  return (
    <div className="relative">
      <input 
        id={id}
        type="text" 
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
      />
      {isTyping && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );
});

// Enhanced debounce function with cancellation
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  const debouncedFunction = function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
  
  // Add cancel method
  debouncedFunction.cancel = () => {
    clearTimeout(timeout);
  };
  
  return debouncedFunction;
};

// QR Code Settings Component to isolate re-renders
const QRCodeSettings = memo(({ 
  paymentMethods, 
  handleQrAccountNameChange, 
  handleQrImageUpload,
  handlePaymentMethodSave,
  paymentLoading,
  qrImagePreview 
}: {
  paymentMethods: any;
  handleQrAccountNameChange: (value: string) => void;
  handleQrImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePaymentMethodSave: (method: 'qr_code') => void;
  paymentLoading: boolean;
  qrImagePreview: string;
}) => {
  const copyQRCode = () => {
    if (paymentMethods.qr_code.qr_code_url) {
      navigator.clipboard.writeText(paymentMethods.qr_code.qr_code_url);
      alert('QR Code URL copied to clipboard!');
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-gray-200">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
        <AccountNameInput
          key="qr-account-name"
          id="qr-account-name"
          value={paymentMethods.qr_code.account_name}
          onChange={handleQrAccountNameChange}
          placeholder="Your name or business name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">QR Code Image</label>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              type="file"
              accept="image/*"
              onChange={handleQrImageUpload}
              className="hidden"
              id="qr-upload"
            />
            <label
              htmlFor="qr-upload"
              className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Upload QR Code</span>
            </label>
            {(qrImagePreview || paymentMethods.qr_code.qr_code_url) && (
              <button
                type="button"
                onClick={copyQRCode}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Copy className="h-4 w-4" />
                <span>Copy URL</span>
              </button>
            )}
          </div>
          {(qrImagePreview || paymentMethods.qr_code.qr_code_url) && (
            <div className="flex items-center space-x-3">
              <img
                src={qrImagePreview || paymentMethods.qr_code.qr_code_url}
                alt="QR Code Preview"
                className="w-24 h-24 object-cover rounded-lg border border-gray-200"
              />
              <div className="text-sm text-gray-600">
                <p>QR Code {qrImagePreview ? 'ready to upload' : 'uploaded successfully'}</p>
                <p className="text-xs">Customers will see this QR code for payments</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => handlePaymentMethodSave('qr_code')}
          disabled={paymentLoading}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {paymentLoading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save QR Payment</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});

QRCodeSettings.displayName = 'QRCodeSettings';

export const OwnerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'spots' | 'bookings' | 'reviews' | 'reports' | 'settings' | 'payments'>('home');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'success' | 'error' | 'processing' | null>(null);
  const [scanMessage, setScanMessage] = useState<string>('');
  const [parkingSpots, setParkingSpots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  // Payment verification modal state
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState({
    qr_code: {
      enabled: false,
      qr_code_url: '',
      account_name: ''
    },
    bank_account: {
      enabled: false,
      bank_name: '',
      account_number: '',
      account_name: ''
    }
  });
  
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [qrImageFile, setQrImageFile] = useState<File | null>(null);
  const [qrImagePreview, setQrImagePreview] = useState<string>('');

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredBookings = bookings.filter((booking) => {
    const search = searchQuery.toLowerCase();
    const matchesSearch =
      booking.id.toLowerCase().includes(search) ||
      booking.id.slice(-6).toLowerCase().includes(search) ||
      (booking.profiles?.name && booking.profiles.name.toLowerCase().includes(search)) ||
      (booking.profiles?.email && booking.profiles.email.toLowerCase().includes(search));
    const matchesStatus = statusFilter ? booking.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];


  useEffect(() => {
    loadData();
    loadPaymentMethods();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [spotsData, bookingsData, pendingPaymentsData] = await Promise.all([
        fetchParkingSpots(),
        fetchBookings(),
        fetchPendingPayments()
      ]);
      
      setParkingSpots(spotsData);
      setBookings(bookingsData);
      setPendingPayments(pendingPaymentsData);
      
      // Load reviews for all owner's spots
      if (spotsData.length > 0) {
        const allReviews = await fetchReviews(spotsData.map(spot => spot.id));
        setReviews(allReviews);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchParkingSpots = async () => {
    if (!profile?.id) return [];
    
    const { data, error } = await supabase
      .from('parking_spots')
      .select('*')
      .eq('owner_id', profile.id);
      
    if (error) throw error;
    return data || [];
  };

  const fetchBookings = async () => {
    if (!profile?.id) return [];
    
    // Get all spots owned by this user
    const { data: spots } = await supabase
      .from('parking_spots')
      .select('id')
      .eq('owner_id', profile.id);
      
    if (!spots || spots.length === 0) return [];
    
    // Get bookings for all these spots
    const spotIds = spots.map(spot => spot.id);
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        profiles (name, email),
        parking_spots (name, address),
        vehicles (make, model, license_plate, color)
      `)
      .in('spot_id', spotIds)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  };

  const fetchPendingPayments = async () => {
    if (!profile?.id) return [];
    
    // Get all spots owned by this user
    const { data: spots } = await supabase
      .from('parking_spots')
      .select('id')
      .eq('owner_id', profile.id);
      
    if (!spots || spots.length === 0) return [];
    
    // Get spot IDs
    const spotIds = spots.map(spot => spot.id);
    
    // Get bookings with pending payments for these spots
    const { data: bookingsWithPendingPayments, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        user_id,
        spot_id,
        start_time,
        end_time,
        total_cost,
        status,
        payment_status,
        created_at,
        vehicle_id,
        profiles:user_id (name, email),
        parking_spots:spot_id (name, address),
        vehicles:vehicle_id (make, model, license_plate, color)
      `)
      .in('spot_id', spotIds)
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: false });
      
    if (bookingsError) throw bookingsError;
    
    // Get payment slips for these bookings
    const bookingIds = bookingsWithPendingPayments?.map(b => b.id) || [];
    
    if (bookingIds.length === 0) return [];
    
    const { data: paymentSlips, error: slipsError } = await supabase
      .from('payment_slips')
      .select('*')
      .in('booking_id', bookingIds)
      .eq('status', 'pending');
      
    if (slipsError) throw slipsError;
    
    // Combine booking and payment slip data
    const pendingPayments = paymentSlips?.map(slip => {
      const booking = bookingsWithPendingPayments?.find(b => b.id === slip.booking_id);
      return {
        ...slip,
        booking
      };
    }) || [];
    
    return pendingPayments;
  };

  const fetchReviews = async (spotIds: string[]) => {
    if (spotIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        profiles:user_id (name)
      `)
      .in('spot_id', spotIds)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  };

  const loadPaymentMethods = async () => {
    try {
      // Load existing payment methods from database
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('owner_id', profile?.id)
        .eq('is_active', true);

      if (error) throw error;

      if (data && data.length > 0) {
        const qrMethod = data.find(pm => pm.type === 'qr_code');
        const bankMethod = data.find(pm => pm.type === 'bank_transfer');

        setPaymentMethods({
          qr_code: {
            enabled: !!qrMethod,
            qr_code_url: qrMethod?.qr_code_url || '',
            account_name: qrMethod?.account_name || ''
          },
          bank_account: {
            enabled: !!bankMethod,
            bank_name: bankMethod?.bank_name || '',
            account_number: bankMethod?.account_number || '',
            account_name: bankMethod?.account_name || ''
          }
        });
      }
    } catch (err) {
      console.error('Error loading payment methods:', err);
    }
  };

  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setQrImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setQrImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadQrImage = async (file: File): Promise<string> => {
    try {
      const fileName = `qr-${profile?.id}-${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `payment-qr-codes/${fileName}`;

      const { data, error } = await supabase.storage
        .from('payment-qr-codes')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-qr-codes')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading QR image:', error);
      throw new Error('Failed to upload QR code image');
    }
  };

  const handlePaymentMethodToggle = (method: 'qr_code' | 'bank_account') => {
    setPaymentMethods(prev => ({
      ...prev,
      [method]: {
        ...prev[method],
        enabled: !prev[method].enabled
      }
    }));
  };

  // Handler for account name changes - more specific handlers to reduce re-renders
  const handleQrAccountNameChange = useCallback((value: string) => {
    setPaymentMethods(prev => ({
      ...prev,
      qr_code: { ...prev.qr_code, account_name: value }
    }));
  }, []);

  const handleBankAccountNameChange = useCallback((value: string) => {
    setPaymentMethods(prev => ({
      ...prev,
      bank_account: { ...prev.bank_account, account_name: value }
    }));
  }, []);

  // Generic handler (keeping for compatibility)
  const handleAccountNameChange = useCallback((method: 'qr_code' | 'bank_account', value: string) => {
    setPaymentMethods(prev => ({
      ...prev,
      [method]: { ...prev[method], account_name: value }
    }));
  }, []);

  const handlePaymentMethodSave = async (method: 'qr_code' | 'bank_transfer') => {
    if (!profile?.id) {
      alert('User profile not found');
      return;
    }

    setPaymentLoading(true);
    try {
      let qrCodeUrl = paymentMethods.qr_code.qr_code_url;
      
      // Upload new QR image if provided
      if (method === 'qr_code' && qrImageFile) {
        qrCodeUrl = await uploadQrImage(qrImageFile);
      }

      // Prepare payment method data
      const paymentMethodData = {
        owner_id: profile.id,
        type: method,
        qr_code_url: method === 'qr_code' ? qrCodeUrl : null,
        account_name: method === 'qr_code' ? paymentMethods.qr_code.account_name : paymentMethods.bank_account.account_name,
        bank_name: method === 'bank_transfer' ? paymentMethods.bank_account.bank_name : null,
        account_number: method === 'bank_transfer' ? paymentMethods.bank_account.account_number : null,
        is_active: paymentMethods[method === 'qr_code' ? 'qr_code' : 'bank_account'].enabled
      };

      // Check if payment method already exists
      const { data: existingMethod } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('owner_id', profile.id)
        .eq('type', method)
        .single();

      if (existingMethod) {
        // Update existing payment method
        const { error } = await supabase
          .from('payment_methods')
          .update(paymentMethodData)
          .eq('id', existingMethod.id);

        if (error) throw error;
      } else {
        // Create new payment method
        const { error } = await supabase
          .from('payment_methods')
          .insert(paymentMethodData);

        if (error) throw error;
      }
      
      // Update local state
      if (method === 'qr_code') {
        setPaymentMethods(prev => ({
          ...prev,
          qr_code: {
            ...prev.qr_code,
            qr_code_url: qrCodeUrl
          }
        }));
      }
      
      alert(`${method === 'qr_code' ? 'QR Code' : 'Bank Account'} payment method saved successfully!`);
      setQrImageFile(null);
      setQrImagePreview('');
    } catch (err: any) {
      console.error('Error saving payment method:', err);
      alert(`Failed to save payment method: ${err.message}`);
    } finally {
      setPaymentLoading(false);
    } 
  };

  const copyQRCode = () => {
    if (paymentMethods.qr_code.qr_code_url) {
      navigator.clipboard.writeText(paymentMethods.qr_code.qr_code_url);
      alert('QR Code URL copied to clipboard!');
    }
  };

  // Calculate real average rating from reviews
  const calculateAverageRating = () => {
    if (reviews.length === 0) return '0.0';
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return (totalRating / reviews.length).toFixed(1);
  };

  const stats = [
    { 
      label: 'Today\'s Revenue', 
      value: `$${bookings.filter(b => new Date(b.created_at).toDateString() === new Date().toDateString()).reduce((sum, b) => sum + b.total_cost, 0)}`, 
      change: '+15%', 
      icon: DollarSign, 
      color: 'text-green-600' 
    },
    { 
      label: 'Active Bookings', 
      value: bookings.filter(b => b.status === 'active' || b.status === 'confirmed').length.toString(), 
      change: '+8%', 
      icon: Calendar, 
      color: 'text-blue-600' 
    },
    { 
      label: 'Total Spots', 
      value: parkingSpots.length.toString(), 
      change: '0%', 
      icon: MapPin, 
      color: 'text-purple-600' 
    },
    { 
      label: 'Avg Rating', 
      value: calculateAverageRating(), 
      change: '+0.2', 
      icon: Star, 
      color: 'text-yellow-600' 
    },
  ];

  const todayBookings = bookings.filter(booking => 
    new Date(booking.created_at).toDateString() === new Date().toDateString()
  ).slice(0, 3);

  const handleQRScan = async (data: string) => {
    setScanResult(data);
    setScanStatus('processing');
    setScanMessage('Processing scan...');
    try {
      const isPin = /^\d{4}$/.test(data);
      
      // For PIN, we need to be extra careful about security
      let searchQuery;
      if (isPin) {
        searchQuery = `pin.eq.${data}`;
      } else {
        // For QR Code, try to parse JSON first
        try {
          const qrData = JSON.parse(data);
          if (qrData.type === 'parking_verification' && qrData.bookingId && qrData.spotId) {
            // This is the new secure QR format
            searchQuery = `id.eq.${qrData.bookingId}`;
          } else {
            // Fallback to old format
            searchQuery = `qr_code.eq.${data}`;
          }
        } catch {
          // Not JSON, treat as old QR format
          searchQuery = `qr_code.eq.${data}`;
        }
      }
      
      const { data: bookingData, error } = await supabase
        .from('bookings')
        .select('*')
        .or(searchQuery)
        .single();
        
      if (error || !bookingData) {
        setScanStatus('error');
        setScanMessage('Invalid QR code or PIN. No matching booking found.');
        return;
      }
      
      // Additional security check for QR codes with spot verification
      if (!isPin) {
        try {
          const qrData = JSON.parse(data);
          if (qrData.type === 'parking_verification' && qrData.spotId) {
            if (qrData.spotId !== bookingData.spot_id) {
              setScanStatus('error');
              setScanMessage('QR code is not valid for this parking spot.');
              return;
            }
          }
        } catch {
          // Old QR format, no additional check needed
        }
      }
      
      const { data: spotData } = await supabase
        .from('parking_spots')
        .select('*')
        .eq('id', bookingData.spot_id)
        .eq('owner_id', profile?.id)
        .single();
        
      if (!spotData) {
        setScanStatus('error');
        setScanMessage('This booking is not for one of your parking spots.');
        return;
      }
      
      if (bookingData.payment_status !== 'verified') {
        setScanStatus('error');
        setScanMessage('Payment for this booking has not been verified yet.');
        return;
      }
  
      // ตรวจสอบสถานะ booking ทีละขั้น
      if (bookingData.status === 'confirmed') {
        // เปลี่ยนเป็น active (เข้า)
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', bookingData.id);
        if (updateError) throw updateError;
  
        // ลด available_slots
        await supabase
          .from('parking_spots')
          .update({
            available_slots: spotData.available_slots - 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', spotData.id);
  
        setScanStatus('success');
        setScanMessage('Entry confirmed! Booking is now active.');
      } else if (bookingData.status === 'active') {
        // เปลี่ยนเป็น completed (ออก)
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', bookingData.id);
        if (updateError) throw updateError;
  
        // เพิ่ม available_slots
        await supabase
          .from('parking_spots')
          .update({
            available_slots: spotData.available_slots + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', spotData.id);
  
        setScanStatus('success');
        setScanMessage('Exit confirmed! Booking is now completed.');
      } else if (bookingData.status === 'completed') {
        setScanStatus('success');
        setScanMessage('This booking has already been completed. QR/PIN verified - Status: COMPLETED');
      } else if (bookingData.status === 'cancelled') {
        // แสดงสถานะยกเลิกแต่ยังทำการยืนยันได้
        setScanStatus('success');
        setScanMessage(`การจอง #${bookingData.id.slice(-6)} ถูกยกเลิกไปแล้ว - QR/PIN ยืนยันสำเร็จ`);
      } else {
        setScanStatus('success');
        setScanMessage(`QR/PIN verified. Booking status: ${bookingData.status.toUpperCase()}`);
      }
  
      setTimeout(() => {
        setShowQRScanner(false);
        setScanResult(null);
        setScanStatus(null);
        setScanMessage('');
        loadData();
      }, 2000);
    } catch (err: any) {
      setScanStatus('error');
      setScanMessage(`Error: ${err.message || 'Failed to process scan'}`);
    }
  };

  // Payment verification functions
  const openVerificationModal = (payment: any) => {
    setSelectedPayment(payment);
    setVerificationError(null);
    setShowVerificationModal(true);
  };

  const handleVerifyPayment = async (approved: boolean) => {
    if (!selectedPayment) return;
    
    setVerificationLoading(true);
    setVerificationError(null);
    
    try {
      // Update payment slip status
      const { error: slipError } = await supabase
        .from('payment_slips')
        .update({
          status: approved ? 'verified' : 'rejected',
          verified_by: profile?.id,
          verified_at: new Date().toISOString(),
          notes: approved ? 'Manually approved by admin' : 'Rejected by admin'
        })
        .eq('id', selectedPayment.id);
        
      if (slipError) throw slipError;
      
      // Update booking status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: approved ? 'confirmed' : 'cancelled',
          payment_status: approved ? 'verified' : 'rejected',
          confirmed_at: approved ? new Date().toISOString() : null
        })
        .eq('id', selectedPayment.booking.id);
        
      if (bookingError) throw bookingError;
      
      // Refresh pending payments
      const updatedPayments = await fetchPendingPayments();
      setPendingPayments(updatedPayments);
      
      // Close modal
      setShowVerificationModal(false);
      setSelectedPayment(null);
      
      // Show success message
      alert(`Payment ${approved ? 'approved' : 'rejected'} successfully!`);
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      setVerificationError(error.message || 'Failed to process payment verification');
    } finally {
      setVerificationLoading(false);
    }
  };

  const HomeSection = () => (
    <div className="space-y-6">
      {/* QR Scanner Section */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Entry/Exit Validation
          </h3>
          <p className="text-gray-600 mb-6">
            Scan customer QR codes or enter PIN for parking entry and exit validation
          </p>
          <button
            onClick={() => setShowQRScanner(true)}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
          >
            Open Scanner
          </button>
            {scanResult && (
              <div className={`mt-4 p-4 rounded-lg ${
                scanStatus === 'success' ? 'bg-green-50' :
                scanStatus === 'error' ? 'bg-red-50' :
                'bg-blue-50'
              }`}>
                <div className="flex items-center justify-center space-x-2 text-gray-800">
                  {scanStatus === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : scanStatus === 'error' ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-blue-600 animate-spin" />
                  )}
                  <span className={`font-medium ${
                    scanStatus === 'success' ? 'text-green-800' :
                    scanStatus === 'error' ? 'text-red-800' :
                    'text-blue-800'
                  }`}>
                    {scanMessage}
                  </span>
                </div>
                <p className="text-sm mt-1 text-gray-700">Code: {scanResult}</p>
              </div>
            )}
        </div>
      </div>

      {/* Today's Summary */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Today's Bookings</h3>
          <span className="text-sm text-gray-500">{new Date().toLocaleDateString()}</span>
        </div>
        
        <div className="space-y-3">
          {todayBookings.length > 0 ? (
            todayBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Booking #{booking.id.slice(-6)} - {booking.status}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(booking.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              No bookings today
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            <span className="font-medium">Report Issue</span>
          </button>
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Bell className="h-6 w-6 text-blue-600" />
            <span className="font-medium">Notifications</span>
          </button>
        </div>
      </div>
    </div>
  );

  const DashboardSection = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  stat.color === 'text-green-600' ? 'bg-green-100' :
                  stat.color === 'text-blue-600' ? 'bg-blue-100' :
                  stat.color === 'text-purple-600' ? 'bg-purple-100' :
                  'bg-yellow-100'
                }`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <span className={`text-sm font-medium ${
                  stat.change.startsWith('+') ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {stat.change}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      {/* <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Revenue chart would be here</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Distribution</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Booking distribution chart</p>
            </div>
          </div>
        </div>
      </div> */}

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {bookings.slice(0, 4).map((booking) => (
            <div key={booking.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${
                booking.status === 'confirmed' ? 'bg-blue-600' :
                booking.status === 'completed' ? 'bg-green-600' :
                booking.status === 'cancelled' ? 'bg-red-600' :
                'bg-yellow-600'
              }`}></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Booking #{booking.id.slice(-6)} - {booking.status}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(booking.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const SpotsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">My Parking Spots</h3>
          <Link
            to="/owner/add-spot"
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Spot</span>
          </Link>
        </div>

        <div className="space-y-4">
          {parkingSpots.length > 0 ? (
            parkingSpots.map((spot) => (
              <div key={spot.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{spot.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        !spot.is_approved
                          ? 'bg-yellow-100 text-yellow-800'
                          : spot.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {!spot.is_approved
                          ? 'Pending Approval'
                          : spot.is_active
                            ? 'Active'
                            : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{spot.address}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{spot.available_slots}/{spot.total_slots} available</span>
                      <span>•</span>
                      <span>${spot.price}/{spot.price_type}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors">
                      <Eye className="h-4 w-4" />
                    </button> */}
                    <Link
                      to={`/owner/edit-spot/${spot.id}`}
                      className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    {/* <Link
                      to={`/owner/availability/${spot.id}`}
                      className="p-2 text-gray-600 hover:text-purple-600 transition-colors"
                      title="Manage Availability"
                    >
                      <CalendarDays className="h-4 w-4" />
                    </Link> */}
                    {/* <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors">
                      {spot.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    </button> */}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No parking spots found</p>
              <Link
                to="/owner/add-spot"
                className="inline-flex items-center space-x-2 mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Your First Spot</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const BookingsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Booking Management</h3>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="relative w-full sm:w-64 flex">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') setSearchQuery(searchInput);
                }}
                className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
              <button
                onClick={() => setSearchQuery(searchInput)}
                className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors text-sm"
                title="Search"
              >
                Search
              </button>
            </div>
            <select
              value={statusFilter || ''}
              onChange={e => setStatusFilter(e.target.value || null)}
              className="py-2 px-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-semibold text-gray-900">ID</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-900">Date</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-900">Customer</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-900">Status</th>
                <th className="hidden sm:table-cell text-left py-2 px-2 font-semibold text-gray-900">Amount</th>
                {/* <th className="hidden sm:table-cell text-left py-2 px-2 font-semibold text-gray-900">Actions</th> */}
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-2 font-mono">#{booking.id.slice(-6)}</td>
                  <td className="py-2 px-2 text-gray-600">
                    <div>{new Date(booking.start_time).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(booking.start_time).toLocaleTimeString()} - {new Date(booking.end_time).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <div className="text-xs font-medium">
                      {booking.profiles?.name
                        ? booking.profiles.name
                        : booking.user_id
                          ? booking.user_id.slice(0, 8) + '...'
                          : '-'}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      booking.status === 'active' ? 'bg-green-100 text-green-800' :
                      booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status}
                    </span>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Payment: {booking.payment_status}
                    </div>
                  </td>
                  <td className="hidden sm:table-cell py-2 px-2 font-semibold text-gray-900">${booking.total_cost}</td>
                  <td className="hidden sm:table-cell py-2 px-2">
                    <div className="flex items-center space-x-1">
                      {/* <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                        <Eye className="h-4 w-4 text-gray-500" />
                      </button> */}
                      {booking.status === 'active' && (
                        <button className="p-1 hover:bg-red-100 rounded transition-colors">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">
                    No bookings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const ReviewsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Reviews & Feedback</h3>
          <div className="text-sm text-gray-500">
            <div className="text-2xl font-bold text-gray-900">{calculateAverageRating()}</div>
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < Math.floor(parseFloat(calculateAverageRating())) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
              ))}
            </div>
            <div className="text-sm text-gray-500">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-gray-900">
                        {review.is_anonymous ? 'Anonymous Customer' : review.profiles?.name || 'Customer Review'}
                      </span>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {review.rating}/5
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-gray-700 mb-3">{review.comment}</p>
                )}
                {review.photos && review.photos.length > 0 && (
                  <div className="flex space-x-2 mb-3">
                    {review.photos.map((photo: string, index: number) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Review photo ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Star className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No reviews yet</p>
            <p className="text-sm">Reviews will appear here once customers start rating your parking spots</p>
          </div>
        )}
      </div>
    </div>
  );

  const ReportsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Reports & Analytics</h3>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">Revenue</span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              ${bookings.reduce((sum, b) => sum + b.total_cost, 0)}
            </div>
            <div className="text-sm text-green-700">Total earned</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Bookings</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{bookings.length}</div>
            <div className="text-sm text-blue-700">Total bookings</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-900">Spots</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">{parkingSpots.length}</div>
            <div className="text-sm text-purple-700">Active spots</div>
          </div>
        </div>
      </div>
    </div>
  );

  const SettingsSection = () => (
    <div className="space-y-6">
      {/* Owner Information - Read Only */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Owner Information</h3>
          <div className="text-sm text-gray-500">
            Edit in <Link to="/profile" className="text-blue-600 hover:text-blue-800 font-medium">Profile Page</Link>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
              {profile?.name || 'Not set'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
              {profile?.email || 'Not set'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
              {profile?.phone || 'Not set'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
              {profile?.business_name || 'Not set'}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
          <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
            {profile?.business_address || 'Not set'}
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Methods</h3>
        
        <div className="space-y-6">
          {/* QR Code Payment */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <QrCode className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">QR Code Payment</h4>
                  <p className="text-sm text-gray-600">Accept payments via QR code (PromptPay, etc.)</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  paymentMethods.qr_code.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {paymentMethods.qr_code.enabled ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => handlePaymentMethodToggle('qr_code')}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {paymentMethods.qr_code.enabled ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                </button>
              </div>
            </div>
            
            {paymentMethods.qr_code.enabled && (
              <QRCodeSettings
                paymentMethods={paymentMethods}
                handleQrAccountNameChange={handleQrAccountNameChange}
                handleQrImageUpload={handleQrImageUpload}
                handlePaymentMethodSave={handlePaymentMethodSave}
                paymentLoading={paymentLoading}
                qrImagePreview={qrImagePreview}
              />
            )}
          </div>

          {/* Bank Account Payment */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Bank Account Transfer</h4>
                  <p className="text-sm text-gray-600">Accept direct bank transfers (Coming Soon)</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Next Phase
                </span>
                <button
                  disabled
                  className="text-gray-400 cursor-not-allowed"
                >
                  <ToggleLeft className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    Bank account payment integration will be available in the next phase of development.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h3>
        <div className="space-y-3">
          {[
            { label: 'New Bookings', description: 'Get notified when customers make new bookings' },
            { label: 'Payment Received', description: 'Receive alerts when payments are processed' },
            { label: 'Customer Reviews', description: 'Be notified of new customer reviews' },
            { label: 'System Updates', description: 'Important system and feature updates' },
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
              <div>
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const PaymentsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Payment Verification</h3>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              {pendingPayments.length} Pending
            </span>
            <button 
              onClick={() => loadData()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>

        {pendingPayments.length > 0 ? (
          <div className="space-y-4">
            {pendingPayments.map((payment) => (
              <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-4 md:gap-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={payment.image_url} 
                        alt="Payment slip" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Booking #{payment.booking?.id.slice(-6) || 'Unknown'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {payment.booking?.profiles?.name || 'Unknown customer'}
                      </p>
                      {payment.booking?.vehicles && (
                        <p className="text-sm text-gray-600">
                          🚗 {payment.booking.vehicles.license_plate} ({payment.booking.vehicles.make} {payment.booking.vehicles.model})
                        </p>
                      )}
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-blue-600 font-medium">${payment.booking?.total_cost || 0}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-600">{new Date(payment.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 w-full md:w-auto">
                    <button
                      onClick={() => openVerificationModal(payment)}
                      className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Verify</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No pending payments to verify</p>
            <p className="text-sm">All payment slips have been processed</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={loadData}
            className="mt-2 text-red-600 hover:text-red-800 font-medium"
          >
            Try again
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'home': return <HomeSection />;
      case 'dashboard': return <DashboardSection />;
      case 'spots': return <SpotsSection />;
      case 'bookings': return <BookingsSection />;
      case 'reviews': return <ReviewsSection />;
      case 'reports': return <ReportsSection />;
      case 'settings': return <SettingsSection />;
      case 'payments': return <PaymentsSection />;
      default: return <HomeSection />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Parking Owner Dashboard
          </h1>
          <p className="text-gray-600">
            Manage your parking spots and monitor performance
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { id: 'home', label: 'Home', icon: QrCode },
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'spots', label: 'My Spots', icon: MapPin },
              { id: 'bookings', label: 'Bookings', icon: Calendar },
              { id: 'payments', label: 'Payments', icon: CreditCard, badge: pendingPayments.length },
              { id: 'reviews', label: 'Reviews', icon: Star },
              { id: 'reports', label: 'Reports', icon: FileText },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-6 font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                  {tab.badge && tab.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {renderContent()}

        {/* QR Scanner Modal */}
        {showQRScanner && (
          <QRScanner
            onScan={handleQRScan}
            onClose={() => setShowQRScanner(false)}
          />
        )}

        {/* Payment Verification Modal */}
        {showVerificationModal && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Verify Payment</h3>
                  <button
                    onClick={() => setShowVerificationModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {verificationError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <p className="text-red-700">{verificationError}</p>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Payment Slip Image */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Payment Slip</h4>
                    <div className="relative bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                      <div className="relative">
                        <img 
                          src={selectedPayment.image_url} 
                          alt="Payment slip" 
                          className="w-full h-auto cursor-pointer"
                          onClick={() => setShowFullImage(true)}
                        />
                        <button
                          onClick={() => setShowFullImage(true)}
                          className="absolute bottom-2 right-2 bg-white bg-opacity-80 p-2 rounded-full shadow-md hover:bg-opacity-100 transition-all"
                        >
                          <Image className="h-5 w-5 text-gray-700" />
                        </button>
                      </div>
                    </div>
                    
                    {/* OCR Results (if available) */}
                    {selectedPayment.ocr_text && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h5 className="font-medium text-gray-900 mb-2">OCR Results</h5>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {selectedPayment.ocr_text}
                        </div>
                        {selectedPayment.ocr_verification !== null && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="flex items-center space-x-2">
                              {selectedPayment.ocr_verification ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                              )}
                              <span className={`text-sm font-medium ${
                                selectedPayment.ocr_verification ? 'text-green-700' : 'text-yellow-700'
                              }`}>
                                {selectedPayment.ocr_verification 
                                  ? 'Automatically verified' 
                                  : 'Manual verification needed'}
                              </span>
                            </div>
                            {selectedPayment.ocr_confidence > 0 && (
                              <p className="text-xs text-gray-600 mt-1">
                                Confidence: {(selectedPayment.ocr_confidence * 100).toFixed(0)}%
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Booking Details */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Booking Details</h4>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600">Customer</p>
                          <p className="font-medium text-gray-900">
                            {selectedPayment.booking?.profiles?.name || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {selectedPayment.booking?.profiles?.email || 'No email'}
                          </p>
                        </div>
                        
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-600">Parking Spot</p>
                          <p className="font-medium text-gray-900">
                            {selectedPayment.booking?.parking_spots?.name || 'Unknown spot'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {selectedPayment.booking?.parking_spots?.address || 'No address'}
                          </p>
                        </div>
                        
                        {selectedPayment.booking?.vehicles && (
                          <div className="pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-600">Vehicle Information</p>
                            <p className="font-medium text-gray-900">
                              🚗 {selectedPayment.booking.vehicles.license_plate}
                            </p>
                            <p className="text-sm text-gray-600">
                              {selectedPayment.booking.vehicles.make} {selectedPayment.booking.vehicles.model}
                            </p>
                            {selectedPayment.booking.vehicles.color && (
                              <p className="text-sm text-gray-600">
                                Color: {selectedPayment.booking.vehicles.color}
                              </p>
                            )}
                          </div>
                        )}
                        
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-600">Booking Time</p>
                          <p className="font-medium text-gray-900">
                            {new Date(selectedPayment.booking?.start_time).toLocaleDateString()} {new Date(selectedPayment.booking?.start_time).toLocaleTimeString()} - {new Date(selectedPayment.booking?.end_time).toLocaleTimeString()}
                          </p>
                        </div>
                        
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-600">Payment Amount</p>
                          <p className="text-2xl font-bold text-blue-600">
                            ${selectedPayment.booking?.total_cost || 0}
                          </p>
                        </div>
                        
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-600">Payment Status</p>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                              Pending Verification
                            </span>
                            <span className="text-sm text-gray-600">
                              Uploaded {new Date(selectedPayment.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Verification Actions */}
                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Verification Action</h4>
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 mb-4">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-blue-800">Please verify this payment carefully</p>
                            <p className="text-xs text-blue-700 mt-1">
                              Check that the payment amount matches the booking total and that the payment was made to your account.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleVerifyPayment(false)}
                          disabled={verificationLoading}
                          className="flex-1 flex items-center justify-center space-x-2 border border-red-200 text-red-600 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {verificationLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <X className="h-5 w-5" />
                              <span>Reject Payment</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleVerifyPayment(true)}
                          disabled={verificationLoading}
                          className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {verificationLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <Check className="h-5 w-5" />
                              <span>Approve Payment</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Image Modal */}
        {showFullImage && selectedPayment && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowFullImage(false)}
          >
            <button 
              onClick={() => setShowFullImage(false)}
              className="absolute top-4 right-4 text-white p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            
            <img
              src={selectedPayment.image_url}
              alt="Payment slip"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
};