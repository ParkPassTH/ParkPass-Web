import React from 'react';
import { useSlotAvailability } from '../hooks/useSlotAvailability';
import { Clock, MapPin, DollarSign, Car } from 'lucide-react';

interface BookingSummaryProps {
  spot: any;
  selectedSlots: string[];
  startDate: string;
  totalCost: number;
  vehicle?: any;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  spot,
  selectedSlots,
  startDate,
  totalCost,
  vehicle
}) => {
  if (!spot || selectedSlots.length === 0) return null;

  return (
    <div className="bg-blue-50 rounded-lg p-4 mb-6">
      <h3 className="font-semibold text-blue-900 mb-3">Booking Summary</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-blue-600" />
          <span className="text-gray-700">{spot.name}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-blue-600" />
          <span className="text-gray-700">
            {selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''} on {startDate}
          </span>
        </div>
        
        {selectedSlots.length > 0 && (
          <div className="ml-6 space-y-1">
            {selectedSlots.map((timeSlot, index) => {
              const endTime = `${(parseInt(timeSlot.split(':')[0]) + 1).toString().padStart(2, '0')}:${timeSlot.split(':')[1]}`;
              return (
                <div key={timeSlot} className="text-xs text-gray-600">
                  • {timeSlot} - {endTime}
                  <SlotAvailabilityInfo 
                    spotId={spot.id} 
                    totalSlots={spot.total_slots || 1}
                    date={startDate}
                    timeSlot={timeSlot}
                  />
                </div>
              );
            })}
          </div>
        )}
        
        {vehicle && (
          <div className="flex items-center space-x-2">
            <Car className="h-4 w-4 text-blue-600" />
            <span className="text-gray-700">
              {vehicle.make} {vehicle.model} ({vehicle.license_plate})
            </span>
          </div>
        )}
        
        <div className="flex items-center space-x-2 pt-2 border-t border-blue-200">
          <DollarSign className="h-4 w-4 text-blue-600" />
          <span className="font-semibold text-blue-900">
            Total: ${totalCost.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

// Helper component to show availability info for each slot
const SlotAvailabilityInfo: React.FC<{
  spotId: string;
  totalSlots: number;
  date: string;
  timeSlot: string;
}> = ({ spotId, totalSlots, date, timeSlot }) => {
  const { availableSlots, bookedSlots, loading } = useSlotAvailability({
    spotId,
    totalSlots,
    date,
    timeSlot
  });

  if (loading) return <span className="text-gray-400"> (checking...)</span>;

  return (
    <span className="text-gray-500">
      {' '}({availableSlots - 1}/{totalSlots} will remain after booking)
    </span>
  );
};
