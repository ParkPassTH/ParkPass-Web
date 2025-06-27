import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { MapPin } from 'lucide-react';
import { useParkingSpots } from '../../hooks/useSupabase';
import { ParkingSpot } from '../../services/supabaseService';
import { SearchFilters, SearchFilters as SearchFiltersType } from '../../components/SearchFilters';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ParkingSpotCard } from '../../components/ParkingSpotCard';
import { useLanguage } from '../../contexts/LanguageContext';
import { Navbar } from '../../components/Navbar';
import { convertSupabaseToUI } from '../../utils/adaptors';
import { supabase } from '../../lib/supabase';

// Interface สำหรับ 2-hour availability
interface Next2HoursAvailability {
  availableSlots: number;
  totalSlots: number;
  isFullyBooked: boolean;
  nextAvailableTime?: string;
}

// เพิ่ม custom CSS สำหรับ popup
const customPopupStyle = `
  .custom-popup .leaflet-popup-content-wrapper {
    padding: 0;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  .custom-popup .leaflet-popup-content {
    margin: 0;
    padding: 0;
  }
  .custom-popup .leaflet-popup-tip {
    border-top-color: white;
  }
`;

// เพิ่ม style element
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customPopupStyle;
  document.head.appendChild(styleElement);
}

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to update map view when center changes
const ChangeMapView = ({ center }: { center: LatLngExpression }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
};

export const HomePage = () => {
  const { t } = useLanguage();
  const { spots, loading, error } = useParkingSpots();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSpots, setFilteredSpots] = useState<ParkingSpot[]>([]);
  const [showMap, setShowMap] = useState(true);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([13.7563, 100.5018]); // Default to Bangkok
  const [spotsAvailability, setSpotsAvailability] = useState<{[key: string]: Next2HoursAvailability}>({});
  const navigate = useNavigate();

  // ฟังก์ชันคำนวณความพร้อมใช้งาน 2 ชั่วโมงข้างหน้า
  const calculateNext2HoursAvailability = async (spot: ParkingSpot): Promise<Next2HoursAvailability> => {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    try {
      // ดึงการจองที่ทับซ้อนกับ 2 ชั่วโมงข้างหน้า
      const { data: bookings } = await supabase
        .from('bookings')
        .select('start_time, end_time, booking_type')
        .eq('spot_id', spot.id)
        .in('status', ['confirmed', 'pending', 'active'])
        .or(`start_time.lte.${twoHoursLater.toISOString()},end_time.gte.${now.toISOString()}`);

      if (!bookings) {
        return {
          availableSlots: spot.total_slots || 1,
          totalSlots: spot.total_slots || 1,
          isFullyBooked: false
        };
      }

      // นับจำนวนช่องที่ถูกใช้
      const usedSlots = bookings.filter(booking => {
        const bookingStart = new Date(booking.start_time);
        const bookingEnd = new Date(booking.end_time);
        return bookingStart < twoHoursLater && bookingEnd > now;
      }).length;

      const availableSlots = Math.max(0, (spot.total_slots || 1) - usedSlots);
      
      return {
        availableSlots,
        totalSlots: spot.total_slots || 1,
        isFullyBooked: availableSlots === 0,
        nextAvailableTime: availableSlots === 0 ? bookings[0]?.end_time : undefined
      };
    } catch (error) {
      console.error('Error calculating 2-hour availability:', error);
      return {
        availableSlots: spot.total_slots || 1,
        totalSlots: spot.total_slots || 1,
        isFullyBooked: false
      };
    }
  };

  // ฟังก์ชันจัดรูปแบบราคา
  const formatSpotPrice = (spot: ParkingSpot) => {
    const pricing = spot.pricing;
    const prices = [];
    
    // เพิ่มราคาต่อชั่วโมงถ้ามี
    if (pricing?.hour?.enabled || spot.price) {
      const hourlyPrice = pricing?.hour?.price || spot.price;
      prices.push(`฿${Math.floor(hourlyPrice)}/hr`);
    }
    
    // เพิ่มราคาต่อวันถ้ามี
    if (pricing?.day?.enabled) {
      prices.push(`฿${Math.floor(pricing.day.price)}/day`);
    }
    
    // เพิ่มราคาต่อเดือนถ้ามี
    if (pricing?.month?.enabled) {
      prices.push(`฿${Math.floor(pricing.month.price)}/mo`);
    }
    
    return prices.length > 0 ? prices.join(' • ') : `฿${spot.price}/hr`;
  };

// Filter spots ที่ผ่านการอนุมัติและพร้อมใช้งานเท่านั้น
  const activeSpots = useMemo(() => 
    spots.filter(spot => 
      spot.is_approved === true && 
      spot.latitude && 
      spot.longitude && 
      spot.name && 
      spot.address &&
      spot.total_slots > 0 &&
      spot.price > 0
    ), [spots]);

  useEffect(() => {
    setFilteredSpots(activeSpots);
  }, [activeSpots]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterSpots(query, spots);
  };

  const handleFilter = (filters: SearchFiltersType) => {
    filterSpots(searchQuery, spots, filters);
  };

  const handleFindNearMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          // Sort spots by distance from user location
          const sortedSpots = [...spots].sort((a, b) => {
            const distA = calculateDistance(latitude, longitude, a.latitude || 0, a.longitude || 0);
            const distB = calculateDistance(latitude, longitude, b.latitude || 0, b.longitude || 0);
            return distA - distB;
          });
          setFilteredSpots(sortedSpots);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert(t('location_error_message') || 'Unable to get your location. Please enable location services and try again.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert(t('geolocation_not_supported') || 'Geolocation is not supported by this browser');
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const allAmenities = useMemo(() => {
    const set = new Set<string>();
    spots.forEach(spot => {
      (spot.amenities || []).forEach((a: string) => set.add(a));
    });
    return Array.from(set);
  }, [spots]);

  const filterSpots = (query: string, spotsToFilter: ParkingSpot[], filters?: SearchFiltersType) => {
    // กรองเฉพาะจุดจอดรถที่ผ่านการอนุมัติและมีข้อมูลครบถ้วน
    let filtered = spotsToFilter.filter(spot => 
      spot.is_active === true && 
      spot.latitude && 
      spot.longitude && 
      spot.name && 
      spot.address &&
      spot.total_slots > 0 &&
      spot.price > 0
    );

    // Search by name or address
    if (query) {
      filtered = filtered.filter(spot =>
        spot.name.toLowerCase().includes(query.toLowerCase()) ||
        spot.address.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (filters) {
      // Booking Type filter
      if (filters.bookingType && filters.bookingType.length > 0) {
        filtered = filtered.filter(spot => {
          // Parse pricing config to check which booking types are available
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
              day: { enabled: !!(spot as any).daily_price, price: (spot as any).daily_price || (spot.price || 50) * 24 },
              month: { enabled: !!(spot as any).monthly_price, price: (spot as any).monthly_price || (((spot as any).daily_price || (spot.price || 50) * 24) * 30) }
            };
          }
          
          // Check if any of the selected booking types are available for this spot
          return filters.bookingType.some((bookingType: string) => {
            switch (bookingType) {
              case 'hourly':
                return pricingConfig.hour?.enabled;
              case 'daily':
                return pricingConfig.day?.enabled;
              case 'monthly':
                return pricingConfig.month?.enabled;
              default:
                return false;
            }
          });
        });
      }

      // Price filter - ปรับปรุงให้ใช้ราคาตาม booking type ที่เลือก
      if (filters.priceRange) {
        filtered = filtered.filter(spot => {
          let spotPrices: number[] = [];
          
          // ถ้าเลือก booking type เฉพาะ ใช้ราคาเฉพาะประเภทนั้น
          if (filters.bookingType && filters.bookingType.length > 0) {
            filters.bookingType.forEach(bookingType => {
              let price = 0;
              if (bookingType === 'hourly') {
                price = spot.pricing?.hour?.enabled ? spot.pricing.hour.price : spot.price;
              } else if (bookingType === 'daily') {
                price = spot.pricing?.day?.enabled ? spot.pricing.day.price : 0;
              } else if (bookingType === 'monthly') {
                price = spot.pricing?.month?.enabled ? spot.pricing.month.price : 0;
              }
              if (price > 0) spotPrices.push(Math.floor(price));
            });
          } else {
            // ถ้าไม่เลือก booking type ใช้ราคาสูงสุดจากทุกประเภท
            if (spot.pricing?.hour?.enabled || spot.price) {
              spotPrices.push(Math.floor(spot.pricing?.hour?.price || spot.price));
            }
            if (spot.pricing?.day?.enabled) {
              spotPrices.push(Math.floor(spot.pricing.day.price));
            }
            if (spot.pricing?.month?.enabled) {
              spotPrices.push(Math.floor(spot.pricing.month.price));
            }
            
            // ถ้าไม่มีราคาใดๆ ใช้ราคาพื้นฐาน
            if (spotPrices.length === 0) {
              spotPrices.push(Math.floor(spot.price));
            }
          }
          
          // ใช้ราคาสูงสุดในการเปรียบเทียบ
          const maxPrice = Math.max(...spotPrices);
          return maxPrice >= filters.priceRange[0] && maxPrice <= filters.priceRange[1];
        });
      }

      // Availability filter
      if (filters.availableOnly) {
        filtered = filtered.filter(spot => spot.available_slots > 0);
      }

      // Amenities filter
      if (filters.amenities && filters.amenities.length > 0) {
        filtered = filtered.filter(spot =>
          filters.amenities.every((amenity: string) =>
            spot.amenities?.includes(amenity)
          )
        );
      }

      // Sorting
      if (filters.sortBy && filters.sortBy !== 'default') {
        switch (filters.sortBy) {
          case 'price_low':
            filtered.sort((a, b) => a.price - b.price);
            break;
          case 'price_high':
            filtered.sort((a, b) => b.price - a.price);
            break;
          case 'name':
            filtered.sort((a, b) => a.name.localeCompare(b.name));
            break;
          case 'distance':
            // Sort by distance if user location is available
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const { latitude, longitude } = position.coords;
                  filtered.sort((a, b) => {
                    const distA = calculateDistance(latitude, longitude, a.latitude || 0, a.longitude || 0);
                    const distB = calculateDistance(latitude, longitude, b.latitude || 0, b.longitude || 0);
                    return distA - distB;
                  });
                  setFilteredSpots([...filtered]);
                },
                (error) => {
                  console.error('Error getting location for sorting:', error);
                }
              );
              return; // Exit early since we'll set filtered spots in the callback
            }
            break;
          default:
            break;
        }
      }
    }

    setFilteredSpots(filtered);
  };

  const displaySpots = filteredSpots;

  // โหลดข้อมูล availability เมื่อ displaySpots เปลี่ยน
  useEffect(() => {
    const loadAvailabilityData = async () => {
      const availabilityPromises = displaySpots.map(async (spot) => {
        const availability = await calculateNext2HoursAvailability(spot);
        return { [spot.id]: availability };
      });
      
      const results = await Promise.all(availabilityPromises);
      const availabilityMap = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      setSpotsAvailability(availabilityMap);
    };

    if (displaySpots.length > 0) {
      loadAvailabilityData();
    }
  }, [displaySpots]);

  const handleSpotClick = (spotId: string) => {
    navigate(`/spot/${spotId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('loading_parking_spots')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-red-600">{t('error_loading_parking_spots')}: {error}</p>
          </div>
        </div>
      </div>
    );
  }    return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navbar />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {t('find_perfect_parking_spot')}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              {t('book_private_parking')}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
        <SearchFilters
          onSearch={handleSearch}
          onFilter={handleFilter}
          onFindNearMe={handleFindNearMe}
          amenitiesOptions={allAmenities} // ส่ง options ไป
        />
      </div>

      {/* Map Section */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('parking_spots_near_you')}
          </h2>
          <Button
            variant="outline"
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? t('hide_map') : t('show_map')}
          </Button>
        </div>
        
        {showMap && (
          <div className="mb-8 h-[400px] rounded-lg overflow-hidden border border-gray-200">
            <MapContainer 
              center={mapCenter} 
              zoom={13} 
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Add markers for each parking spot */}
              {displaySpots.map((spot: ParkingSpot) => {
                const availability = spotsAvailability[spot.id];
                
                return (
                  <Marker 
                    key={spot.id} 
                    position={[spot.latitude || 0, spot.longitude || 0]}
                  >
                    <Popup className="custom-popup">
                      <div className="p-2 min-w-[250px]">
                        <h3 className="font-semibold text-gray-900 mb-1">{spot.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{spot.address}</p>
                        
                        {/* 2-Hour Availability Badge */}
                        {availability && (
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-2 ${
                            availability.isFullyBooked 
                              ? 'bg-red-100 text-red-700' 
                              : availability.availableSlots === availability.totalSlots
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {availability.availableSlots}/{availability.totalSlots} Available within 2 hours
                          </div>
                        )}
                        
                        {/* Price Information */}
                        <p className="text-sm font-medium text-blue-600 mb-2">
                          {formatSpotPrice(spot)}
                        </p>
                        
                        {/* Current Availability */}
                        {/* <p className="text-xs text-gray-500 mb-3">
                          {spot.available_slots} of {spot.total_slots} spots available now
                        </p> */}
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleSpotClick(spot.id)}
                            className="flex-1 bg-blue-600 text-white text-xs px-3 py-2 rounded hover:bg-blue-700 transition-colors"
                          >
                            Book Now
                          </button>
                          <button 
                            onClick={() => handleSpotClick(spot.id)}
                            className="flex-1 border border-blue-600 text-blue-600 text-xs px-3 py-2 rounded hover:bg-blue-50 transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              
              {/* Component to update map view when center changes */}
              <ChangeMapView center={mapCenter} />
            </MapContainer>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            {t('available_parking_spots')}
          </h2>
          <p className="text-gray-600">
            {displaySpots.length} {displaySpots.length !== 1 ? t('spots_found') : t('spot_found')}
          </p>
        </div>

        {/* Parking Spots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displaySpots.map((spot: ParkingSpot) => (
            <ParkingSpotCard key={spot.id} spot={convertSupabaseToUI(spot)} />
          ))}
        </div>

        {displaySpots.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <MapPin className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('no_parking_spots_found')}
            </h3>
            <p className="text-gray-600">
              {t('try_adjusting_search_criteria')}
            </p>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-3xl font-bold mb-4">
            {t('have_parking_space_to_rent')}
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            {t('start_earning_money')}
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="bg-white text-blue-600 hover:bg-gray-100"
            onClick={() => navigate('/admin/add-spot')}
          >
            {t('list_your_space')}
          </Button>
        </div>
      </div>
    </div>
  );
};