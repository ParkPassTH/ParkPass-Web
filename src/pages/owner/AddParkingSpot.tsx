import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Label } from '../../components/ui/label';
import { OpeningHours }  from '../../components/OpeningHours';
import { 
  ArrowLeft, MapPin, Clock, DollarSign, Camera, Plus, X,
  Car, Zap, Shield, Umbrella, Wifi, Coffee, Wrench, Upload,
  Navigation
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { MapPicker } from '../../components/MapPicker';

export const AddParkingSpot: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    totalSlots: 1,
    priceType: 'hour' as 'hour' | 'day' | 'month',
    price: 0,
    amenities: [] as string[],
    images: [] as string[],
    operatingHours: {
      monday: { open: '00:00', close: '23:59', closed: false },
      tuesday: { open: '00:00', close: '23:59', closed: false },
      wednesday: { open: '00:00', close: '23:59', closed: false },
      thursday: { open: '00:00', close: '23:59', closed: false },
      friday: { open: '00:00', close: '23:59', closed: false },
      saturday: { open: '00:00', close: '23:59', closed: false },
      sunday: { open: '00:00', close: '23:59', closed: false },
    },
    features: {
      allowExtensions: true,
      requireQREntry: true,
    }
  });

  const [openingHours, setOpeningHours] = useState('');
  const [coordinates, setCoordinates] = useState({ lat: 13.7563, lng: 100.5018 }); // Default to Bangkok
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  const availableAmenities = [
    { id: 'ev-charging', name: 'EV Charging', icon: Zap },
    { id: 'cctv', name: 'CCTV Security', icon: Shield },
    { id: 'covered', name: 'Covered Parking', icon: Umbrella },
    { id: 'wifi', name: 'Free WiFi', icon: Wifi },
    { id: 'cafe', name: 'Cafe Nearby', icon: Coffee },
    { id: 'maintenance', name: 'Car Maintenance', icon: Wrench },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleAmenityToggle = (amenityId: string) => {
    const amenity = availableAmenities.find(a => a.id === amenityId);
    if (!amenity) return;
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity.name)
        ? prev.amenities.filter(a => a !== amenity.name)
        : [...prev.amenities, amenity.name]
    }));
  };

  const handleLocationChange = (lat: number, lng: number, address?: string) => {
    setCoordinates({ lat, lng });
    if (address) {
      setFormData(prev => ({
        ...prev,
        address
      }));
    }
  };

  const useCurrentLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ lat: latitude, lng: longitude });
          // Attempt to get address via reverse geocoding
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`)
            .then(response => response.json())
            .then(data => {
              if (data.display_name) {
                setFormData(prev => ({
                  ...prev,
                  address: data.display_name
                }));
              }
            })
            .catch(err => console.error('Error getting address:', err))
            .finally(() => setGettingLocation(false));
        },
        (error) => {
          console.error('Geolocation error:', error);
          setGettingLocation(false);
          alert('Unable to get your location. Please enable location services and try again.');
        }
      );
    } else {
      setGettingLocation(false);
      alert('Geolocation is not supported by this browser.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    // Limit to 4 images total
    const remainingSlots = 4 - imageFiles.length - formData.images.length;
    if (remainingSlots <= 0) {
      alert('Maximum 4 images allowed');
      return;
    }
    
    const newFiles = Array.from(files).slice(0, remainingSlots);
    
    // Validate file types and sizes
    const validFiles = newFiles.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`File ${file.name} is not an image`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} exceeds 5MB limit`);
        return false;
      }
      return true;
    });
    
    // Create preview URLs
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    
    setImageFiles(prev => [...prev, ...validFiles]);
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const removeImage = (index: number, type: 'url' | 'file') => {
    if (type === 'url') {
      setFormData(prev => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
      }));
    } else {
      // Revoke object URL to avoid memory leaks
      URL.revokeObjectURL(imagePreviewUrls[index]);
      
      setImageFiles(prev => prev.filter((_, i) => i !== index));
      setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
    }
  };

  const addImageUrl = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      // Limit to 4 images total
      if (formData.images.length + imageFiles.length >= 4) {
        alert('Maximum 4 images allowed');
        return;
      }
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, url]
      }));
    }
  };

  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return [];
    
    try {
      const uploadedUrls: string[] = [];
      
      for (const file of imageFiles) {
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `${fileName}`;
        
        try {
          const { error } = await supabase.storage
            .from('parking-spots')
            .upload(filePath, file);
            
          if (error) throw error;
          
          const { data } = supabase.storage
            .from('parking-spots')
            .getPublicUrl(filePath);
            
          uploadedUrls.push(data.publicUrl);
        } catch (error) {
          console.error('Error uploading image:', error);
          throw new Error('Error uploading image: ' + (error as any).message);
        }
      }
      
      return uploadedUrls;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate required fields
    if (!formData.name || !formData.address || formData.price <= 0) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    // Validate images (at least 1 required)
    if (formData.images.length === 0 && imageFiles.length === 0) {
      setError('Please add at least one image of your parking spot');
      setLoading(false);
      return;
    }

    if (!profile) {
      setError('You must be logged in to add a parking spot.');
      setLoading(false);
      return;
    }

    // เช็คสิทธิ์ owner ต้องได้รับอนุมัติจากแอดมินก่อน
    if (profile.role === 'owner' && profile.verify_status !== 'approved') {
      setError('Your owner account is pending admin approval. You cannot add parking spots yet.');
      setLoading(false);
      return;
    }

    try {
      // Upload new images
      const uploadedImageUrls = await uploadImages();
      const allImages = [...formData.images, ...uploadedImageUrls];

      // Prepare the spot data according to the database schema
      const spotData = {
        owner_id: profile.id,
        name: formData.name,
        description: formData.description || null,
        address: formData.address,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        total_slots: formData.totalSlots,
        available_slots: formData.totalSlots, // Initially all slots are available
        price: formData.price,
        price_type: formData.priceType,
        amenities: formData.amenities,
        images: allImages,
        operating_hours: openingHours || JSON.stringify(formData.operatingHours),
        is_active: true,
        is_approved: false, // ต้องรอแอดมินอนุมัติ
      };

      const { error } = await supabase
        .from('parking_spots')
        .insert([spotData]);

      if (error) throw error;
      
      // Navigate back to admin dashboard on success
      navigate('/owner');
    } catch (error: any) {
      console.error("Error adding parking spot:", error);
      setError(error.message || "Failed to add parking spot. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ถ้ายังโหลด profile
  if (!profile) return <div>{t('loading')}</div>;

  // ถ้า owner ยังไม่ได้รับอนุมัติ
  if (profile.role === 'owner' && profile.verify_status !== 'approved') {
    return (
      <div className="p-6 text-center text-red-600 font-bold">
        Your owner account is pending admin approval. You cannot add parking spots yet.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button 
          onClick={() => navigate('/owner')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('add_new_parking_spot')}
            </h1>
            <p className="text-gray-600">
              Fill in the details to create a new parking spot listing
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('basic_information')}</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parking Spot Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Central Plaza Parking"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Full address of the parking spot"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Describe your parking spot, its features, and any important information..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Location on Map</label>
              </div>
              <MapPicker
                latitude={coordinates.lat}
                longitude={coordinates.lng}
                onLocationChange={handleLocationChange}
              />
            </div>

            {/* Pricing & Capacity */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Pricing & Capacity
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="25.00"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Type *
                  </label>
                  <select
                    name="priceType"
                    value={formData.priceType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="hour">Per Hour</option>
                    <option value="day">Per Day</option>
                    <option value="month">Per Month</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Parking Slots *
                  </label>
                  <input
                    type="number"
                    name="totalSlots"
                    value={formData.totalSlots}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="50"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <OpeningHours value={openingHours} onChange={setOpeningHours} />

            {/* Amenities */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableAmenities.map((amenity) => {
                  const Icon = amenity.icon;
                  const isSelected = formData.amenities.includes(amenity.name);
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => handleAmenityToggle(amenity.id)}
                      className={`flex items-center space-x-3 p-4 border-2 rounded-lg transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{amenity.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Images */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Camera className="h-5 w-5 mr-2" />
                  Photos (Required)
                </h3>
                <span className="text-sm text-gray-600">
                  {formData.images.length + imageFiles.length}/4 images
                </span>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* URL Images */}
                {formData.images.map((image, index) => (
                  <div key={`url-${index}`} className="relative">
                    <img
                      src={image}
                      alt={`Parking spot ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index, 'url')}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                {/* File Upload Previews */}
                {imagePreviewUrls.map((previewUrl, index) => (
                  <div key={`file-${index}`} className="relative">
                    <img
                      src={previewUrl}
                      alt={`Parking spot upload ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index, 'file')}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                {/* Add Image Button - only show if less than 4 images */}
                {formData.images.length + imageFiles.length < 4 && (
                  <div className="relative">
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="image-upload"
                      className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">Upload Image</span>
                    </label>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-600 flex items-center space-x-2">
                <Camera className="h-4 w-4 text-gray-500" />
                <span>Upload clear photos of your parking spot (min 1, max 4 images)</span>
              </div>
              
              {formData.images.length + imageFiles.length === 0 && (
                <div className="mt-2 text-sm text-red-600">
                  At least one image is required
                </div>
              )}
            </div>

            {/* Features */}
            {/* <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Features & Settings</h3>
              <div className="space-y-4">
                {Object.entries(formData.features).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        {key === 'allowExtensions' && 'Allow Time Extensions'}
                        {key === 'requireQREntry' && 'Require QR Code Entry'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {key === 'allowExtensions' && 'Users can extend their parking time'}
                        {key === 'requireQREntry' && 'Entry requires QR code or PIN validation'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => {
                          setFormData(prev => ({
                            ...prev,
                            features: {
                              ...prev.features,
                              [key]: !value
                            }
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div> */}

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/owner')}
                disabled={loading}
                className="flex-1 border border-gray-200 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || formData.images.length + imageFiles.length === 0}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  'Create Parking Spot'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};