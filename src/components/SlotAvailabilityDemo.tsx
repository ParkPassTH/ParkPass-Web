// Test component to demonstrate real-time slot availability

import React from 'react';
import { useSlotAvailability } from '../hooks/useSlotAvailability';
import { RealTimeSlotStatus } from './RealTimeSlotStatus';

export const SlotAvailabilityDemo: React.FC = () => {
  // Example spot ID - replace with actual ID for testing
  const testSpotId = "example-spot-id";
  const testTotalSlots = 5;
  const testDate = "2025-06-25";

  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00", "13:00", 
    "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        Real-Time Slot Availability Demo
      </h2>
      
      {/* Current availability for parking spot card */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Current Spot Status (for Card)</h3>
        <RealTimeSlotStatus 
          spotId={testSpotId}
          totalSlots={testTotalSlots}
          size="large"
          showDetails={true}
        />
      </div>

      {/* Time slot availability for booking page */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Time Slots for {testDate}</h3>
        <div className="grid grid-cols-2 gap-2">
          {timeSlots.map(time => (
            <TimeSlotDemo 
              key={time}
              spotId={testSpotId}
              totalSlots={testTotalSlots}
              date={testDate}
              timeSlot={time}
            />
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Testing Instructions:</h4>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. Replace testSpotId with a real parking spot ID</li>
          <li>2. Create some test bookings in the database</li>
          <li>3. Watch the availability update in real-time</li>
          <li>4. The system automatically subscribes to booking changes</li>
        </ol>
      </div>
    </div>
  );
};

interface TimeSlotDemoProps {
  spotId: string;
  totalSlots: number;
  date: string;
  timeSlot: string;
}

const TimeSlotDemo: React.FC<TimeSlotDemoProps> = ({ 
  spotId, 
  totalSlots, 
  date, 
  timeSlot 
}) => {
  const { availableSlots, bookedSlots, loading } = useSlotAvailability({
    spotId,
    totalSlots,
    date,
    timeSlot
  });

  const getStatusColor = () => {
    if (loading) return 'border-gray-200 bg-gray-50';
    if (availableSlots === 0) return 'border-red-200 bg-red-50';
    if (availableSlots < Math.ceil(totalSlots / 2)) return 'border-yellow-200 bg-yellow-50';
    return 'border-green-200 bg-green-50';
  };

  const getTextColor = () => {
    if (loading) return 'text-gray-600';
    if (availableSlots === 0) return 'text-red-700';
    if (availableSlots < Math.ceil(totalSlots / 2)) return 'text-yellow-700';
    return 'text-green-700';
  };

  return (
    <div className={`border rounded p-3 ${getStatusColor()}`}>
      <div className="flex justify-between items-center">
        <span className="font-medium">{timeSlot}</span>
        <div className={`text-sm ${getTextColor()}`}>
          {loading ? 'Loading...' : (
            <>
              <div>{availableSlots}/{totalSlots}</div>
              {bookedSlots > 0 && (
                <div className="text-xs">({bookedSlots} booked)</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
