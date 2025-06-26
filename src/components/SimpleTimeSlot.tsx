import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface SimpleTimeSlotProps {
  timeSlot: string;
  isSelected: boolean;
  onClick: () => void;
  status: 'available' | 'limited' | 'full' | 'past' | 'loading';
}

export const SimpleTimeSlot: React.FC<SimpleTimeSlotProps> = ({
  timeSlot,
  isSelected,
  onClick,
  status
}) => {
  const { t } = useLanguage();
  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'bg-gray-100 text-gray-500 border-gray-300 animate-pulse';
      case 'past':
        return 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed opacity-60';
      case 'full':
        return 'bg-red-100 text-red-700 border-red-300 cursor-not-allowed';
      case 'limited':
        return isSelected 
          ? 'bg-yellow-500 text-white border-yellow-500 shadow-md' 
          : 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200 transition-colors';
      case 'available':
      default:
        return isSelected 
          ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
          : 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 transition-colors';
    }
  };

  const isClickable = status === 'available' || status === 'limited';

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={`
        p-2 sm:p-3 rounded-lg border-2 transition-all duration-200 text-left w-full min-h-[64px]
        ${getStatusColor()}
        ${isClickable ? 'cursor-pointer active:scale-95 hover:shadow-sm' : 'cursor-not-allowed'}
      `}
    >
      <div className="flex flex-col space-y-1">
        <div className="flex justify-between items-center">
          <div className="font-semibold text-xs sm:text-sm">
            {timeSlot}
          </div>
          {isSelected && (
            <div className="text-xs bg-white bg-opacity-20 px-1.5 py-0.5 rounded-full text-white font-medium">
              ✓
            </div>
          )}
        </div>
        
        <div className="text-xs">
          {status === 'loading' && t('loading')}
          {status === 'past' && 'Past'}
          {status === 'full' && 'Full'}
          {status === 'limited' && 'Limited'}
          {status === 'available' && 'Available'}
        </div>
      </div>
    </button>
  );
};
