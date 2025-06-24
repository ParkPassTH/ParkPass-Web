import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  QrCode, 
  Car, 
  Star,
  Navigation,
  MoreHorizontal,
  AlertCircle,
  Copy,
  Download,
  Plus,
  Minus,
  CheckCircle,
  XCircle,
  Image,
  X
} from 'lucide-react';
import { QRCodeGenerator } from '../../components/QRCodeGenerator';
import { RatingReviewModal } from '../../components/RatingReviewModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Booking } from '../../lib/supabase';

export const BookingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [showQRModal, setShowQRModal] = useState<string | null>(null);
  const [showExtendModal, setShowExtendModal] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<string | null>(null);
  const [extendHours, setExtendHours] = useState(1);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullQRImage, setShowFullQRImage] = useState(false);
  
  const { user } = useAuth();

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          parking_spots:spot_id (
            id, name, address, price, price_type, images, latitude, longitude
          ),
          reviews:reviews_booking_id_fkey (
            id
          ),
          payment_slips!payment_slips_booking_id_fkey (
            id, image_url, status, created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setBookings(data || []);
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const currentBookings = bookings.filter(b => 
    b.status === 'pending' || b.status === 'confirmed' || b.status === 'active'
  );
  
  const pastBookings = bookings.filter(b => 
    b.status === 'completed' || b.status === 'cancelled'
  );

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    alert(`${type} copied to clipboard!`);
  };

  const handleExtendBooking = (bookingId: string) => {
    console.log(`Extending booking ${bookingId} by ${extendHours} hours`);
    alert(`Booking extended by ${extendHours} hour(s) successfully!`);
    setShowExtendModal(null);
    setExtendHours(1);
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);
        
      if (error) throw error;
      
      // Refresh bookings
      await fetchBookings();
      
      alert('Booking cancelled successfully!');
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      alert(`Failed to cancel booking: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateSpotRating = async (spotId: string) => {
    await fetch('http://https://park-pass-server.vercel.app/api/update-spot-rating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spot_id: spotId }),
    });
  };

  const handleSubmitReview = async (
    rating: number,
    review: string,
    photos: string[],
    isAnonymous: boolean // เพิ่มตรงนี้
  ) => {
    const booking = bookings.find(b => b.id === showReviewModal);

    if (!booking) {
      alert('Booking not found');
      return;
    }

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          booking_id: booking.id,
          spot_id: booking.spot_id,
          user_id: user?.id,
          rating,
          comment: review,
          photos,
          is_anonymous: isAnonymous // ส่งค่าที่ผู้ใช้เลือก
        });

      await updateSpotRating(booking.spot_id);

      if (error) throw error;

      alert(`Thank you for your ${rating}-star review!`);
      setShowReviewModal(null);
      await fetchBookings();
    } catch (err: any) {
      console.error('Error submitting review:', err);
      alert(`Failed to submit review: ${err.message}`);
    }
  };

  // Function to navigate to the parking spot
  const navigateToParking = (booking: any) => {
    if (!booking.parking_spots || !booking.parking_spots.latitude || !booking.parking_spots.longitude) {
      alert('Location information not available for this parking spot');
      return;
    }
    
    const { latitude, longitude } = booking.parking_spots;
    
    // Open in Google Maps
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank');
  };

  // Function to download QR code
  const downloadQRCode = (booking: any) => {
    if (!booking || !booking.qr_code) {
      alert('QR code not available');
      return;
    }
    
    // Create a canvas element to render the QR code
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const qrImage = document.getElementById(`qr-image-${booking.id}`) as HTMLImageElement;
    
    if (!qrImage || !ctx) {
      alert('Unable to generate QR code image');
      return;
    }
    
    // Set canvas dimensions
    canvas.width = qrImage.width;
    canvas.height = qrImage.height + 60; // Extra space for text
    
    // Fill background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw QR code
    ctx.drawImage(qrImage, 0, 0);
    
    // Add PIN text
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`PIN: ${booking.pin}`, canvas.width / 2, qrImage.height + 30);
    
    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/png');
    
    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = dataUrl;
    downloadLink.download = `parkpass-qr-${booking.id.slice(-6)}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const BookingCard: React.FC<{ booking: any; showActions?: boolean }> = ({ 
    booking, 
    showActions = false 
  }) => {
    const spot = booking.parking_spots;
    const startDateTime = formatDateTime(booking.start_time);
    const endDateTime = formatDateTime(booking.end_time);

    // Don't show payment status for cancelled bookings
    const shouldShowPaymentStatus = booking.status !== 'cancelled';

    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {spot?.name || 'Unknown Spot'}
            </h3>
            <div className="flex items-center space-x-1 text-gray-600 mb-2">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{spot?.address || 'No address'}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                getBookingStatusColor(booking.status)
              }`}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </div>
              {shouldShowPaymentStatus && (
                <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  getPaymentStatusColor(booking.payment_status)
                }`}>
                  Payment: {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">
              ${booking.total_cost}
            </div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{startDateTime.date}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{startDateTime.time} - {endDateTime.time}</span>
          </div>
        </div>

        {(booking.status === 'active' || booking.status === 'confirmed' || booking.status === 'pending') && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 text-blue-900 font-semibold">
                <QrCode className="h-5 w-5" />
                <span>Entry Access</span>
              </div>
              {/* <button
                onClick={() => setShowQRModal(booking.id)}
                className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Show QR
              </button> */}
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xs text-gray-600 mb-1">PIN Code</div>
                <div className="font-mono text-lg font-bold text-blue-900">{booking.pin}</div>
                <button
                  onClick={() => copyToClipboard(booking.pin, 'PIN')}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                >
                  Copy PIN
                </button>
              </div>
              {/* <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xs text-gray-600 mb-1">QR Code</div>
                <div className="text-sm font-medium text-blue-900">Available</div>
                <button
                  onClick={() => copyToClipboard(booking.qr_code, 'QR Code')}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                >
                  Copy Code
                </button>
              </div> */}
            </div>
          </div>
        )}

        {showActions && (
          <div className="flex flex-wrap gap-2">
            {booking.status === 'active' && (
              <>
                <button 
                  onClick={() => navigateToParking(booking)}
                  className="flex items-center space-x-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Navigation className="h-4 w-4" />
                  <span>Navigate</span>
                </button>
                <button
                  onClick={() => setShowExtendModal(booking.id)}
                  className="flex items-center space-x-1 border border-green-200 text-green-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors"
                >
                  <Clock className="h-4 w-4" />
                  <span>Extend Time</span>
                </button>
                <button
                  onClick={() => setShowQRModal(booking.id)}
                  className="flex items-center space-x-1 border border-blue-200 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Show QR</span>
                </button>
              </>
            )}
            {booking.status === 'confirmed' && (
              <>
                <button
                  onClick={() => navigateToParking(booking)}
                  className="flex items-center space-x-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Navigation className="h-4 w-4" />
                  <span>Navigate</span>
                </button>
                <button
                  onClick={() => setShowQRModal(booking.id)}
                  className="flex items-center space-x-1 border border-blue-200 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Show QR</span>
                </button>
                <button
                  onClick={() => handleCancelBooking(booking.id)}
                  className="flex items-center space-x-1 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              </>
            )}
            {booking.status === 'pending' && (
              <>
                <button
                  onClick={() => setShowQRModal(booking.id)}
                  className="flex items-center space-x-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Show QR</span>
                </button>
                <button
                  onClick={() => handleCancelBooking(booking.id)}
                  className="flex items-center space-x-1 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              </>
            )}
            {booking.status === 'completed' && (
              <>
                <Link
                  to={`/book/${booking.spot_id}`}
                  className="flex items-center space-x-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Car className="h-4 w-4" />
                  <span>Book Again</span>
                </Link>
                {(!booking.reviews || booking.reviews.length === 0) && (
                  <button 
                    onClick={() => setShowReviewModal(booking.id)}
                    className="flex items-center space-x-1 border border-yellow-200 text-yellow-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-50 transition-colors"
                  >
                    <Star className="h-4 w-4" />
                    <span>Rate & Review</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Bookings</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchBookings}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Bookings
          </h1>
          <p className="text-gray-600">
            Manage your parking reservations and history
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('current')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'current'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Current & Upcoming ({currentBookings.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              History ({pastBookings.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'current' ? (
            currentBookings.length > 0 ? (
              currentBookings.map((booking) => (
                <BookingCard 
                  key={booking.id} 
                  booking={booking} 
                  showActions={true} 
                />
              ))
            ) : (
              <div className="bg-white rounded-xl shadow-md p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Current Bookings
                </h3>
                <p className="text-gray-600 mb-4">
                  You don't have any active or upcoming reservations.
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Car className="h-5 w-5" />
                  <span>Find Parking</span>
                </Link>
              </div>
            )
          ) : (
            pastBookings.length > 0 ? (
              pastBookings.map((booking) => (
                <BookingCard 
                  key={booking.id} 
                  booking={booking} 
                  showActions={true} 
                />
              ))
            ) : (
              <div className="bg-white rounded-xl shadow-md p-8 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Booking History
                </h3>
                <p className="text-gray-600">
                  Your completed bookings will appear here.
                </p>
              </div>
            )
          )}
        </div>

        {/* QR Code Modal */}
        {showQRModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Entry QR Code</h3>
                  <button
                    onClick={() => setShowQRModal(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XCircle className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div className="text-center">
                  <div className="relative cursor-pointer" onClick={() => setShowFullQRImage(true)}>
                    <QRCodeGenerator 
                      value={bookings.find(b => b.id === showQRModal)?.qr_code || ''} 
                      size={200}
                      className="mb-4"
                      id={`qr-image-${bookings.find(b => b.id === showQRModal)?.id}`}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <div className="bg-black bg-opacity-50 p-2 rounded-full">
                        <Image className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <div className="text-sm text-blue-700 mb-2">Backup PIN Code</div>
                    <div className="text-3xl font-bold font-mono text-blue-900 mb-2">
                      {bookings.find(b => b.id === showQRModal)?.pin}
                    </div>
                    <div className="text-xs text-blue-600">Use if QR scanner doesn't work</div>
                  </div>

                  <div className="flex gap-2">
                    {/* <button
                      onClick={() => copyToClipboard(bookings.find(b => b.id === showQRModal)?.qr_code || '', 'QR Code')}
                      className="flex-1 flex items-center justify-center space-x-1 border border-blue-200 text-blue-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                      <span>Copy Code</span>
                    </button> */}
                    <button
                      onClick={() => downloadQRCode(bookings.find(b => b.id === showQRModal))}
                      className="flex-1 flex items-center justify-center space-x-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Save QR</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full QR Code Image Modal */}
        {showFullQRImage && showQRModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowFullQRImage(false)}
          >
            <button 
              onClick={() => setShowFullQRImage(false)}
              className="absolute top-4 right-4 text-white p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            
            <div className="max-w-lg w-full bg-white p-8 rounded-xl">
              <QRCodeGenerator 
                value={bookings.find(b => b.id === showQRModal)?.qr_code || ''} 
                size={300}
                className="mx-auto mb-6"
              />
              
              <div className="text-center">
                <div className="text-2xl font-bold font-mono text-gray-900 mb-2">
                  PIN: {bookings.find(b => b.id === showQRModal)?.pin}
                </div>
                
                <div className="flex justify-center gap-4 mt-6">
                  <button
                    onClick={() => copyToClipboard(bookings.find(b => b.id === showQRModal)?.pin || '', 'PIN')}
                    className="flex items-center space-x-2 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy PIN</span>
                  </button>
                  
                  <button
                    onClick={() => downloadQRCode(bookings.find(b => b.id === showQRModal))}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Extend Time Modal */}
        {showExtendModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Extend Parking Time</h3>
                  <button
                    onClick={() => setShowExtendModal(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XCircle className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="text-sm text-gray-600 mb-1">Current booking ends at:</div>
                    <div className="font-semibold text-gray-900">
                      {formatDateTime(bookings.find(b => b.id === showExtendModal)?.end_time || '').time}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Extend by how many hours?
                    </label>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setExtendHours(Math.max(1, extendHours - 1))}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <div className="flex-1 text-center">
                        <div className="text-2xl font-bold text-gray-900">{extendHours}</div>
                        <div className="text-sm text-gray-600">hour{extendHours !== 1 ? 's' : ''}</div>
                      </div>
                      <button
                        onClick={() => setExtendHours(extendHours + 1)}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-green-700">Extension Cost</div>
                        <div className="text-sm text-green-600">
                          {extendHours} hour{extendHours !== 1 ? 's' : ''} × $25/hour
                        </div>
                      </div>
                      <div className="text-xl font-bold text-green-900">
                        ${extendHours * 25}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowExtendModal(null)}
                    className="flex-1 border border-gray-200 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleExtendBooking(showExtendModal)}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    Extend Parking
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rating & Review Modal */}
        <RatingReviewModal
          isOpen={showReviewModal !== null}
          onClose={() => setShowReviewModal(null)}
          spotName={bookings.find(b => b.id === showReviewModal)?.parking_spots?.name || ''}
          bookingId={showReviewModal || ''}
          onSubmit={handleSubmitReview}
        />
      </div>
    </div>
  );
};
