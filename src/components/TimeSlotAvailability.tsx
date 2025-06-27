import React from 'react';
import { useSlotAvailability } from '../hooks/useSlotAvailability';
import { SlotAvailabilityErrorBoundary } from './SlotAvailabilityErrorBoundary';
import { useLanguage } from '../contexts/LanguageContext';
import { BookingType } from '../types';

interface TimeSlotAvailabilityProps {
  spotId: string;
  totalSlots: number;
  date: string; // YYYY-MM-DD format
  timeSlot: string; // HH:MM format (for hourly) or date range (for daily/monthly)
  bookingType: BookingType;
  isBooked: boolean;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
}

export const TimeSlotAvailability: React.FC<TimeSlotAvailabilityProps> = ({
  spotId,
  totalSlots,
  date,
  timeSlot,
  bookingType,
  isBooked,
  isSelected,
  onClick,
  className = ''
}) => {
  const { t } = useLanguage();
  
  return (
    <SlotAvailabilityErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center p-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[64px] cursor-pointer hover:bg-gray-100">
          <div className="text-xs font-medium text-gray-600">{timeSlot}</div>
          <div className="text-xs text-gray-500">{totalSlots} {t('slots')}</div>
        </div>
      }
    >
      <TimeSlotAvailabilityInner
        spotId={spotId}
        totalSlots={totalSlots}
        date={date}
        timeSlot={timeSlot}
        bookingType={bookingType}
        isBooked={isBooked}
        isSelected={isSelected}
        onClick={onClick}
        className={className}
      />
    </SlotAvailabilityErrorBoundary>
  );
};

const TimeSlotAvailabilityInner: React.FC<TimeSlotAvailabilityProps> = ({
  spotId,
  totalSlots,
  date,
  timeSlot,
  bookingType,
  isBooked,
  isSelected,
  onClick,
  className = ''
}) => {
  const { t } = useLanguage();
  // Use fallback values if hook fails
  let availableSlots = totalSlots;
  let bookedSlots = 0;
  let loading = false;

  try {
    const hookResult = useSlotAvailability({
      spotId,
      totalSlots,
      date,
      timeSlot,
      bookingType
    });
    availableSlots = hookResult.availableSlots ?? totalSlots;
    bookedSlots = hookResult.bookedSlots ?? 0;
    loading = hookResult.loading ?? false;
  } catch (error) {
    console.error('Hook error, using fallback values:', error);
    // Keep fallback values
  }

  // Debug logging (only for important slots or errors)
  if (availableSlots === 0 || bookedSlots > 0) {
    console.log(`TimeSlot ${timeSlot}: ${availableSlots}/${totalSlots} available, ${bookedSlots} booked`);
  }

  // Return simple fallback if data is invalid
  if (!spotId || !date || !timeSlot) {
    return (
      <div className="p-2 rounded-lg border-2 border-gray-300 bg-gray-100 text-center">
        <div className="text-xs text-gray-500">{t('invalid_slot_data')}</div>
      </div>
    );
  }

  // Check if time slot has at least 30 minutes remaining until the END of the slot
  const hasMinimumTime = () => {
    const now = new Date();
    
    // Parse date and time more reliably
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = timeSlot.split(':').map(Number);
    
    // Create date in local timezone to avoid timezone issues
    const slotStartDateTime = new Date(year, month - 1, day, hour, minute, 0);
    // Calculate end time of the slot (1 hour later)
    const slotEndDateTime = new Date(slotStartDateTime.getTime() + 60 * 60 * 1000);
    
    // Check if there are at least 30 minutes remaining until the slot ends
    const remainingMs = slotEndDateTime.getTime() - now.getTime();
    const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
    
    // Debug logging for midnight and early morning slots only
    /* if ((timeSlot === '00:00' || timeSlot === '01:00') && remainingMinutes < 60) {
      console.log(`TimeSlotAvailability hasMinimumTime debug for ${timeSlot}:`, {
        remainingMinutes,
        hasMinTime: remainingMinutes >= 30
      });
    } */
    
    return remainingMinutes >= 30;
  };

  // Check if time slot is in the past
  const isPastTime = () => {
    const now = new Date();
    
    // For daily/monthly bookings, check if the date is past today or if today but past noon
    if (bookingType === 'daily' || bookingType === 'monthly') {
      const today = new Date().toISOString().split('T')[0];
      const currentHour = now.getHours();
      
      // If it's a past date, can't book
      if (date < today) {
        return true;
      }
      
      // If it's today, check if it's past noon (12:00)
      if (date === today && currentHour >= 12) {
        return true;
      }
      
      return false;
    }
    
    // Parse date and time more reliably
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = timeSlot.split(':').map(Number);
    
    // Create date in local timezone to avoid timezone issues
    const slotStartDateTime = new Date(year, month - 1, day, hour, minute, 0);
    // Calculate end time of the slot (1 hour later)
    const slotEndDateTime = new Date(slotStartDateTime.getTime() + 60 * 60 * 1000);
    
    // For all slots, check if current time has passed the end of the slot
    // This allows booking as long as there's time left in the slot
    const isPast = slotEndDateTime <= now;
    
    // Debug logging for midnight and early morning slots only
    if ((timeSlot === '00:00' || timeSlot === '01:00') && isPast) {
      console.log(`TimeSlotAvailability isPastTime debug for ${timeSlot}: slot ended`);
    }
    
    return isPast;
  };

  const getSlotStatus = () => {
    if (loading) return 'loading';
    if (isPastTime()) return 'past';
    if (!hasMinimumTime()) return 'no-minimum-time';
    if (isBooked) return 'booked';
    if (availableSlots === 0) return 'full';
    if (availableSlots < Math.ceil(totalSlots / 2)) return 'limited';
    return 'available';
  };

  const getStatusColor = () => {
    const status = getSlotStatus();
    switch (status) {
      case 'loading':
        return 'bg-gray-100 text-gray-500 border-gray-300 animate-pulse';
      case 'past':
        return 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed opacity-60';
      case 'no-minimum-time':
        return 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed opacity-60';
      case 'booked':
        return 'bg-gray-300 text-gray-600 border-gray-400 cursor-not-allowed';
      case 'full':
        return 'bg-red-100 text-red-700 border-red-300 cursor-not-allowed';
      case 'limited':
        return isSelected 
          ? 'bg-yellow-500 text-white border-yellow-500 shadow-md' 
          : 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200 hover:border-yellow-400 transition-colors';
      case 'available':
      default:
        return isSelected 
          ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
          : 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 hover:border-blue-400 transition-colors';
    }
  };

  const isClickable = !loading && !isBooked && availableSlots > 0 && !isPastTime() && hasMinimumTime();

  // Function to get display text for slot
  const getDisplayText = () => {
    if (bookingType === 'daily' || bookingType === 'monthly') {
      const dateObj = new Date(date);
      return {
        primary: dateObj.getDate().toString(), // Day number
        secondary: dateObj.toLocaleDateString('en-US', { weekday: 'short' }), // Day name
        tertiary: dateObj.toLocaleDateString('en-US', { month: 'short' }) // Month name
      };
    }
    return {
      primary: timeSlot,
      secondary: '',
      tertiary: ''
    };
  };

  const displayText = getDisplayText();

  // Add error handling for the render
  if (loading) {
    return (
      <button
        disabled
        className={`
          p-2 sm:p-3 rounded-lg border-2 transition-all duration-200 text-left w-full 
          ${className?.includes('h-16') ? 'min-h-[64px]' : 'min-h-[70px] sm:min-h-[75px]'}
          bg-gray-100 text-gray-500 border-gray-300 animate-pulse cursor-not-allowed
          ${className}
        `}
      >
        <div className="flex flex-col space-y-1 sm:space-y-1.5">
          <div className="font-semibold text-xs sm:text-sm lg:text-base">
            {displayText.primary}
          </div>
          <div className="text-xs sm:text-sm">
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 sm:w-3 sm:h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
              <span className="hidden sm:inline">{t('loading')}</span>
            </span>
          </div>
        </div>
      </button>
    );
  }

  try {
    return (
      <button
        onClick={isClickable ? onClick : undefined}
        disabled={!isClickable}
        aria-label={`Time slot ${timeSlot}, ${availableSlots} of ${totalSlots} available${isSelected ? ', selected' : ''}`}
        role="button"
        tabIndex={isClickable ? 0 : -1}
        className={`
          p-2 sm:p-3 rounded-lg border-2 transition-all duration-200 text-left w-full 
          ${className?.includes('h-16') ? 'min-h-[64px]' : 'min-h-[70px] sm:min-h-[75px]'}
          ${getStatusColor()}
          ${className}
          ${isClickable ? 'cursor-pointer active:scale-95 hover:shadow-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-1' : 'cursor-not-allowed'}
        `}
      >
        <div className="flex flex-col space-y-1 sm:space-y-1.5">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-xs sm:text-sm lg:text-base flex items-center space-x-1">
              {bookingType === 'daily' || bookingType === 'monthly' ? (
                <div className="flex items-center space-x-1">
                  <span className="text-2xl sm:text-3xl font-bold">{displayText.primary}</span>
                  <div className="text-right">
                    <div className="text-xs sm:text-sm font-medium">{displayText.secondary}</div>
                    <div className="text-xs opacity-75">{displayText.tertiary}</div>
                  </div>
                </div>
              ) : (
                <span>{displayText.primary}</span>
              )}
              {!loading && !isPastTime() && !isBooked && (
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-current rounded-full opacity-60 animate-pulse"></div>
              )}
            </div>
            {isSelected && (
              <div className="text-xs bg-white bg-opacity-20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-white font-medium">
                ✓
              </div>
            )}
          </div>
          
          <div className="text-xs sm:text-sm">
            {loading ? (
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 sm:w-3 sm:h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                <span className="hidden sm:inline">{t('loading')}</span>
              </span>
            ) : isPastTime() ? (
              <span className="font-medium">{t('past_time_slot')}</span>
            ) : !hasMinimumTime() ? (
              <div className="space-y-0.5">
                <span className="font-medium text-xs">{t('too_late')}</span>
                <div className="text-xs opacity-75">
                  {t('less_than_30_min')}
                </div>
              </div>
            ) : isBooked ? (
              <span className="font-medium">{t('booked')}</span>
            ) : (
              <div className="space-y-0.5 sm:space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-xs sm:text-sm">
                    {availableSlots}/{totalSlots}
                    <span className="hidden sm:inline"> {t('available')}</span>
                  </span>
                </div>
                {bookedSlots > 0 && (
                  <div className="text-xs opacity-75 hidden sm:block">
                    {bookedSlots} {t('booked_slots')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  } catch (error) {
    console.error('TimeSlotAvailability render error:', error);
    return (
      <div className="p-3 rounded-lg border-2 border-red-200 bg-red-50 text-red-700">
        <div className="text-sm">{t('error_loading_slot')}</div>
      </div>
    );
  }
};
