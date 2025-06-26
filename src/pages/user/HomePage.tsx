import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { MapPin, Car, Wifi, Camera, Shield } from 'lucide-react';
import { useParkingSpots } from '../../hooks/useSupabase';
import { ParkingSpot } from '../../services/supabaseService';
import { SearchFilters } from '../../components/SearchFilters';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ParkingSpotCard } from '../../components/ParkingSpotCard';
import { useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { Navbar } from '../../components/Navbar';
import { convertSupabaseToUI } from '../../utils/adaptors';

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
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const navigate = useNavigate();

// Filter spots ที่ผ่านการอนุมัติเท่านั้น (ใช้ is_active แทน is_approved)
  const activeSpots = spots.filter(spot => spot.is_active === true);

  useEffect(() => {
    setFilteredSpots(activeSpots);
  }, [spots]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterSpots(query, spots);
  };

  const handleFilter = (filters: any) => {
    filterSpots(searchQuery, spots, filters);
  };

  const handleFindNearMe = () => {
    setIsGettingLocation(true);
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
          setIsGettingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert(t('location_error_message') || 'Unable to get your location. Please enable location services and try again.');
          setIsGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert(t('geolocation_not_supported') || 'Geolocation is not supported by this browser');
      setIsGettingLocation(false);
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

  const filterSpots = (query: string, spotsToFilter: ParkingSpot[], filters?: any) => {
    let filtered = spotsToFilter.filter(spot => spot.is_active === true);

    // Search by name or address
    if (query) {
      filtered = filtered.filter(spot =>
        spot.name.toLowerCase().includes(query.toLowerCase()) ||
        spot.address.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (filters) {
      // Parking Type filter (ใช้ price_type แทน type)
      if (filters.parkingType && filters.parkingType !== 'All Types') {
        filtered = filtered.filter(spot =>
          spot.price_type === filters.parkingType
        );
      }

      // Price filter
      if (filters.priceRange && filters.priceRange[1] < 500) {
        filtered = filtered.filter(spot =>
          spot.price <= filters.priceRange[1]
        );
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
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'price_low':
            filtered.sort((a, b) => a.price - b.price);
            break;
          case 'price_high':
            filtered.sort((a, b) => b.price - a.price);
            break;
          default:
            break;
        }
      }
    }

    setFilteredSpots(filtered);
  };

  const displaySpots = filteredSpots.length > 0 ? filteredSpots : activeSpots;

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
              {displaySpots.map((spot: ParkingSpot) => (
                <Marker 
                  key={spot.id} 
                  position={[spot.latitude || 0, spot.longitude || 0]}
                >
                  <Popup>
                    <div className="p-1">
                      <h3 className="font-semibold">{spot.name}</h3>
                      <p className="text-sm">{spot.address}</p>
                      <p className="text-sm font-medium text-blue-600">${spot.price}/{spot.price_type}</p>
                      <p className="text-xs mt-1">
                        {spot.available_slots} {t('of_total_spots_available')} {spot.total_slots} {t('spots_available')}
                      </p>
                      <button 
                        onClick={() => handleSpotClick(spot.id)}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                      >
                        {t('view_details')}
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
              
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