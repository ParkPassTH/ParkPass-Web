import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  QrCode, 
  MapPin, 
  Calendar, 
  CalendarDays,
  Star, 
  DollarSign,
  Plus,
  AlertTriangle,
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
  Settings,
  FileText,
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
import { useLanguage } from '../../contexts/LanguageContext';

// Separate component for Account Name input to prevent re-render issues
const AccountNameInput = memo(({ 
  value, 
  onChange, 
  placeholder,
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
  qrImagePreview,
  t,
  copyQRCode
}: {
  paymentMethods: any;
  handleQrAccountNameChange: (value: string) => void;
  handleQrImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePaymentMethodSave: (method: 'qr_code') => void;
  paymentLoading: boolean;
  qrImagePreview: string;
  t: (key: string) => string;
  copyQRCode: () => void;
}) => {
  return (
    <div className="space-y-4 pt-4 border-t border-gray-200">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('account_name')}</label>
        <AccountNameInput
          key="qr-account-name"
          id="qr-account-name"
          value={paymentMethods.qr_code.account_name}
          onChange={handleQrAccountNameChange}
          placeholder={t('account_name_placeholder')}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('qr_code_image')}</label>
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
              <span>{t('upload_qr_code')}</span>
            </label>
            {(qrImagePreview || paymentMethods.qr_code.qr_code_url) && (
              <button
                type="button"
                onClick={copyQRCode}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Copy className="h-4 w-4" />
                <span>{t('copy_url')}</span>
              </button>
            )}
          </div>
          {(qrImagePreview || paymentMethods.qr_code.qr_code_url) && (
            <div className="flex items-center space-x-3">
              <img
                src={qrImagePreview || paymentMethods.qr_code.qr_code_url}
                alt={t('qr_code_preview')}
                className="w-24 h-24 object-cover rounded-lg border border-gray-200"
              />
              <div className="text-sm text-gray-600">
                <p>{t(qrImagePreview ? 'qr_ready_upload' : 'qr_uploaded_success')}</p>
                <p className="text-xs">{t('qr_payment_description')}</p>
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
              <span>{t('saving')}</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>{t('save_qr_payment')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});

QRCodeSettings.displayName = 'QRCodeSettings';

export const OwnerDashboard: React.FC = () => {
  const { t } = useLanguage();
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

  // Booking detail modal state
  const [showBookingDetailModal, setShowBookingDetailModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

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
    { value: '', label: t('all') },
    { value: 'pending', label: t('pending') },
    { value: 'confirmed', label: t('confirmed') },
    { value: 'active', label: t('active') },
    { value: 'completed', label: t('completed') },
    { value: 'cancelled', label: t('cancelled') },
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
        alert(t('please_select_image_file'));
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(t('file_size_limit_5mb'));
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

      const { error } = await supabase.storage
        .from('payment-qr-codes')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-qr-codes')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading QR image:', error);
      throw new Error(t('failed_upload_qr'));
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

  const handlePaymentMethodSave = async (method: 'qr_code' | 'bank_transfer') => {
    if (!profile?.id) {
      alert(t('user_profile_not_found'));
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
      
      alert(method === 'qr_code' ? t('qr_payment_saved') : t('bank_payment_saved'));
      setQrImageFile(null);
      setQrImagePreview('');
    } catch (err: any) {
      console.error('Error saving payment method:', err);
      alert(`${t('failed_save_payment_method')}: ${err.message}`);
    } finally {
      setPaymentLoading(false);
    } 
  };

  const copyQRCode = () => {
    if (paymentMethods.qr_code.qr_code_url) {
      navigator.clipboard.writeText(paymentMethods.qr_code.qr_code_url);
      alert(t('qr_url_copied'));
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
      label: t('todays_revenue'), 
      value: `$${bookings.filter(b => new Date(b.created_at).toDateString() === new Date().toDateString()).reduce((sum, b) => sum + b.total_cost, 0)}`, 
      icon: DollarSign, 
      color: 'text-green-600' 
    },
    { 
      label: t('active_bookings'), 
      value: bookings.filter(b => b.status === 'active' || b.status === 'confirmed').length.toString(), 
      icon: Calendar, 
      color: 'text-blue-600' 
    },
    { 
      label: t('total_spots'), 
      value: parkingSpots.length.toString(), 
      icon: MapPin, 
      color: 'text-purple-600' 
    },
    { 
      label: t('avg_rating'), 
      value: calculateAverageRating(), 
      icon: Star, 
      color: 'text-yellow-600' 
    },
  ];

  const todayBookings = bookings.filter(booking => 
    new Date(booking.created_at).toDateString() === new Date().toDateString()
  ).slice(0, 3);

  // Function to get booking status color (same as in BookingsPage)
  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleQRScan = async (data: string) => {
    setScanResult(data);
    setScanStatus('processing');
    setScanMessage(t('processing_scan'));

    try {
      let bookingId: string | null = null;

      // Try to parse bookingId from QR data which should be a JSON string
      try {
        const qrData = JSON.parse(data);
        if (qrData.bookingId) {
          bookingId = qrData.bookingId;
        } else {
          throw new Error('Invalid QR code format. Missing bookingId.');
        }
      } catch (e) {
        // Handle cases where QR data is not a valid JSON
        console.error("QR Scan Error: Could not parse bookingId from QR data.", e);
        throw new Error(t('invalid_qr_format'));
      }

      if (!bookingId) {
        throw new Error(t('booking_id_not_found_in_qr'));
      }

      // --- Call the server API which contains the correct logic ---
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: bookingId }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // If the server responds with an error, display the server's message
        throw new Error(responseData.error || 'Failed to process check-in.');
      }

      // --- Display the result from the server ---
      setScanStatus('success');
      // Use the message directly from the server's response
      setScanMessage(responseData.message || 'Action successful!'); 

      // Reload data after showing the result for 2 seconds
      setTimeout(() => {
        setShowQRScanner(false);
        setScanResult(null);
        setScanStatus(null);
        setScanMessage('');
        loadData(); // Reload all dashboard data
      }, 2000);

    } catch (err: any) {
      setScanStatus('error');
      setScanMessage(err.message || t('failed_process_scan'));
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
      alert(t(approved ? 'payment_approved_success' : 'payment_rejected_success'));
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      setVerificationError(error.message || 'Failed to process payment verification');
    } finally {
      setVerificationLoading(false);
    }
  };

  // Booking detail functions
  const openBookingDetailModal = (booking: any) => {
    setSelectedBooking(booking);
    setShowBookingDetailModal(true);
  };

  const closeBookingDetailModal = () => {
    setSelectedBooking(null);
    setShowBookingDetailModal(false);
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
            {t('entry_exit_validation')}
          </h3>
          <p className="text-gray-600 mb-6">
            {t('entry_exit_validation_description')}
          </p>
          <button
            onClick={() => setShowQRScanner(true)}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
          >
            {t('open_scanner')}
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
          <h3 className="text-lg font-semibold text-gray-900">{t('todays_bookings')}</h3>
          <span className="text-sm text-gray-500">{new Date().toLocaleDateString('en-GB')}</span>
        </div>
        
        <div className="space-y-3">
          {todayBookings.length > 0 ? (
            todayBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">
                      {t('booking_id')}: #{booking.id.slice(-6)}
                    </p>
                    <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getBookingStatusColor(booking.status)}`}>
                      {t(booking.status)}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    {booking.parking_spots?.name || t('unknown_spot')} - ฿{booking.total_cost}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(booking.start_time).toLocaleString('en-GB', { hour12: false })} - {new Date(booking.end_time).toLocaleTimeString('en-GB', { hour12: false })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              {t('no_bookings_today')}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('quick_actions')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            <span className="font-medium">{t('report_issue')}</span>
          </button>
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Bell className="h-6 w-6 text-blue-600" />
            <span className="font-medium">{t('notifications')}</span>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recent_activity')}</h3>
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
                  {new Date(booking.created_at).toLocaleString('en-GB', { hour12: false })}
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
          <h3 className="text-lg font-semibold text-gray-900">{t('my_parking_spots')}</h3>
          <Link
            to="/owner/add-spot"
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{t('add_new_spot')}</span>
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
                          : spot.is_approved
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {!spot.is_approved
                          ? t('pending_approval')
                          : spot.is_approved
                            ? t('active')
                            : t('inactive')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{spot.address}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-2">
                      <span>{t('total_parking_slots', { total: spot.total_slots })}</span>
                      <span>•</span>
                      <span>${spot.pricing?.hour?.price || spot.price}/{spot.pricing?.hour?.enabled ? 'hour' : spot.price_type}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {spot.pricing?.hour?.enabled && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          Hourly
                        </span>
                      )}
                      {spot.pricing?.day?.enabled && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Daily
                        </span>
                      )}
                      {spot.pricing?.month?.enabled && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          Monthly
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors">
                      <Eye className="h-4 w-4" />
                    </button> */}
                    <Link
                      to={`/owner/edit-spot/${spot.id}`}
                      className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                      title={t('edit_parking_spot')}
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/owner/availability/${spot.id}`}
                      className="p-2 text-gray-600 hover:text-purple-600 transition-colors"
                      title={t('manage_availability')}
                    >
                      <CalendarDays className="h-4 w-4" />
                    </Link>
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
              <p>{t('no_parking_spots_found')}</p>
              <Link
                to="/owner/add-spot"
                className="inline-flex items-center space-x-2 mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{t('add_first_spot')}</span>
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
          <h3 className="text-lg font-semibold text-gray-900">{t('booking_management')}</h3>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="relative w-full sm:w-64 flex">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder={t('search_bookings')}
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
                title={t('search')}
              >
                {t('search')}
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
                <th className="text-left py-2 px-2 font-semibold text-gray-900">{t('table_id')}</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-900">{t('table_date')}</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-900">{t('table_customer')}</th>
                <th className="hidden md:table-cell text-left py-2 px-2 font-semibold text-gray-900">Type</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-900">{t('table_status')}</th>
                <th className="hidden sm:table-cell text-left py-2 px-2 font-semibold text-gray-900">{t('table_amount')}</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-900">{t('view_details')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-2 font-mono">#{booking.id.slice(-6)}</td>
                  <td className="py-2 px-2 text-gray-600">
                    <div>{new Date(booking.start_time).toLocaleDateString('en-GB')}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(booking.start_time).toLocaleTimeString('en-GB', { hour12: false })} - {new Date(booking.end_time).toLocaleTimeString('en-GB', { hour12: false })}
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
                  <td className="hidden md:table-cell py-2 px-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                      booking.booking_type === 'hourly' ? 'bg-blue-100 text-blue-800' :
                      booking.booking_type === 'daily' ? 'bg-green-100 text-green-800' :
                      booking.booking_type === 'monthly' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.booking_type || 'hourly'}
                    </span>
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
                      {t('payment_colon', { status: booking.payment_status })}
                    </div>
                  </td>
                  <td className="hidden sm:table-cell py-2 px-2 font-semibold text-gray-900">${booking.total_cost}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={() => openBookingDetailModal(booking)}
                        className="p-1 hover:bg-blue-100 rounded transition-colors"
                        title={t('view_details')}
                      >
                        <Eye className="h-4 w-4 text-blue-500" />
                      </button>
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
                  <td colSpan={7} className="py-6 text-center text-gray-400">
                    {t('no_bookings_found')}
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
          <h3 className="text-lg font-semibold text-gray-900">{t('reviews_feedback')}</h3>
          <div className="text-sm text-gray-500">
            <div className="text-2xl font-bold text-gray-900">{calculateAverageRating()}</div>
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < Math.floor(parseFloat(calculateAverageRating())) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
              ))}
            </div>
            <div className="text-sm text-gray-500">{t('reviews_count', { count: reviews.length, plural: reviews.length !== 1 ? 's' : '' })}</div>
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
                        {review.is_anonymous ? t('anonymous_customer') : review.profiles?.name || t('customer_review')}
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
                      {new Date(review.created_at).toLocaleDateString('en-GB')}
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
            <p>{t('no_reviews_yet')}</p>
            <p className="text-sm">{t('reviews_will_appear')}</p>
          </div>
        )}
      </div>
    </div>
  );

  const ReportsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{t('reports_analytics')}</h3>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>{t('export_report')}</span>
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">{t('revenue')}</span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              ${bookings.reduce((sum, b) => sum + b.total_cost, 0)}
            </div>
            <div className="text-sm text-green-700">{t('total_earned')}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">{t('bookings')}</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{bookings.length}</div>
            <div className="text-sm text-blue-700">{t('total_bookings')}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-900">{t('spots')}</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">{parkingSpots.length}</div>
            <div className="text-sm text-purple-700">{t('active_spots')}</div>
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
          <h3 className="text-lg font-semibold text-gray-900">{t('owner_information')}</h3>
          <div className="text-sm text-gray-500">
            {t('edit_in_profile')} <Link to="/profile" className="text-blue-600 hover:text-blue-800 font-medium">{t('profile_page')}</Link>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('full_name')}</label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
              {profile?.name || t('not_set')}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
              {profile?.email || t('not_set')}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone_number')}</label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
              {profile?.phone || t('not_set')}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('business_name')}</label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
              {profile?.business_name || t('not_set')}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('business_address')}</label>
          <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
            {profile?.business_address || t('not_set')}
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('payment_methods')}</h3>
        
        <div className="space-y-6">
          {/* QR Code Payment */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <QrCode className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{t('qr_code_payment')}</h4>
                  <p className="text-sm text-gray-600">{t('qr_payment_description')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  paymentMethods.qr_code.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {paymentMethods.qr_code.enabled ? t('active') : t('inactive')}
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
                t={t}
                copyQRCode={copyQRCode}
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
                  <h4 className="font-medium text-gray-900">{t('bank_account_transfer')}</h4>
                  <p className="text-sm text-gray-600">{t('bank_transfer_description')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {t('next_phase')}
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
                    {t('bank_integration_notice')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('notification_preferences')}</h3>
        <div className="space-y-3">
          {[
            { label: t('new_bookings'), description: t('new_bookings_desc') },
            { label: t('payment_received'), description: t('payment_received_desc') },
            { label: t('customer_reviews'), description: t('customer_reviews_desc') },
            { label: t('system_updates'), description: t('system_updates_desc') },
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
          <h3 className="text-lg font-semibold text-gray-900">{t('payment_verification')}</h3>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              {t('pending_count', { count: pendingPayments.length })}
            </span>
            <button 
              onClick={() => loadData()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('refresh')}
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
                        alt={t('payment_slip')} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Booking #{payment.booking?.id.slice(-6) || 'Unknown'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {payment.booking?.profiles?.name || t('unknown_customer')}
                      </p>
                      {payment.booking?.vehicles && (
                        <p className="text-sm text-gray-600">
                          {payment.booking.vehicles.license_plate} ({payment.booking.vehicles.make} {payment.booking.vehicles.model})
                        </p>
                      )}
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-blue-600 font-medium">${payment.booking?.total_cost || 0}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-600">{new Date(payment.created_at).toLocaleString('en-GB', { hour12: false })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 w-full md:w-auto">
                    <button
                      onClick={() => openVerificationModal(payment)}
                      className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>{t('verify')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>{t('no_pending_payments')}</p>
            <p className="text-sm">{t('all_payments_processed')}</p>
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
            {t('try_again')}
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
            {t('parking_owner_dashboard')}
          </h1>
          <p className="text-gray-600">
            {t('dashboard_description')}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { id: 'home', label: t('home'), icon: QrCode },
              { id: 'dashboard', label: t('dashboard'), icon: BarChart3 },
              { id: 'spots', label: t('my_spots'), icon: MapPin },
              { id: 'bookings', label: t('bookings'), icon: Calendar },
              { id: 'payments', label: t('payments'), icon: CreditCard, badge: pendingPayments.length },
              { id: 'reviews', label: t('reviews'), icon: Star },
              { id: 'reports', label: t('reports'), icon: FileText },
              { id: 'settings', label: t('settings'), icon: Settings },
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
                                  ? t('automatically_verified')
                                  : t('manual_verification_needed')}
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
                              {selectedPayment.booking.vehicles.license_plate}
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
                            {new Date(selectedPayment.booking?.start_time).toLocaleDateString()} {new Date(selectedPayment.booking?.start_time).toLocaleTimeString('en-GB', { hour12: false })} - {new Date(selectedPayment.booking?.end_time).toLocaleTimeString('en-GB', { hour12: false })}
                          </p>
                        </div>
                        
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-600">Booking Type</p>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                              selectedPayment.booking?.booking_type === 'hourly' ? 'bg-blue-100 text-blue-800' :
                              selectedPayment.booking?.booking_type === 'daily' ? 'bg-green-100 text-green-800' :
                              selectedPayment.booking?.booking_type === 'monthly' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {selectedPayment.booking?.booking_type || 'hourly'} booking
                            </span>
                            <span className="text-sm text-gray-600">
                              {selectedPayment.booking?.booking_type === 'hourly' ? 'Flexible time slots' :
                               selectedPayment.booking?.booking_type === 'daily' ? '24-hour access' :
                               selectedPayment.booking?.booking_type === 'monthly' ? 'Long-term parking' : 'Standard booking'}
                            </span>
                          </div>
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
                              Uploaded {new Date(selectedPayment.created_at).toLocaleString('en-GB', { hour12: false })}
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

        {/* Booking Detail Modal */}
        {showBookingDetailModal && selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {t('booking_details')}
                </h2>
                <button
                  onClick={closeBookingDetailModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Booking ID and Status */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('booking_id')}: #{selectedBooking.id.slice(-8)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('created_at')}: {new Date(selectedBooking.created_at).toLocaleDateString('en-GB')} {new Date(selectedBooking.created_at).toLocaleTimeString('en-GB', { hour12: false })}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBookingStatusColor(selectedBooking.status)}`}>
                    {t(`status_${selectedBooking.status}`)}
                  </span>
                </div>

                {/* Customer Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{t('customer_information')}</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">{t('customer_name')}</label>
                      <p className="font-medium text-gray-900">
                        {selectedBooking.profiles?.name || t('not_available')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Parking Information */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{t('parking_information')}</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">{t('parking_spot')}</label>
                      <p className="font-medium text-gray-900">
                        {selectedBooking.parking_spots?.name || t('not_available')}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">{t('address')}</label>
                      <p className="font-medium text-gray-900">
                        {selectedBooking.parking_spots?.address || t('not_available')}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-600">{t('start_time')}</label>
                        <p className="font-medium text-gray-900">
                          {new Date(selectedBooking.start_time).toLocaleDateString('en-GB')} {new Date(selectedBooking.start_time).toLocaleTimeString('en-GB', { hour12: false })}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">{t('end_time')}</label>
                        <p className="font-medium text-gray-900">
                          {new Date(selectedBooking.end_time).toLocaleDateString('en-GB')} {new Date(selectedBooking.end_time).toLocaleTimeString('en-GB', { hour12: false })}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">{t('duration')}</label>
                      <p className="font-medium text-gray-900">
                        {Math.ceil((new Date(selectedBooking.end_time).getTime() - new Date(selectedBooking.start_time).getTime()) / (1000 * 60 * 60))} {t('hours')}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Booking Type</label>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          selectedBooking.booking_type === 'hourly' ? 'bg-blue-100 text-blue-800' :
                          selectedBooking.booking_type === 'daily' ? 'bg-green-100 text-green-800' :
                          selectedBooking.booking_type === 'monthly' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedBooking.booking_type || 'hourly'} booking
                        </span>
                        <span className="text-sm text-gray-600">
                          {selectedBooking.booking_type === 'hourly' ? 'Flexible time slots' :
                           selectedBooking.booking_type === 'daily' ? '24-hour access' :
                           selectedBooking.booking_type === 'monthly' ? 'Long-term parking' : 'Standard booking'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{t('payment_information')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">{t('total_amount')}</label>
                      <p className="text-xl font-bold text-green-600">
                        ${selectedBooking.total_cost}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">{t('payment_status')}</label>
                      <p className={`font-medium ${
                        selectedBooking.payment_status === 'paid' ? 'text-green-600' :
                        selectedBooking.payment_status === 'pending' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {t(`payment_${selectedBooking.payment_status}`)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">{t('payment_method')}</label>
                      <p className="font-medium text-gray-900">
                        {selectedBooking.payment_method ? t(`payment_method_${selectedBooking.payment_method}`) : t('not_specified')}
                      </p>
                    </div>
                    {selectedBooking.payment_verified_at && (
                      <div>
                        <label className="text-sm text-gray-600">{t('payment_verified_at')}</label>
                        <p className="font-medium text-gray-900">
                          {new Date(selectedBooking.payment_verified_at).toLocaleDateString('en-GB')} {new Date(selectedBooking.payment_verified_at).toLocaleTimeString('en-GB', { hour12: false })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Information */}
                {(selectedBooking.special_requests || selectedBooking.notes) && (
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">{t('additional_information')}</h4>
                    {selectedBooking.special_requests && (
                      <div className="mb-3">
                        <label className="text-sm text-gray-600">{t('special_requests')}</label>
                        <p className="font-medium text-gray-900">
                          {selectedBooking.special_requests}
                        </p>
                      </div>
                    )}
                    {selectedBooking.notes && (
                      <div>
                        <label className="text-sm text-gray-600">{t('notes')}</label>
                        <p className="font-medium text-gray-900">
                          {selectedBooking.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Entry/Exit Information */}
                {(selectedBooking.entry_time || selectedBooking.exit_time) && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">{t('entry_exit_information')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedBooking.entry_time && (
                        <div>
                          <label className="text-sm text-gray-600">{t('actual_entry_time')}</label>
                          <p className="font-medium text-gray-900">
                            {new Date(selectedBooking.entry_time).toLocaleDateString()} {new Date(selectedBooking.entry_time).toLocaleTimeString('en-GB', { hour12: false })}
                          </p>
                        </div>
                      )}
                      {selectedBooking.exit_time && (
                        <div>
                          <label className="text-sm text-gray-600">{t('actual_exit_time')}</label>
                          <p className="font-medium text-gray-900">
                            {new Date(selectedBooking.exit_time).toLocaleDateString()} {new Date(selectedBooking.exit_time).toLocaleTimeString('en-GB', { hour12: false })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                {selectedBooking.status === 'pending' && (
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    {t('confirm_booking')}
                  </button>
                )}
                {selectedBooking.status === 'active' && !selectedBooking.exit_time && (
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    {t('mark_as_exited')}
                  </button>
                )}
                <button
                  onClick={closeBookingDetailModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('close')}
                </button>
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
