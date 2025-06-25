import React from 'react';
import { useSlotAvailability } from '../hooks/useSlotAvailability';
import { Car, Clock } from 'lucide-react';

interface RealTimeSlotStatusProps {
  spotId: string;
  totalSlots: number;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
}

export const RealTimeSlotStatus: React.FC<RealTimeSlotStatusProps> = ({
  spotId,
  totalSlots,
  size = 'medium',
  showDetails = false
}) => {
  const { availableSlots, bookedSlots, loading } = useSlotAvailability({
    spotId,
    totalSlots
  });

  const getStatusColor = () => {
    if (loading) return 'bg-gray-100 text-gray-600';
    if (availableSlots === 0) return 'bg-red-100 text-red-800';
    if (availableSlots < Math.ceil(totalSlots / 2)) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = () => {
    if (loading) return 'Checking...';
    if (availableSlots === 0) return 'Full';
    if (availableSlots < Math.ceil(totalSlots / 2)) return 'Limited';
    return 'Available';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-2 py-1 text-xs';
      case 'large':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1 text-sm';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`
        rounded-full font-medium flex items-center space-x-1
        ${getStatusColor()}
        ${getSizeClasses()}
      `}>
        <Car className="h-4 w-4" />
        <span>
          {loading ? '...' : availableSlots}/{totalSlots}
        </span>
      </div>
      
      {showDetails && !loading && (
        <div className="text-xs text-gray-500">
          {getStatusText()}
          {bookedSlots > 0 && ` (${bookedSlots} booked)`}
        </div>
      )}
    </div>
  );
};

interface TimeSlotStatusProps {
  spotId: string;
  totalSlots: number;
  date: string;
  timeSlot: string;
  className?: string;
}

export const TimeSlotStatus: React.FC<TimeSlotStatusProps> = ({
  spotId,
  totalSlots,
  date,
  timeSlot,
  className = ''
}) => {
  const { availableSlots, bookedSlots, loading } = useSlotAvailability({
    spotId,
    totalSlots,
    date,
    timeSlot
  });

  const getStatusInfo = () => {
    if (loading) return { color: 'text-gray-500', text: 'Checking...' };
    if (availableSlots === 0) return { color: 'text-red-600', text: 'Full' };
    if (availableSlots < Math.ceil(totalSlots / 2)) return { color: 'text-yellow-600', text: 'Limited' };
    return { color: 'text-green-600', text: 'Available' };
  };

  const status = getStatusInfo();

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center space-x-2">
        <Clock className="h-4 w-4 text-gray-400" />
        <span className="font-medium">{timeSlot}</span>
      </div>
      
      <div className="flex items-center space-x-2">
        <span className={`text-sm font-medium ${status.color}`}>
          {loading ? '...' : availableSlots}/{totalSlots}
        </span>
        <span className={`text-xs ${status.color}`}>
          {status.text}
        </span>
      </div>
    </div>
  );
};
