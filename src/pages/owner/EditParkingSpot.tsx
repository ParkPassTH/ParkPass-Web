import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  DollarSign, 
  Camera, 
  Plus, 
  X,
  Save,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Navigation
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { OpeningHours } from '../../components/OpeningHours';
import { MapPicker } from '../../components/MapPicker';
import { ParkingSpot } from '../../lib/supabase';

export const EditParkingSpot: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [openingHours, setOpeningHours] = useState('');
  const [coordinates, setCoordinates] = useState({ lat: 13.7563, lng: 100.5018 });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  const [formData, setFormData] = useState<Partial<ParkingSpot>>({
    name: '',
    description: '',
    address: '',
    total_slots: 1,
    price_type: 'hour',
    price: 0,
    amenities: [],
    images: [],
    is_active: true,
  });

  const availableAmenities = [
    { id: 'ev-charging', name: 'EV Charging' },
    { id: 'cctv', name: 'CCTV Security' },
    { id: 'covered', name: 'Covered Parking' },
    { id: 'wifi', name: 'Free WiFi' },
    { id: 'cafe', name: 'Cafe Nearby' },
    { id: 'maintenance', name: 'Car Maintenance' },
  ];

  useEffect(() => {
    const fetchSpotDetails = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('parking_spots')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setFormData({
            name: data.name,
            description: data.description || '',
            address: data.address,
            total_slots: data.total_slots,
            price_type: data.price_type,
            price: data.price,
            amenities: data.amenities || [],
            images: data.images || [],
            is_active: data.is_active,
            operating_hours: data.operating_hours
          });
          
          setIsEnabled(data.is_active);
          setCoordinates({ 
            lat: data.latitude || 13.7563, 
            lng: data.longitude || 100.5018 
          });
          
          // Set opening hours
          if (typeof data.operating_hours === 'string') {
            setOpeningHours(data.operating_hours);
          } else if (data.operating_hours) {
            setOpeningHours(JSON.stringify(data.operating_hours));
          }
        }
      } catch (err: any) {
        console.error('Error fetching spot details:', err);
        setError(err.message || 'Failed to load parking spot details');
      } finally {
        setLoading(false);
      }
    };

    fetchSpotDetails();
  }, [id]);

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
      amenities: prev.amenities?.includes(amenity.name)
        ? prev.amenities.filter(a => a !== amenity.name)
        : [...(prev.amenities || []), amenity.name]
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    // Limit to 4 images total
    const remainingSlots = 4 - imageFiles.length - (formData.images?.length || 0);
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
        images: prev.images?.filter((_, i) => i !== index)
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
      if ((formData.images?.length || 0) + imageFiles.length >= 4) {
        alert('Maximum 4 images allowed');
        return;
      }
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), url]
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
    setSaving(true);
    setError(null);

    // Validate required fields
    if (!formData.name || !formData.address || !formData.price || formData.price <= 0) {
      setError('Please fill in all required fields');
      setSaving(false);
      return;
    }

    // Validate images (at least 1 required)
    if ((formData.images?.length === 0 || !formData.images) && imageFiles.length === 0) {
      setError('Please add at least one image of your parking spot');
      setSaving(false);
      return;
    }

    try {
      // Upload new images
      const uploadedImageUrls = await uploadImages();
      const allImages = [...(formData.images || []), ...uploadedImageUrls];

      // Prepare the spot data according to the database schema
      const spotData = {
        name: formData.name,
        description: formData.description || null,
        address: formData.address,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        total_slots: formData.total_slots,
        price: formData.price,
        price_type: formData.price_type,
        amenities: formData.amenities,
        images: allImages,
        operating_hours: openingHours || formData.operating_hours,
        is_active: isEnabled,
      };

      const { error } = await supabase
        .from('parking_spots')
        .update(spotData)
        .eq('id', id);

      if (error) throw error;
      
      // Navigate back to admin dashboard on success
      navigate('/admin');
    } catch (error: any) {
      console.error("Error updating parking spot:", error);
      setError(error.message || "Failed to update parking spot. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this parking spot? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Check if there are active bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('spot_id', id)
        .in('status', ['pending', 'confirmed', 'active'])
        .limit(1);
        
      if (bookingsError) throw bookingsError;
      
      if (bookings && bookings.length > 0) {
        alert('Cannot delete this parking spot because it has active bookings. Please cancel all bookings first or set the spot to inactive.');
        setLoading(false);
        return;
      }
      
      // Delete the parking spot
      const { error } = await supabase
        .from('parking_spots')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      navigate('/admin');
    } catch (error: any) {
      console.error('Error deleting parking spot:', error);
      setError(error.message || 'Failed to delete parking spot');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button 
          onClick={() => navigate('/admin')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Edit Parking Spot
              </h1>
              <p className="text-gray-600">
                Update your parking spot information and settings
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  onClick={() => setIsEnabled(!isEnabled)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {isEnabled ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                </button>
              </div>
              <button
                onClick={handleDelete}
                className="flex items-center space-x-2 text-red-600 hover:text-red-800 transition-colors"
              >
                <Trash2 className="h-5 w-5" />
                <span>Delete</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
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
                    name="price_type"
                    value={formData.price_type}
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
                    name="total_slots"
                    value={formData.total_slots}
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
                  const isSelected = formData.amenities?.includes(amenity.name);
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
                  {(formData.images?.length || 0) + imageFiles.length}/4 images
                </span>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* URL Images */}
                {formData.images?.map((image, index) => (
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
                {(formData.images?.length || 0) + imageFiles.length < 4 && (
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
                      <Plus className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">Upload Image</span>
                    </label>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-600 flex items-center space-x-2">
                <Camera className="h-4 w-4 text-gray-500" />
                <span>Upload clear photos of your parking spot (min 1, max 4 images)</span>
              </div>
              
              {(formData.images?.length === 0 || !formData.images) && imageFiles.length === 0 && (
                <div className="mt-2 text-sm text-red-600">
                  At least one image is required
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                disabled={saving}
                className="flex-1 border border-gray-200 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || (formData.images?.length === 0 && imageFiles.length === 0)}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};