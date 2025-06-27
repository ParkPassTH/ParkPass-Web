import React, { useState } from 'react';
import { Search, Filter, MapPin } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export interface SearchFilters {
  priceRange: [number, number];
  bookingType: string[]; // เพิ่มการกรองตามประเภทการจอง
  amenities: string[];
  sortBy: string;
  availableOnly: boolean;
}

type SearchFiltersProps = {
  onSearch: (query: string) => void;
  onFilter: (filters: SearchFilters) => void;
  onFindNearMe: () => void;
  amenitiesOptions?: string[];
};

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  onSearch,
  onFilter,
  onFindNearMe,
  amenitiesOptions = [],
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    priceRange: [1, 10000], // เปลี่ยนเป็น 1-10000
    bookingType: [], // เริ่มต้นไม่เลือกประเภทไหน = แสดงทุกประเภท
    amenities: [],
    sortBy: 'default',
    availableOnly: false
  });
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleAmenityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amenity = e.target.value;
    let newAmenities = [...filters.amenities];
    if (e.target.checked) {
      newAmenities.push(amenity);
    } else {
      newAmenities = newAmenities.filter((a) => a !== amenity);
    }
    const newFilters = { ...filters, amenities: newAmenities };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const handleBookingTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const bookingType = e.target.value;
    let newBookingTypes = [...filters.bookingType];
    if (e.target.checked) {
      newBookingTypes.push(bookingType);
    } else {
      newBookingTypes = newBookingTypes.filter((type) => type !== bookingType);
    }
    
    // ปรับ price range ตาม booking type ที่เลือก
    const newPriceRange = getPriceRangeForBookingTypes(newBookingTypes);
    const newFilters = { 
      ...filters, 
      bookingType: newBookingTypes,
      priceRange: newPriceRange
    };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleFindNearMeClick = () => {
    setIsGettingLocation(true);
    onFindNearMe();
    // Reset the loading state after a timeout in case the geolocation callback doesn't fire
    setTimeout(() => setIsGettingLocation(false), 10000);
  };

  // ฟังก์ชันกำหนด price range ตาม booking type ที่เลือก
  const getPriceRangeForBookingTypes = (bookingTypes: string[]): [number, number] => {
    if (bookingTypes.length === 0) {
      return [1, 10000]; // ไม่เลือกประเภทไหน = ช่วงกว้าง
    }
    
    // กำหนด range สำหรับแต่ละประเภท
    const ranges = {
      hourly: [1, 500],
      daily: [1, 2000], 
      monthly: [1, 10000]
    };
    
    // หาค่าสูงสุดของ max ในแต่ละประเภทที่เลือก
    let maxPrice = 0;
    
    bookingTypes.forEach(type => {
      if (type === 'hourly') {
        maxPrice = Math.max(maxPrice, ranges.hourly[1]);
      } else if (type === 'daily') {
        maxPrice = Math.max(maxPrice, ranges.daily[1]);
      } else if (type === 'monthly') {
        maxPrice = Math.max(maxPrice, ranges.monthly[1]);
      }
    });
    
    return [1, maxPrice] as [number, number];
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
      <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('search_by_location_or_address')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          />
        </div>
        
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleFindNearMeClick}
            disabled={isGettingLocation}
            className="flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isGettingLocation ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span className="hidden md:inline">{t('locating')}</span>
              </>
            ) : (
              <>
                <MapPin className="h-5 w-5" />
                <span className="hidden md:inline">{t('find_near_me')}</span>
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            <Filter className="h-5 w-5" />
            <span className="hidden md:inline">{t('filters')}</span>
          </button>
        </div>
      </form>

      {showFilters && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Booking Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('booking_type')}
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    value="hourly"
                    checked={filters.bookingType.includes('hourly')}
                    onChange={handleBookingTypeChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{t('hourly_booking')}</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    value="daily"
                    checked={filters.bookingType.includes('daily')}
                    onChange={handleBookingTypeChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{t('daily_booking')}</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    value="monthly"
                    checked={filters.bookingType.includes('monthly')}
                    onChange={handleBookingTypeChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{t('monthly_booking')}</span>
                </label>
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('price_range')}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min={getPriceRangeForBookingTypes(filters.bookingType)[0]}
                  max={getPriceRangeForBookingTypes(filters.bookingType)[1]}
                  value={filters.priceRange[1]}
                  onChange={(e) => {
                    const maxVal = parseInt(e.target.value);
                    const minVal = getPriceRangeForBookingTypes(filters.bookingType)[0];
                    const newFilters: SearchFilters = {
                      ...filters,
                      priceRange: [minVal, maxVal]
                    };
                    setFilters(newFilters);
                    onFilter(newFilters);
                  }}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600">
                  ฿{filters.priceRange[0]} - ฿{filters.priceRange[1]}
                </span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('sort_by')}
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => {
                  const newFilters: SearchFilters = { ...filters, sortBy: e.target.value };
                  setFilters(newFilters);
                  onFilter(newFilters);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="default">{t('default')}</option>
                <option value="price_low">{t('price_low_to_high')}</option>
                <option value="price_high">{t('price_high_to_low')}</option>
                <option value="name">{t('name_a_to_z')}</option>
                <option value="distance">{t('distance_nearest')}</option>
              </select>
            </div>

            {/* Amenities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('amenities')}
              </label>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {amenitiesOptions.map((amenity) => (
                  <label key={amenity} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      value={amenity}
                      checked={filters.amenities.includes(amenity)}
                      onChange={handleAmenityChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{amenity}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Additional Filters Row */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap items-center gap-4">
              {/* Available Only */}
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.availableOnly}
                  onChange={(e) => {
                    const newFilters: SearchFilters = { ...filters, availableOnly: e.target.checked };
                    setFilters(newFilters);
                    onFilter(newFilters);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{t('available_now_only')}</span>
              </label>

              {/* Clear Filters */}
              <button
                type="button"
                onClick={() => {
                  const defaultFilters: SearchFilters = {
                    priceRange: [1, 10000],
                    bookingType: [],
                    amenities: [],
                    sortBy: 'default',
                    availableOnly: false
                  };
                  setFilters(defaultFilters);
                  onFilter(defaultFilters);
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {t('clear_filters')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};