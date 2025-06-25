import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, Star, Car, Clock, Zap, Shield, Umbrella, 
  Wifi, Coffee, ShoppingBag, Utensils, Camera, 
  ArrowUpDown, Waves, Smartphone, Users, Lock,
  Building, Plane, DollarSign, Bath
} from 'lucide-react';
import { ParkingSpot } from '../types';
import { useSlotAvailability } from '../hooks/useSlotAvailability';

interface ParkingSpotCardProps {
  spot: ParkingSpot;
}

export const ParkingSpotCard: React.FC<ParkingSpotCardProps> = ({ spot }) => {
  const navigate = useNavigate();
  
  // Use real-time availability hook
  const { availableSlots: realTimeAvailableSlots, loading: availabilityLoading } = useSlotAvailability({
    spotId: spot.id,
    totalSlots: spot.totalSlots || 1
  });

  const formatPrice = (price: number, type: string) => {
    return `฿${price}/${type}`;
  };

  const handleBookNow = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the card click from triggering
    e.stopPropagation(); // Stop event propagation
    
    console.log('Navigating to booking page for spot:', spot.id);
    navigate(`/book/${spot.id}`);
  };

  const formatOpeningHours = (hours: any): string => {
    // ถ้าไม่มีข้อมูลเวลาทำการเลย ให้แสดงเริ่มต้น
    if (!hours || hours === null || hours === undefined) {
      return "Open 24/7"; // Default เป็น 24/7 ถ้าไม่มีข้อมูล
    }
    
    // ถ้าเป็น string ที่เป็น JSON ให้ parse ก่อน
    if (typeof hours === 'string') {
      try {
        const parsed = JSON.parse(hours);
        hours = parsed;
      } catch {
        // ถ้าไม่ใช่ JSON ปกติ (เช่น "24/7") ให้ใช้ logic เดิม
        if (hours.includes('24/7')) {
          return "Open 24/7";
        }
        return hours;
      }
    }
  
    // Check if it's 24/7 for ALL days (true 24/7 operation)
    if (hours?.["24_7"] === true) {
      return "Open 24/7";
    }

    // Check if ALL 7 days are open 24 hours
    const daysInEng = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const allDays24Hours = daysInEng.every(day => 
      hours[day] && hours[day].isOpen && hours[day].is24Hours
    );
    
    if (allDays24Hours) {
      return "Open 24/7";
    }
  
    // Get current day name
    const today = new Date().getDay();
    const todayEng = daysInEng[today];
  
    // Check if we have hours for today - try both English and Thai keys
    let dayHours = null;
    if (hours && hours[todayEng]) {
      dayHours = hours[todayEng];
    } else if (hours) {
      // Try to find a matching key (case insensitive and more flexible)
      const keys = Object.keys(hours);
      const foundKey = keys.find(key => {
        const keyLower = key.toLowerCase().trim();
        return keyLower === todayEng.toLowerCase() ||
               keyLower.includes(todayEng.toLowerCase());
      });
      if (foundKey) {
        dayHours = hours[foundKey];
      }
    }
  
    if (dayHours) {
      if (!dayHours.isOpen) {
        return `${todayEng} Closed`;
      }
      // แสดงเวลาเปิด-ปิดของวันนั้นๆ แม้ว่าจะเปิด 24 ชม.ก็ตาม
      if (dayHours.openTime && dayHours.closeTime) {
        return `${todayEng} ${dayHours.openTime} - ${dayHours.closeTime}`;
      }
      // ถ้าไม่มีเวลาเปิด-ปิด แต่มี flag is24Hours ให้แสดงเป็น 00:00-23:59
      if (dayHours.is24Hours) {
        return `${todayEng} 00:00 - 23:59`;
      }
    }
  
    return "Check hours";
  };

  // Helper to get availability status color and text
  const getAvailabilityStatus = () => {
    if (availabilityLoading) return { color: 'bg-gray-100 text-gray-600', text: '...' };
    
    const totalSlots = spot.totalSlots || 1;
    const availableRatio = realTimeAvailableSlots / totalSlots;
    
    if (realTimeAvailableSlots === 0) {
      return { color: 'bg-red-100 text-red-700', text: 'Full' };
    } else if (availableRatio <= 0.3) { // 30% หรือน้อยกว่า
      return { color: 'bg-yellow-100 text-yellow-700', text: `${realTimeAvailableSlots}/${totalSlots} Available (2hrs)` };
    } else {
      return { color: 'bg-green-100 text-green-700', text: `${realTimeAvailableSlots}/${totalSlots} Available (2hrs)` };
    }
  };

  // Helper to get amenity display info
  const getAmenityDisplay = (amenity: string) => {
    const amenityLower = amenity.toLowerCase();
    
    // EV Charging
    if (amenityLower.includes('ev') || amenityLower.includes('electric') || amenityLower.includes('charging')) {
      return { icon: Zap, text: 'EV Charging', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' };
    } 
    // WiFi
    else if (amenityLower.includes('wifi') || amenityLower.includes('wi-fi') || amenityLower.includes('internet')) {
      return { icon: Wifi, text: 'WiFi', color: 'bg-blue-50 border-blue-200 text-blue-700' };
    }
    // Security/CCTV
    else if (amenityLower.includes('security') || amenityLower.includes('cctv') || amenityLower.includes('secure') || amenityLower.includes('camera')) {
      return { icon: Camera, text: 'CCTV Security', color: 'bg-red-50 border-red-200 text-red-700' };
    }
    // Covered Parking
    else if (amenityLower.includes('covered') || amenityLower.includes('shelter') || amenityLower.includes('roof') || amenityLower.includes('indoor')) {
      return { icon: Umbrella, text: 'Covered', color: 'bg-purple-50 border-purple-200 text-purple-700' };
    }
    // Elevator/Lift
    else if (amenityLower.includes('elevator') || amenityLower.includes('lift')) {
      return { icon: ArrowUpDown, text: 'Elevator', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' };
    }
    // 24/7 Access
    else if (amenityLower.includes('24') || amenityLower.includes('24/7') || amenityLower.includes('access')) {
      return { icon: Clock, text: '24/7 Access', color: 'bg-orange-50 border-orange-200 text-orange-700' };
    }
    // Shopping/Mall
    else if (amenityLower.includes('shopping') || amenityLower.includes('mall') || amenityLower.includes('retail')) {
      return { icon: ShoppingBag, text: 'Shopping', color: 'bg-pink-50 border-pink-200 text-pink-700' };
    }
    // Food Court/Restaurant/Cafe
    else if (amenityLower.includes('food') || amenityLower.includes('court') || amenityLower.includes('restaurant') || amenityLower.includes('cafe') || amenityLower.includes('coffee')) {
      return { icon: amenityLower.includes('cafe') || amenityLower.includes('coffee') ? Coffee : Utensils, 
               text: amenityLower.includes('cafe') || amenityLower.includes('coffee') ? 'Cafe Nearby' : 'Food Court', 
               color: 'bg-amber-50 border-amber-200 text-amber-700' };
    }
    // Valet Service
    else if (amenityLower.includes('valet')) {
      return { icon: Users, text: 'Valet Service', color: 'bg-cyan-50 border-cyan-200 text-cyan-700' };
    }
    // Car Wash/Cleaning
    else if (amenityLower.includes('wash') || amenityLower.includes('clean') || amenityLower.includes('detailing')) {
      return { icon: Waves, text: 'Car Wash', color: 'bg-teal-50 border-teal-200 text-teal-700' };
    }
    // Shuttle/Transport
    else if (amenityLower.includes('shuttle') || amenityLower.includes('transport') || amenityLower.includes('bus')) {
      return { icon: Plane, text: 'Shuttle', color: 'bg-sky-50 border-sky-200 text-sky-700' };
    }
    // Luggage Storage
    else if (amenityLower.includes('luggage') || amenityLower.includes('storage') || amenityLower.includes('bag')) {
      return { icon: Building, text: 'Storage', color: 'bg-slate-50 border-slate-200 text-slate-700' };
    }
    // Toilet/Restroom
    else if (amenityLower.includes('toilet') || amenityLower.includes('restroom') || amenityLower.includes('bathroom')) {
      return { icon: Bath, text: 'Restroom', color: 'bg-violet-50 border-violet-200 text-violet-700' };
    }
    // Disabled/Wheelchair Access
    else if (amenityLower.includes('disabled') || amenityLower.includes('wheelchair') || amenityLower.includes('accessible') || amenityLower.includes('handicap')) {
      return { icon: Shield, text: 'Accessible', color: 'bg-green-50 border-green-200 text-green-700' };
    }
    // Secure/Lock
    else if (amenityLower.includes('lock') || amenityLower.includes('gate') || amenityLower.includes('barrier')) {
      return { icon: Lock, text: 'Secure Access', color: 'bg-gray-50 border-gray-200 text-gray-700' };
    }
    // Mobile App/Digital
    else if (amenityLower.includes('app') || amenityLower.includes('mobile') || amenityLower.includes('digital') || amenityLower.includes('smart')) {
      return { icon: Smartphone, text: 'Smart Parking', color: 'bg-blue-50 border-blue-200 text-blue-700' };
    }
    // Payment/ATM
    else if (amenityLower.includes('payment') || amenityLower.includes('atm') || amenityLower.includes('card') || amenityLower.includes('cash')) {
      return { icon: DollarSign, text: 'Payment', color: 'bg-green-50 border-green-200 text-green-700' };
    }
    // Default for unknown amenities
    else {
      return { icon: Star, text: amenity.length > 12 ? amenity.substring(0, 12) + '...' : amenity, color: 'bg-gray-50 border-gray-200 text-gray-700' };
    }
  };

  // Debug log to see actual amenities data for development only
  // console.log(`ParkingSpotCard ${spot.name} data:`, {
  //   spotId: spot.id,
  //   amenities: spot.amenities,
  //   amenitiesType: typeof spot.amenities,
  //   amenitiesLength: spot.amenities?.length,
  //   openingHours: spot.openingHours,
  //   openingHoursType: typeof spot.openingHours
  // });

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      <Link to={`/spot/${spot.id}`} className="block">
        <div className="relative">
          <img
            src={spot.images && spot.images.length > 0 ? spot.images[0] : 'https://images.pexels.com/photos/753876/pexels-photo-753876.jpeg'}
            alt={spot.name}
            className="w-full h-48 object-cover"
          />
          <div className="absolute top-3 right-3">
            <div className="bg-white px-3 py-2 rounded-full text-sm font-bold text-gray-900 shadow-md">
              {formatPrice(spot.price, spot.priceType || 'hour')}
            </div>
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
              <span className="text-gray-500">({spot.reviewCount || 0})</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 text-gray-600 mb-3">
            <MapPin className="h-4 w-4" />
            <span className="text-sm line-clamp-1">{spot.address}</span>
          </div>

          <div className="flex items-center space-x-1 text-gray-600 mb-4">
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              {formatOpeningHours(spot.openingHours)}
            </span>
          </div>

          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center flex-wrap gap-1.5 flex-1 min-w-0">
              {spot.amenities && spot.amenities.length > 0 ? (
                <>
                  {spot.amenities.slice(0, 3).map((amenity, index) => {
                    const { icon: Icon, text, color } = getAmenityDisplay(amenity);
                    return (
                      <div key={index} className={`flex items-center space-x-1 px-2 py-1 rounded-full border ${color}`}>
                        <Icon className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">{text}</span>
                      </div>
                    );
                  })}
                  {spot.amenities.length > 3 && (
                    <div className="flex items-center space-x-1 bg-slate-50 px-2 py-1 rounded-full border border-slate-200">
                      <span className="text-xs font-medium text-slate-700">+{spot.amenities.length - 3}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center space-x-1 bg-gray-50 px-2 py-1 rounded-full border border-gray-200">
                  <Car className="h-3.5 w-3.5 text-gray-600" />
                  <span className="text-xs font-medium text-gray-700">Standard Parking</span>
                </div>
              )}
            </div>
            <div className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${getAvailabilityStatus().color}`}>
              {getAvailabilityStatus().text}
            </div>
          </div>
        </div>
      </Link>
      
      {/* Book Now button outside the Link to prevent navigation conflicts */}
      <div className="px-5 pb-5 pt-0">
        <button
          onClick={handleBookNow}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Book Now
        </button>
      </div>                      
    </div>
  );
};
