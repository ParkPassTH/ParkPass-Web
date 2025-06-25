import React, { useState, useEffect } from 'react';
import { 
  User, 
  Car, 
  Receipt, 
  Bell, 
  Shield, 
  LogOut,
  Edit,
  Plus,
  Trash2,
  Download,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Profile, Vehicle } from '../lib/supabase';

export const ProfilePage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'profile' | 'vehicles' | 'receipts' | 'settings'>('profile');
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showEditVehicle, setShowEditVehicle] = useState<string | null>(null);
  const [vehicleFormData, setVehicleFormData] = useState({
    make: '',
    model: '',
    license_plate: '',
    color: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Get the current user from AuthContext
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    if (profile) {
      setUserProfile(profile);
    }
    
    fetchVehicles();
  }, [profile]);

  const fetchVehicles = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
        
      if (error) throw error;
      setVehicles(data || []);
    } catch (err: any) {
      console.error('Error fetching vehicles:', err);
      setError('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = () => {
    setVehicleFormData({
      make: '',
      model: '',
      license_plate: '',
      color: ''
    });
    setFormError(null);
    setShowAddVehicle(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setVehicleFormData({
      make: vehicle.make,
      model: vehicle.model,
      license_plate: vehicle.license_plate,
      color: vehicle.color
    });
    setFormError(null);
    setShowEditVehicle(vehicle.id);
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ is_active: false })
        .eq('id', vehicleId);
        
      if (error) throw error;
      
      // Remove from local state
      setVehicles(vehicles.filter(v => v.id !== vehicleId));
    } catch (err: any) {
      console.error('Error deleting vehicle:', err);
      alert('Failed to delete vehicle');
    }
  };

  const handleVehicleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    
    // Validate form
    if (!vehicleFormData.make || !vehicleFormData.model || !vehicleFormData.license_plate || !vehicleFormData.color) {
      setFormError('All fields are required');
      setIsSubmitting(false);
      return;
    }
    
    try {
      if (showEditVehicle) {
        // Update existing vehicle
        const { error } = await supabase
          .from('vehicles')
          .update(vehicleFormData)
          .eq('id', showEditVehicle);
          
        if (error) throw error;
        
        // Update local state
        setVehicles(vehicles.map(v => 
          v.id === showEditVehicle ? { ...v, ...vehicleFormData } : v
        ));
        
        setShowEditVehicle(null);
      } else {
        // Add new vehicle
        const { data, error } = await supabase
          .from('vehicles')
          .insert({
            ...vehicleFormData,
            user_id: user?.id
          })
          .select();
          
        if (error) throw error;
        
        // Add to local state
        if (data && data.length > 0) {
          setVehicles([...vehicles, data[0]]);
        }
        
        setShowAddVehicle(false);
      }
    } catch (err: any) {
      console.error('Error saving vehicle:', err);
      setFormError(err.message || 'Failed to save vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVehicleFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${user?.id}/avatar.${fileExt}`;
    
    console.log('user?.id', user?.id);
    console.log('supabase.auth.getUser()', await supabase.auth.getUser());
    // อัปโหลดไฟล์ขึ้น Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      alert(uploadError.message || 'Upload failed');
      return;
    }

    // ดึง public URL
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl;

    // อัปเดต avatar_url ใน profiles
    if (publicUrl) {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id)
        .select();  // ดึงแถวกลับมาด้วย

      console.log('update result', data, updateError);

      if (updateError) {
        alert(updateError.message || 'Update profile failed');
        return;
      }

      // อัปเดต state ให้รูปเปลี่ยนทันที
      setUserProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : prev);
    }
  };

  const ProfileSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center mb-6">
          <img
            src={userProfile?.avatar_url || '/default-avatar.png'}
            alt="Avatar"
            className="w-20 h-20 rounded-full object-cover border-2 border-blue-200 mr-6"
          />
          <form
            onChange={handleAvatarChange}
          >
            <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Change Photo
              <input type="file" accept="image/*" className="hidden" />
            </label>
          </form>
</div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
          {/* <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors">
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </button> */}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={userProfile?.name || ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={userProfile?.email || ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={userProfile?.phone || ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Member Since
            </label>
            <input
              type="text"
              value={userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const VehiclesSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">My Vehicles</h3>
          <button 
            onClick={handleAddVehicle}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Vehicle</span>
          </button>
        </div>
        
        {/* Vehicle Form */}
        {(showAddVehicle || showEditVehicle) && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-blue-900">
                {showEditVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
              </h4>
              <button 
                onClick={() => {
                  setShowAddVehicle(false);
                  setShowEditVehicle(null);
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-700">{formError}</p>
              </div>
            )}
            
            <form onSubmit={handleVehicleFormSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Make
                  </label>
                  <input
                    type="text"
                    name="make"
                    value={vehicleFormData.make}
                    onChange={handleInputChange}
                    placeholder="e.g., Toyota"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    name="model"
                    value={vehicleFormData.model}
                    onChange={handleInputChange}
                    placeholder="e.g., Camry"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Plate
                  </label>
                  <input
                    type="text"
                    name="license_plate"
                    value={vehicleFormData.license_plate}
                    onChange={handleInputChange}
                    placeholder="e.g., ABC-123"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    type="text"
                    name="color"
                    value={vehicleFormData.color}
                    onChange={handleInputChange}
                    placeholder="e.g., Silver"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddVehicle(false);
                    setShowEditVehicle(null);
                  }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Save Vehicle</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
        
        <div className="space-y-4">
          {vehicles.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Car className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-700 font-medium">No vehicles found</p>
              <p className="text-sm text-gray-500 mt-1">Add your first vehicle to make booking easier</p>
              <button
                onClick={handleAddVehicle}
                className="mt-4 inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Vehicle</span>
              </button>
            </div>
          ) : (
            vehicles.map((vehicle) => (
              <div key={vehicle.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Car className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {vehicle.make} {vehicle.model}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {vehicle.license_plate} • {vehicle.color}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleEditVehicle(vehicle)}
                      className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteVehicle(vehicle.id)}
                      className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const ReceiptsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
          <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export All</span>
          </button>
        </div>
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-700 font-medium">No payment history yet</p>
          <p className="text-sm text-gray-500 mt-1">Your payment receipts will appear here</p>
        </div>
      </div>
    </div>
  );

  const SettingsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Settings</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Bell className="h-5 w-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Notifications</p>
                <p className="text-sm text-gray-600">Receive booking alerts and updates</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-sm text-gray-600">Add an extra layer of security</p>
              </div>
            </div>
            <button className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
              Enable
            </button>
          </div>
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <LogOut className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-gray-900">Sign Out</p>
                <p className="text-sm text-gray-600">Sign out of your account</p>
              </div>
            </div>
            <button 
              className="text-red-600 hover:text-red-800 font-medium transition-colors" 
              onClick={signOut}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const menuItems = [
    { id: 'profile', label: 'Profile Info', icon: User },
    { id: 'vehicles', label: 'My Vehicles', icon: Car },
    { id: 'receipts', label: 'Payment History', icon: Receipt },
    { id: 'settings', label: 'Settings', icon: Shield },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'profile': return <ProfileSection />;
      case 'vehicles': return <VehiclesSection />;
      case 'receipts': return <ReceiptsSection />;
      case 'settings': return <SettingsSection />;
      default: return <ProfileSection />;
    }
  };

  if (loading && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Profile
          </h1>
          <p className="text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                    <img
                      src={userProfile?.avatar_url || '/default-avatar.png'}
                      alt="avatar"
                      className="w-12 h-12 object-cover"
                    />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{userProfile?.name || 'User'}</h3>
                  <p className="text-sm text-gray-600">{userProfile?.email || user?.email || 'user@example.com'}</p>
                </div>
              </div>
              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id as any)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeSection === item.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
          {/* Content */}
          <div className="lg:col-span-3">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};