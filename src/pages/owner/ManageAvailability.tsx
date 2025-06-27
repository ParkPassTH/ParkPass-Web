import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Plus, 
  Edit, 
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

interface TimeSlot {
  id: string;
  spot_id: string;
  start_time: string; // Now UTC timestamp string
  end_time: string;   // Now UTC timestamp string
  status: 'available' | 'blocked' | 'maintenance';
  reason?: string;
  slots_affected: number;
  created_at?: string;
  updated_at?: string;
}

interface ParkingSpot {
  id: string;
  name: string;
  total_slots: number;
  available_slots: number;
  owner_id: string;
  is_active: boolean;
}

export const ManageAvailability: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spot, setSpot] = useState<ParkingSpot | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [newBlock, setNewBlock] = useState({
    date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    status: 'blocked' as 'blocked' | 'maintenance',
    reason: '',
    slots_affected: 1
  });

  // Fetch parking spot details
  useEffect(() => {
    const fetchSpotDetails = async () => {
      if (!id || !profile) return;
      
      try {
        setLoading(true);
        
        // Check if user owns this spot
        const { data: spotData, error: spotError } = await supabase
          .from('parking_spots')
          .select('*')
          .eq('id', id)
          .eq('owner_id', profile.id)
          .single();
          
        if (spotError) throw spotError;
        
        if (!spotData) {
          setError(t('parking_spot_not_found'));
          return;
        }
        
        setSpot(spotData);
        
        // Fetch time blocks for this spot
        await fetchTimeSlots();
        
      } catch (err: any) {
        console.error('Error fetching spot details:', err);
        setError(err.message || t('failed_to_load_spot_details'));
      } finally {
        setLoading(false);
      }
    };

    fetchSpotDetails();
  }, [id, profile]);

  // Fetch time slots
  const fetchTimeSlots = async () => {
    if (!id) return;
    
    try {
      // Query using new timestamp schema - get future blocks only
      const currentTime = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('parking_availability')
        .select('*')
        .eq('spot_id', id)
        .gte('end_time', currentTime) // Only get blocks that haven't ended yet
        .order('start_time', { ascending: true });
        
      if (error) throw error;
      
      console.log('🔍 Fetched time slots:', data);
      setTimeSlots(data || []);
    } catch (err: any) {
      console.error('Error fetching time slots:', err);
    }
  };

  // Add new time block
  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 handleAddBlock started');
    
    if (!id || !spot) {
      console.log('❌ Missing id or spot');
      return;
    }
    
    console.log('📋 Block data to insert:', newBlock);
    
    try {
      // Validate times
      if (newBlock.start_time >= newBlock.end_time) {
        console.log('❌ Invalid time range');
        alert(t('end_time_must_be_after_start_time'));
        return;
      }
      
      // Convert to UTC timestamp format like BookingPage does
      const startDateTimeString = `${newBlock.date}T${newBlock.start_time}:00+07:00`;
      const endDateTimeString = `${newBlock.date}T${newBlock.end_time}:00+07:00`;
      
      console.log('📅 Converting to UTC timestamps:', {
        originalDate: newBlock.date,
        originalStartTime: newBlock.start_time,
        originalEndTime: newBlock.end_time,
        startDateTimeString,
        endDateTimeString
      });
      
      // Check for overlapping time blocks and calculate total blocked slots
      // Since we now use UTC timestamps, we need to convert the new block times to compare
      const newBlockStart = new Date(`${newBlock.date}T${newBlock.start_time}:00+07:00`);
      const newBlockEnd = new Date(`${newBlock.date}T${newBlock.end_time}:00+07:00`);
      
      const overlappingSlots = timeSlots.filter(slot => {
        const slotStart = new Date(slot.start_time);
        const slotEnd = new Date(slot.end_time);
        
        // Check for time overlap
        return (newBlockStart < slotEnd && newBlockEnd > slotStart);
      });
      
      // Calculate total blocked slots in overlapping time
      const totalBlockedSlots = overlappingSlots.reduce((total, slot) => total + slot.slots_affected, 0);
      const newTotalBlocked = totalBlockedSlots + newBlock.slots_affected;
      
      // Check if total blocked slots would exceed total available slots
      if (newTotalBlocked > spot.total_slots) {
        alert(t('total_blocked_slots_exceed_available') + ` (${newTotalBlocked}/${spot.total_slots})`);
        return;
      }
      
      console.log('🎯 About to insert into database...');
      
      const { data, error } = await supabase
        .from('parking_availability')
        .insert([{
          spot_id: id,
          start_time: startDateTimeString,
          end_time: endDateTimeString,
          status: newBlock.status,
          reason: newBlock.reason || null,
          slots_affected: newBlock.slots_affected
        }])
        .select()
        .single();
        
      console.log('✅ Insert block result:', { 
        success: !error,
        data, 
        error, 
        insertData: {
          spot_id: id,
          start_time: startDateTimeString,
          end_time: endDateTimeString,
          status: newBlock.status,
          reason: newBlock.reason || null,
          slots_affected: newBlock.slots_affected
        }
      });
        
      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      console.log('🎉 Successfully inserted time block!');
      
      // Refresh time slots from database to get updated list
      await fetchTimeSlots();
      
      setNewBlock({
        date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        status: 'blocked',
        reason: '',
        slots_affected: 1
      });
      setShowAddBlock(false);
      
    } catch (err: any) {
      console.error('Error adding time block:', err);
      alert(err.message || t('failed_to_add_time_block'));
    }
  };

  // Delete time block
  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm(t('remove_time_block_confirm'))) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('parking_availability')
        .delete()
        .eq('id', blockId);
        
      if (error) throw error;
      
      setTimeSlots(prev => prev.filter(slot => slot.id !== blockId));
      
    } catch (err: any) {
      console.error('Error deleting time block:', err);
      alert(err.message || t('failed_to_delete_time_block'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-100';
      case 'blocked': return 'text-red-600 bg-red-100';
      case 'maintenance': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-4 w-4" />;
      case 'blocked': return <XCircle className="h-4 w-4" />;
      case 'maintenance': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Helper function to format timestamp to local date and time for display
  const formatSlotDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false,
        timeZone: 'Asia/Bangkok'
      })
    };
  };

  // Helper function to check if slot is on selected date
  const isSlotOnDate = (timestamp: string, selectedDate: string) => {
    const slotDate = new Date(timestamp);
    // Convert to Thailand timezone and get date string
    const slotDateString = slotDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    return slotDateString === selectedDate;
  };

  const filteredSlots = timeSlots.filter(slot => isSlotOnDate(slot.start_time, selectedDate));

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
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('error')}</h2>
          <p className="text-gray-600 mb-4">{error || t('parking_spot_not_found')}</p>
          <button
            onClick={() => navigate('/owner')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('spot_back_to_dashboard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button 
          onClick={() => navigate('/owner')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>{t('spot_back_to_dashboard')}</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('manage_availability')}
            </h1>
            <p className="text-gray-600 mb-4">
              {spot.name} - {t('control_when_parking_spots_available')}
            </p>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <p className="font-semibold text-blue-900">{t('total_slots')}: {spot.total_slots}</p>
                  <p className="text-sm text-blue-700">{spot.name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Date Selector */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <Calendar className="h-5 w-5 text-gray-600" />
                <label className="block text-sm font-medium text-gray-700">
                  {t('select_date')}
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <button
                onClick={() => setShowAddBlock(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{t('block_time')}</span>
              </button>
            </div>
          </div>

          {/* Time Blocks for Selected Date */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('time_blocks_for')} {new Date(selectedDate).toLocaleDateString()}
            </h3>
            
            {filteredSlots.length > 0 ? (
              <div className="space-y-4">
                {filteredSlots.map((slot) => (
                  <div key={slot.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(slot.status)}`}>
                          {getStatusIcon(slot.status)}
                          <span className="capitalize">{t(slot.status)}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>{formatSlotDateTime(slot.start_time).time} - {formatSlotDateTime(slot.end_time).time}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {slot.slots_affected} {t('slots_affected_lowercase')}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteBlock(slot.id)}
                          className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {slot.reason && (
                      <div className="mt-2 text-sm text-gray-600">
                        <strong>{t('reason')}:</strong> {slot.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>{t('no_time_blocks_set')}</p>
                <p className="text-sm">{t('all_slots_available_operating_hours')}</p>
              </div>
            )}
          </div>

          {/* All Time Blocks */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('all_upcoming_time_blocks')}
            </h3>
            
            {timeSlots.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('date')}</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('time')}</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('status')}</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('slots')}</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('reason')}</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((slot) => (
                      <tr key={slot.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">{formatSlotDateTime(slot.start_time).date}</td>
                        <td className="py-3 px-4">{formatSlotDateTime(slot.start_time).time} - {formatSlotDateTime(slot.end_time).time}</td>
                        <td className="py-3 px-4">
                          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(slot.status)}`}>
                            {getStatusIcon(slot.status)}
                            <span className="capitalize">{t(slot.status)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{slot.slots_affected}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{slot.reason || '-'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1">
                            {/* <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                              <Edit className="h-4 w-4 text-gray-500" />
                            </button> */}
                            <button 
                              onClick={() => handleDeleteBlock(slot.id)}
                              className="p-1 hover:bg-red-100 rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>{t('no_time_blocks_configured')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Add Block Modal */}
        {showAddBlock && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">{t('block_time_slot')}</h3>
                  <button
                    onClick={() => setShowAddBlock(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XCircle className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <form onSubmit={handleAddBlock} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('date')}
                    </label>
                    <input
                      type="date"
                      value={newBlock.date}
                      onChange={(e) => setNewBlock(prev => ({ ...prev, date: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('start_time')}
                      </label>
                      <select
                        value={newBlock.start_time}
                        onChange={(e) => setNewBlock(prev => ({ ...prev, start_time: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        required
                      >
                        <option value="">{t('select_hour')}</option>
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = i.toString().padStart(2, '0');
                          return (
                            <option key={hour} value={`${hour}:00`}>
                              {hour}:00
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('end_time')}
                      </label>
                      <select
                        value={newBlock.end_time}
                        onChange={(e) => setNewBlock(prev => ({ ...prev, end_time: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        required
                      >
                        <option value="">{t('select_hour')}</option>
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = i.toString().padStart(2, '0');
                          return (
                            <option key={hour} value={`${hour}:00`}>
                              {hour}:00
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('status')}
                    </label>
                    <select
                      value={newBlock.status}
                      onChange={(e) => setNewBlock(prev => ({ ...prev, status: e.target.value as 'blocked' | 'maintenance' }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="blocked">{t('blocked')}</option>
                      <option value="maintenance">{t('maintenance')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('slots_affected')}
                    </label>
                    <input
                      type="number"
                      value={newBlock.slots_affected}
                      onChange={(e) => setNewBlock(prev => ({ ...prev, slots_affected: parseInt(e.target.value) || 1 }))}
                      min="1"
                      max={spot.total_slots}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('reason_optional')}
                    </label>
                    <textarea
                      value={newBlock.reason}
                      onChange={(e) => setNewBlock(prev => ({ ...prev, reason: e.target.value }))}
                      rows={3}
                      placeholder={t('example_reason_placeholder')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddBlock(false)}
                      className="flex-1 border border-gray-200 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      {t('add_block')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};