import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Star, 
  Phone, 
  Clock, 
  Car, 
  Heart, 
  Navigation,
  Zap,
  Shield,
  Umbrella,
  Wifi, 
  Coffee, 
  Wrench,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Info,
  Check,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ParkingSpot } from '../../lib/supabase';

function isSpotOpenNow(spot: any): boolean {
  // 24/7
  if (
    spot.operating_hours === '24/7' ||
    spot.operating_hours === '24/7 Access' ||
    spot.operating_hours?.['24_7']
  ) {
    return true;
  }

  let hours = spot.operating_hours;
  if (typeof hours === 'string') {
    try {
      hours = JSON.parse(hours);
    } catch {
      return false;
    }
  }
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];
  const now = new Date();

  if (!hours || !hours[today] || !hours[today].isOpen) return false;
  if (hours[today].is24Hours) return true;

  const [openH, openM] = hours[today].openTime.split(':').map(Number);
  const [closeH, closeM] = hours[today].closeTime.split(':').map(Number);

  const open = new Date(now);
  open.setHours(openH, openM, 0, 0);
  const close = new Date(now);
  close.setHours(closeH, closeM, 0, 0);

  return now >= open && now <= close;
}

export const ParkingSpotDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [spot, setSpot] = useState<ParkingSpot | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  const [showQRCodeOverlay, setShowQRCodeOverlay] = useState(false);
  const isOpenNow = spot ? isSpotOpenNow(spot) : false;
  
  
  useEffect(() => {
    const fetchSpotDetails = async () => {
      if (!id) return;

      setLoading(true);
      try {
        // 1. ดึงข้อมูล parking spot
        const { data: spotData, error: spotError } = await supabase
          .from('parking_spots')
          .select('*')
          .eq('id', id)
          .single();

        if (spotError) throw spotError;

        // 2. ดึงข้อมูล owner จาก profiles (ถ้ามี owner_id)
        let ownerProfile = null;
        if (spotData?.owner_id) {
          const { data: ownerData } = await supabase
            .from('profiles')
            .select('id, name, phone, email')
            .eq('id', spotData.owner_id)
            .single();
          ownerProfile = ownerData;
        }

        setSpot({ ...spotData, ownerProfile });

        // 3. ดึงรีวิวของ spot นี้
        const { data: reviewData, error: reviewError } = await supabase
          .from('reviews')
          .select('*')
          .eq('spot_id', id)
          .order('created_at', { ascending: false });

        if (reviewError) {
          console.error('Review error:', reviewError);
        } else {
          console.log('Review data found:', reviewData);
          
          // ดึงข้อมูล profiles สำหรับรีวิวที่ไม่ anonymous
          if (reviewData && reviewData.length > 0) {
            const userIds = reviewData
              .filter(review => !review.is_anonymous && review.user_id)
              .map(review => review.user_id);
            
            if (userIds.length > 0) {
              const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, name, email, avatar_url')
                .in('id', userIds);
              
              console.log('Profiles data:', profilesData);
              
              // เชื่อมข้อมูล profiles เข้ากับ reviews
              const reviewsWithProfiles = reviewData.map(review => ({
                ...review,
                profiles: profilesData?.find(profile => profile.id === review.user_id) || null
              }));
              
              setReviews(reviewsWithProfiles);
            } else {
              setReviews(reviewData);
            }
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSpotDetails();
  }, [id]);

  const handleBookNow = () => {
    if (spot) {
      navigate(`/book/${spot.id}`);
    }
  };

  const handleNavigate = () => {
    if (spot && spot.latitude && spot.longitude) {
      // Open in Google Maps
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`, '_blank');
    }
  };
  
  const nextImage = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!spot || !spot.images || spot.images.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % spot.images.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!spot || !spot.images || spot.images.length <= 1) return;
    setCurrentImageIndex((prev) => (prev === 0 ? spot.images.length - 1 : prev - 1));
  };

  const toggleFullScreenImage = () => {
    setShowFullScreenImage(!showFullScreenImage);
  };

  const toggleQRCodeOverlay = () => {
    setShowQRCodeOverlay(!showQRCodeOverlay);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !spot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Parking spot not found
          </h2>
          <Link to="/" className="text-blue-600 hover:text-blue-800">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number, type: string) => {
    return `$${price}/${type}`;
  };

  const amenityIconMap: Record<string, React.ElementType> = {
    'EV Charging': Zap,
    'CCTV Security': Shield,
    'Covered Parking': Umbrella,
    'Free WiFi': Wifi,
    'Cafe Nearby': Coffee,
    'Car Maintenance': Wrench,
  };

  const getAmenityIcon = (amenity: string) => {
    const Icon = amenityIconMap[amenity] || Car;
    return <Icon className="h-5 w-5 text-blue-600" />;
  };

  // Parse operating hours
  const parseOperatingHours = () => {
    if (typeof spot.operating_hours === 'string') {
      if (spot.operating_hours === '24/7 Access' || spot.operating_hours === '24/7') {
        return {
          is24_7: true,
          days: {}
        };
      }
      
      try {
        return {
          is24_7: false,
          days: JSON.parse(spot.operating_hours)
        };
      } catch (e) {
        return {
          is24_7: false,
          days: {}
        };
      }
    }
    
    if (spot.operating_hours?.["24_7"]) {
      return {
        is24_7: true,
        days: {}
      };
    }
    
    return {
      is24_7: false,
      days: spot.operating_hours || {}
    };
  };

  const operatingHours = parseOperatingHours();
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Get owner contact information
  const ownerContact = (spot as any).ownerProfile?.phone || "Contact Owner";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link to="/" className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft className="h-5 w-5" />
          <span>Back to search</span>
        </Link>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Image Gallery */}
          <div className="relative">
            {spot.images && spot.images.length > 0 ? (
              <div className="relative w-full h-[400px] overflow-hidden">
                <img
                  src={spot.images[currentImageIndex]}
                  alt={spot.name}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={toggleFullScreenImage}
                />
                
                {spot.images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImage();
                      }}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 p-2 rounded-full shadow-md hover:bg-opacity-100 transition-all z-10"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-6 w-6 text-gray-700" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage();
                      }}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 p-2 rounded-full shadow-md hover:bg-opacity-100 transition-all z-10"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-6 w-6 text-gray-700" />
                    </button>
                    
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2 z-10">
                      {spot.images.map((_, index) => (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex(index);
                          }}
                          className={`w-3 h-3 rounded-full transition-colors ${
                            currentImageIndex === index ? 'bg-white' : 'bg-white bg-opacity-50'
                          }`}
                          aria-label={`Go to image ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full h-64 md:h-80 bg-gray-200 flex items-center justify-center">
                <Car className="h-16 w-16 text-gray-400" />
              </div>
            )}
            <div className="absolute top-4 right-4 bg-white px-3 py-2 rounded-full font-semibold text-lg shadow-md">
              {formatPrice(spot.price, spot.price_type)}
            </div>
          </div>

          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {spot.name}
                </h1>
                <div className="flex items-center space-x-1 text-gray-600 mb-3">
                  <MapPin className="h-5 w-5" />
                  <span className="text-lg">{spot.address}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="font-semibold">{spot.rating || '0.0'}</span>
                    <span className="text-gray-500">({spot.review_count || 0} reviews)</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsFavorited(!isFavorited)}
                className={`p-3 rounded-full transition-colors ${
                  isFavorited 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Heart className={`h-6 w-6 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Quick Info */}
            <div className="grid md:grid-cols-3 gap-4 mb-8 p-5 bg-blue-50 rounded-xl">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-sm text-blue-700 mb-2">
                  <Car className="h-5 w-5" />
                  <span className="font-medium">Availability</span>
                </div>
                <div className="font-semibold text-blue-900">
                  {spot.total_slots} {spot.total_slots === 1 ? 'spot' : 'spots'}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-sm text-blue-700 mb-2">
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">Booking Type</span>
                </div>
                <div className="font-semibold text-blue-900 capitalize">
                  {spot.price_type} rate
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-sm text-blue-700 mb-2">
                  <Phone className="h-5 w-5" />
                  <span className="font-medium">Contact</span>
                </div>
                <div className="font-semibold text-blue-900">
                  {ownerContact}
                </div>
              </div>
            </div>

            {/* Opening & Closing Times */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Opening & Closing Times
              </h3>
              
              {operatingHours.is24_7 ? (
                <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-center">
                  <span className="text-lg font-semibold text-green-800">Open 24/7</span>
                  <p className="text-sm text-green-700 mt-1">Available all day, every day</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {days.map(day => {
                    const dayData = operatingHours.days[day];
                    const isOpen = dayData?.isOpen;
                    const is24Hours = dayData?.is24Hours;
                    const openTime = dayData?.openTime || '09:00';
                    const closeTime = dayData?.closeTime || '17:00';
                    
                    return (
                      <div 
                        key={day} 
                        className={`p-3 rounded-lg border ${
                          isOpen 
                            ? 'border-blue-100 bg-blue-50' 
                            : 'border-gray-200 bg-gray-50 opacity-60'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`font-medium ${isOpen ? 'text-blue-900' : 'text-gray-500'}`}>
                            {day}
                          </span>
                          {isOpen ? (
                            is24Hours ? (
                              <span className="text-green-700 font-medium">24 Hours</span>
                            ) : (
                              <span className="text-blue-700">{openTime} - {closeTime}</span>
                            )
                          ) : (
                            <span className="text-gray-500">Closed</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                <Info className="h-5 w-5 mr-2" />
                About this parking spot
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {spot.description || 'No description provided for this parking spot.'}
              </p>
            </div>

            {/* Amenities */}
            {spot.amenities && spot.amenities.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Amenities
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {spot.amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                      {getAmenityIcon(amenity)}
                      <span className="text-gray-800 font-medium">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Star className="h-5 w-5 mr-2 text-yellow-500" />
                Reviews
              </h3>
              <div className="space-y-4">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="p-5 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                            {review.profiles?.avatar_url ? (
                              <img 
                                src={review.profiles.avatar_url} 
                                alt="Profile" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-blue-600 font-semibold">
                                {review.is_anonymous 
                                  ? 'A' 
                                  : (review.profiles?.name?.[0] || review.user_name?.[0] || 'U')
                                }
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">
                              {review.is_anonymous 
                                ? 'Anonymous User' 
                                : (review.profiles?.name || review.user_name || 'User')
                              }
                            </span>
                            <div className="flex items-center space-x-1">
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
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && <p className="text-gray-700 mb-3">{review.comment}</p>}
                      {review.photos && review.photos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {review.photos.map((photo: string, index: number) => (
                            <img
                              key={index}
                              src={photo}
                              alt={`Review photo ${index + 1}`}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-600 font-medium">No reviews yet</p>
                    <p className="text-sm text-gray-500 mt-1">Be the first to review this parking spot</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-4">
              <button
                onClick={handleBookNow}
                className="flex-1 bg-blue-600 text-white text-center py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
              >
                Book Now
              </button>
              <button 
                onClick={handleNavigate}
                className="flex items-center justify-center space-x-2 px-6 py-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                <Navigation className="h-5 w-5" />
                <span>Navigate</span>
              </button>
              {(spot as any).phone && (
                <a 
                  href={`tel:${(spot as any).phone}`}
                  className="flex items-center justify-center space-x-2 px-6 py-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  <Phone className="h-5 w-5" />
                  <span>Call Owner</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Image Modal */}
      {showFullScreenImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={toggleFullScreenImage}
        >
          <button 
            onClick={toggleFullScreenImage}
            className="absolute top-4 right-4 text-white p-2 hover:bg-gray-800 rounded-full transition-colors z-50"
            aria-label="Close full screen image"
          >
            <X className="h-8 w-8" />
          </button>
          
          <div className="relative w-full h-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={spot.images[currentImageIndex]}
              alt={spot.name}
              className="max-w-full max-h-full object-contain"
            />
            
            {spot.images.length > 1 && (
              <>
                <button
                  onClick={(e) => prevImage(e)}
                  className="absolute left-4 md:left-8 p-3 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                
                <button
                  onClick={(e) => nextImage(e)}
                  className="absolute right-4 md:right-8 p-3 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
                
                <div className="absolute bottom-8 left-0 right-0 flex justify-center space-x-3">
                  {spot.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(index);
                      }}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        currentImageIndex === index ? 'bg-white' : 'bg-white bg-opacity-50'
                      }`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* QR Code Overlay */}
      {showQRCodeOverlay && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
          onClick={toggleQRCodeOverlay}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Scan QR Code</h3>
              <button 
                onClick={toggleQRCodeOverlay}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="text-center">
              <img 
                src={(spot as any).qr_code_url || spot.images[0]} 
                alt="Payment QR Code" 
                className="max-w-full h-auto mx-auto rounded-lg"
              />
              <p className="mt-4 text-gray-700">
                Scan this QR code with your banking app to make a payment
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};