import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Star, Car, Clock, Zap, Shield, Umbrella, Info } from 'lucide-react';
import { ParkingSpot } from '../types';

interface ParkingSpotCardProps {
  spot: ParkingSpot;
}
function isSpotOpenNow(hours: any): boolean {
  // Parse hours if string
  if (typeof hours === 'string') {
    try {
      hours = JSON.parse(hours);
    } catch {
      if (hours.includes('24/7') || hours === '24/7 Access') return true;
      return false;
    }
  }
  if (hours?.["24_7"]) return true;

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];
  const now = new Date();

  if (!hours || !hours[today] || !hours[today].isOpen) return false;
  if (hours[today].is24Hours) return true;

  // เช็คเวลาปัจจุบันอยู่ในช่วงเปิด-ปิด
  const [openH, openM] = hours[today].openTime.split(':').map(Number);
  const [closeH, closeM] = hours[today].closeTime.split(':').map(Number);

  const open = new Date(now);
  open.setHours(openH, openM, 0, 0);
  const close = new Date(now);
  close.setHours(closeH, closeM, 0, 0);

  return now >= open && now <= close;
}

export const ParkingSpotCard: React.FC<ParkingSpotCardProps> = ({ spot }) => {
  const navigate = useNavigate();
  
  const formatPrice = (price: number, type: string) => {
    return `$${price}/${type}`;
  };

  const handleBookNow = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the card click from triggering
    e.stopPropagation(); // Stop event propagation
    
    // Ensure we're using the correct ID property and log for debugging
    console.log('Navigating to booking page for spot:', spot.id);
    navigate(`/book/${spot.id}`);
  };

  const formatOpeningHours = (hours: any): string => {
    // ถ้าเป็น string ที่เป็น JSON ให้ parse ก่อน
    if (typeof hours === 'string') {
      try {
        const parsed = JSON.parse(hours);
        hours = parsed;
      } catch {
        // ถ้าไม่ใช่ JSON ปกติ (เช่น "24/7") ให้ใช้ logic เดิม
        if (hours.includes('24/7') || hours === '24/7 Access') {
          return "Open 24/7";
        }
        return hours;
      }
    }
  
    // Handle 24/7 flag in object
    if (hours?.["24_7"] === true) {
      return "Open 24/7";
    }
  
    // Get current day
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
  
    // Check if we have hours for today
    if (hours && hours[today]) {
      const dayHours = hours[today];
      if (!dayHours.isOpen) {
        return "Closed today";
      }
      if (dayHours.is24Hours) {
        return "Open all day";
      }
      return `Open ${dayHours.openTime} - ${dayHours.closeTime}`;
    }
  
    return "Check hours";
  };
  const isOpenNow = isSpotOpenNow(spot.operatingHours || spot.operating_hours);
  // Get availability status and style
  const getAvailabilityStatus = () => {
    const availableSlots = typeof spot.availableSlots === 'number' ? spot.availableSlots : 
                          (typeof spot.available_slots === 'number' ? spot.available_slots : 1);
    const totalSlots = typeof spot.totalSlots === 'number' ? spot.totalSlots : 
                      (typeof spot.total_slots === 'number' ? spot.total_slots : 1);

    // เช็คว่าปิดวันนี้หรือไม่ใช่เวลาทำการ
    if (!isOpenNow) {
      return { text: 'Closed', className: 'bg-gray-200 text-gray-600' };
    }

    if (availableSlots === 0) {
      return { text: 'Full', className: 'bg-red-100 text-red-800' };
    }
    if (availableSlots < Math.ceil(totalSlots/2)) {
      return { text: 'Limited', className: 'bg-yellow-100 text-yellow-800' };
    }
    return { text: 'Available', className: 'bg-green-100 text-green-800' };
  };

  const availabilityStatus = getAvailabilityStatus();
  
  // Get available and total slots with proper fallbacks
  const getAvailableSlots = () => {
    return typeof spot.availableSlots === 'number' ? spot.availableSlots : 
           (typeof spot.available_slots === 'number' ? spot.available_slots : 1);
  };
  
  const getTotalSlots = () => {
    return typeof spot.totalSlots === 'number' ? spot.totalSlots : 
           (typeof spot.total_slots === 'number' ? spot.total_slots : 1);
  };

  // Helper to check if amenity exists
  const hasAmenity = (amenityName: string): boolean => {
    if (!spot.amenities || !Array.isArray(spot.amenities)) return false;
    
    // Check for exact match or partial match (case insensitive)
    return spot.amenities.some(amenity => 
      amenity === amenityName || 
      amenity.toLowerCase().includes(amenityName.toLowerCase())
    );
  };

  // Get first amenity for display
  const getFirstAmenity = (): string | null => {
    if (!spot.amenities || !Array.isArray(spot.amenities) || spot.amenities.length === 0) {
      return null;
    }
    return spot.amenities[0];
  };

  const firstAmenity = getFirstAmenity();

  const isClosedToday = formatOpeningHours(spot.operatingHours || spot.operating_hours) === "Closed today";
  
  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      <Link to={`/spot/${spot.id}`} className="block">
        <div className="relative">
          <img
            src={spot.images && spot.images.length > 0 ? spot.images[0] : 'https://images.pexels.com/photos/753876/pexels-photo-753876.jpeg'}
            alt={spot.name}
            className="w-full h-48 object-cover"
          />
          <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-full text-sm font-semibold text-gray-900">
            {formatPrice(spot.price, spot.priceType || spot.price_type || 'hour')}
          </div>
          <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-xs">
            {getAvailableSlots()} / {getTotalSlots()} spots
          </div>
        </div>
        
        <div className="p-5">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
              {spot.name}
            </h3>
            <div className="flex items-center space-x-1 text-sm">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-gray-700">{spot.rating || '0.0'}</span>
              <span className="text-gray-500">({spot.reviewCount || spot.review_count || 0})</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 text-gray-600 mb-3">
            <MapPin className="h-4 w-4" />
            <span className="text-sm line-clamp-1">{spot.address}</span>
          </div>

          <div className="flex items-center space-x-1 text-gray-600 mb-4">
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              {formatOpeningHours(spot.operatingHours || spot.operating_hours)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {hasAmenity('EV') && (
                <Zap className="h-4 w-4 text-green-600" title="EV Charging" />
              )}
              {hasAmenity('Security') && (
                <Shield className="h-4 w-4 text-blue-600" title="Security" />
              )}
              {hasAmenity('Covered') && (
                <Umbrella className="h-4 w-4 text-purple-600" title="Covered Parking" />
              )}
              {!hasAmenity('EV') && !hasAmenity('Security') && !hasAmenity('Covered') && (
                <Car className="h-4 w-4 text-blue-600" />
              )}
              <span className="text-xs text-gray-600">
                {firstAmenity ? firstAmenity : "No amenities"}
              </span>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              availabilityStatus.className
            }`}>
              {availabilityStatus.text}
            </div>
          </div>
        </div>
      </Link>
      
      {/* Book Now button outside the Link to prevent navigation conflicts */}
      <div className="px-5 pb-5 pt-0">
        <button
          onClick={handleBookNow}
          disabled={getAvailableSlots() === 0 || !isOpenNow}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {getAvailableSlots() > 0 && isOpenNow ? 'Book Now' : !isOpenNow ? 'Closed' : 'Full'}
        </button>
      </div>                      
    </div>
  );
};