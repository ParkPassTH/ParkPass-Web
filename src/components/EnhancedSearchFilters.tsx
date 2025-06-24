import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, MapPin, Sliders, X, Star, Zap, Shield, Umbrella } from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
import { supabase } from '../lib/supabase';

interface SearchFiltersProps {
  onSearch: (results: any[]) => void;
  onFilterChange: (filters: SearchFilters) => void;
  className?: string;
}

interface SearchFilters {
  query: string;
  location: {
    latitude: number | null;
    longitude: number | null;
    radius: number;
  };
  priceRange: [number, number];
  amenities: string[];
  spotType: string;
  sortBy: 'distance' | 'price_low' | 'price_high' | 'rating' | 'availability';
  availableOnly: boolean;
}

const AMENITY_OPTIONS = [
  { id: 'ev_charging', label: 'EV Charging', icon: Zap },
  { id: 'cctv_security', label: 'CCTV Security', icon: Shield },
  { id: 'covered_parking', label: 'Covered', icon: Umbrella },
  { id: 'valet_service', label: 'Valet Service', icon: Star },
];

const SPOT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'garage', label: 'Garage' },
  { value: 'driveway', label: 'Driveway' },
  { value: 'street', label: 'Street Parking' },
  { value: 'lot', label: 'Parking Lot' },
  { value: 'covered', label: 'Covered Parking' },
];

export const EnhancedSearchFilters: React.FC<SearchFiltersProps> = ({
  onSearch,
  onFilterChange,
  className = ''
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const { latitude, longitude, error: locationError } = useGeolocation();

  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    location: {
      latitude: null,
      longitude: null,
      radius: 10, // km
    },
    priceRange: [0, 100],
    amenities: [],
    spotType: '',
    sortBy: 'distance',
    availableOnly: true,
  });

  // Update location when geolocation is available
  useEffect(() => {
    if (latitude && longitude) {
      setFilters(prev => ({
        ...prev,
        location: {
          ...prev.location,
          latitude,
          longitude,
        }
      }));
    }
  }, [latitude, longitude]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchFilters: SearchFilters) => {
      if (!searchFilters.location.latitude || !searchFilters.location.longitude) {
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase.rpc('search_parking_spots_by_distance', {
          search_lat: searchFilters.location.latitude,
          search_lng: searchFilters.location.longitude,
          max_distance_km: searchFilters.location.radius,
          search_text: searchFilters.query || null,
          max_price: searchFilters.priceRange[1],
          required_amenities: searchFilters.amenities.length > 0 ? searchFilters.amenities : null,
        });

        if (error) throw error;

        let results = data || [];

        // Apply additional filters
        if (searchFilters.spotType) {
          results = results.filter((spot: any) => spot.spot_type === searchFilters.spotType);
        }

        if (searchFilters.availableOnly) {
          results = results.filter((spot: any) => spot.available_slots > 0);
        }

        // Apply sorting
        switch (searchFilters.sortBy) {
          case 'price_low':
            results.sort((a: any, b: any) => a.price - b.price);
            break;
          case 'price_high':
            results.sort((a: any, b: any) => b.price - a.price);
            break;
          case 'rating':
            results.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
            break;
          case 'availability':
            results.sort((a: any, b: any) => b.available_slots - a.available_slots);
            break;
          // 'distance' is already sorted by the function
        }

        setSearchResults(results);
        onSearch(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    [onSearch]
  );

  // Trigger search when filters change
  useEffect(() => {
    onFilterChange(filters);
    debouncedSearch(filters);
  }, [filters, onFilterChange, debouncedSearch]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAmenityToggle = (amenityId: string) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(id => id !== amenityId)
        : [...prev.amenities, amenityId],
    }));
  };

  const clearFilters = () => {
    setFilters(prev => ({
      query: '',
      location: prev.location, // Keep location
      priceRange: [0, 100],
      amenities: [],
      spotType: '',
      sortBy: 'distance',
      availableOnly: true,
    }));
  };

  const handleFindNearMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFilters(prev => ({
            ...prev,
            location: {
              ...prev.location,
              latitude,
              longitude,
            }
          }));
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to get your location. Please enable location services.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
      {/* Main Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by location, address, or parking spot name..."
            value={filters.query}
            onChange={(e) => handleFilterChange('query', e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleFindNearMe}
            disabled={!navigator.geolocation}
            className="flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <MapPin className="h-5 w-5" />
            <span className="hidden md:inline">Near Me</span>
          </button>
          
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            <Filter className="h-5 w-5" />
            <span className="hidden md:inline">Filters</span>
            {(filters.amenities.length > 0 || filters.spotType || filters.priceRange[1] < 100) && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {filters.amenities.length + (filters.spotType ? 1 : 0) + (filters.priceRange[1] < 100 ? 1 : 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => handleFilterChange('availableOnly', !filters.availableOnly)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            filters.availableOnly
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Available Only
        </button>
        
        <select
          value={filters.sortBy}
          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          className="px-3 py-1 rounded-full text-sm border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="distance">Sort by Distance</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
          <option value="rating">Highest Rated</option>
          <option value="availability">Most Available</option>
        </select>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border-t border-gray-200 pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear All
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Range (per hour)
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.priceRange[1]}
                  onChange={(e) => handleFilterChange('priceRange', [0, parseInt(e.target.value)])}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>$0</span>
                  <span>${filters.priceRange[1]}</span>
                </div>
              </div>
            </div>

            {/* Search Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Radius
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={filters.location.radius}
                  onChange={(e) => handleFilterChange('location', {
                    ...filters.location,
                    radius: parseInt(e.target.value)
                  })}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>1 km</span>
                  <span>{filters.location.radius} km</span>
                </div>
              </div>
            </div>

            {/* Spot Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parking Type
              </label>
              <select
                value={filters.spotType}
                onChange={(e) => handleFilterChange('spotType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {SPOT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Amenities
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {AMENITY_OPTIONS.map((amenity) => {
                const Icon = amenity.icon;
                const isSelected = filters.amenities.includes(amenity.id);
                return (
                  <button
                    key={amenity.id}
                    onClick={() => handleAmenityToggle(amenity.id)}
                    className={`flex items-center space-x-2 p-3 border-2 rounded-lg transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{amenity.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Search Results Summary */}
      {searchResults.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Found {searchResults.length} parking spot{searchResults.length !== 1 ? 's' : ''} 
            {filters.location.latitude && filters.location.longitude && (
              <> within {filters.location.radius} km of your location</>
            )}
          </p>
        </div>
      )}

      {/* Location Error */}
      {locationError && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Location access needed:</strong> {locationError}
          </p>
        </div>
      )}
    </div>
  );
};

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}