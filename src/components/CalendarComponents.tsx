import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface DaySlotAvailabilityProps {
  spotId: string;
  totalSlots: number;
  date: string; // YYYY-MM-DD format
  isBooked: boolean;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
}

export const DaySlotAvailability: React.FC<DaySlotAvailabilityProps> = ({
  date,
  isBooked,
  isSelected,
  onClick,
  className = ''
}) => {
  const { t } = useLanguage();
  
  // Parse date
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.toLocaleDateString('th-TH', { weekday: 'short' });
  const dayOfMonth = dateObj.getDate();
  
  const getSlotStatus = () => {
    if (isBooked) return 'booked';
    // For daily slots, assume available unless explicitly booked
    return 'available';
  };

  const getStatusColor = () => {
    const status = getSlotStatus();
    switch (status) {
      case 'booked':
        return 'bg-gray-300 text-gray-600 border-gray-400 cursor-not-allowed';
      case 'available':
      default:
        return isSelected 
          ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
          : 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 hover:border-blue-400 transition-colors';
    }
  };

  const isClickable = !isBooked;

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={`
        p-3 rounded-lg border-2 transition-all duration-200 text-center w-full min-h-[80px]
        ${getStatusColor()}
        ${className}
        ${isClickable ? 'cursor-pointer active:scale-95 hover:shadow-sm' : 'cursor-not-allowed'}
      `}
    >
      <div className="flex flex-col items-center space-y-1">
        <div className="text-xs font-medium opacity-75">
          {dayOfWeek}
        </div>
        <div className="text-lg font-bold">
          {dayOfMonth}
        </div>
        <div className="text-xs">
          {isBooked ? t('booked') : t('available')}
        </div>
        {isSelected && (
          <div className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
            ✓
          </div>
        )}
      </div>
    </button>
  );
};

interface MonthlyCalendarProps {
  startDate: string;
  endDate: string;
  onDateRangeChange: (start: string, end: string) => void;
  bookedDates?: string[];
  minDays?: number;
  maxDays?: number;
}

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  startDate,
  endDate,
  onDateRangeChange,
  bookedDates = [],
  minDays = 30,
  maxDays = 31
}) => {
  const { t } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingStart, setSelectingStart] = useState(true);
  
  const today = new Date();
  const startDateObj = startDate ? new Date(startDate) : null;
  const endDateObj = endDate ? new Date(endDate) : null;

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startCalendar = new Date(firstDay);
    startCalendar.setDate(startCalendar.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startCalendar);
    
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const formatDateString = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const isDateInRange = (date: Date) => {
    if (!startDateObj || !endDateObj) return false;
    return date >= startDateObj && date <= endDateObj;
  };

  const isDateSelectable = (date: Date) => {
    const dateStr = formatDateString(date);
    const isPast = date < today;
    const isBooked = bookedDates.includes(dateStr);
    
    return !isPast && !isBooked;
  };

  const handleDateClick = (date: Date) => {
    if (!isDateSelectable(date)) return;
    
    const dateStr = formatDateString(date);
    
    if (selectingStart || !startDate) {
      // Selecting start date
      onDateRangeChange(dateStr, '');
      setSelectingStart(false);
    } else {
      // Selecting end date
      const startDateObj = new Date(startDate);
      const daysDiff = Math.ceil((date.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
      
      if (date < startDateObj) {
        // If selected date is before start, make it the new start
        onDateRangeChange(dateStr, '');
        setSelectingStart(false);
      } else if (daysDiff < minDays) {
        alert(t('minimum_days_required', { days: minDays }));
      } else if (daysDiff > maxDays) {
        alert(t('maximum_days_exceeded', { days: maxDays }));
      } else {
        onDateRangeChange(startDate, dateStr);
        setSelectingStart(true);
      }
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  const calendarDays = generateCalendarDays();
  const currentMonthName = currentMonth.toLocaleDateString('th-TH', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-semibold">{currentMonthName}</h3>
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Selection Info */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          {selectingStart || !startDate ? 
            t('select_start_date') : 
            startDate && !endDate ? 
              t('select_end_date') : 
              t('date_range_selected')
          }
        </p>
        {startDate && endDate && (
          <p className="text-xs text-blue-600 mt-1">
            {startDate} → {endDate} ({Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} {t('days')})
          </p>
        )}
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, index) => (
          <div key={index} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const dateStr = formatDateString(date);
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
          const isToday = formatDateString(date) === formatDateString(today);
          const isSelected = dateStr === startDate || dateStr === endDate;
          const isInRange = isDateInRange(date);
          const isSelectable = isDateSelectable(date);
          const isBooked = bookedDates.includes(dateStr);

          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              disabled={!isSelectable}
              className={`
                p-2 text-sm rounded-lg transition-all duration-200 min-h-[40px]
                ${!isCurrentMonth ? 'text-gray-300' : ''}
                ${isToday ? 'ring-2 ring-blue-300' : ''}
                ${isSelected ? 'bg-blue-600 text-white' : ''}
                ${isInRange && !isSelected ? 'bg-blue-100 text-blue-800' : ''}
                ${isBooked ? 'bg-red-100 text-red-600 cursor-not-allowed' : ''}
                ${!isBooked && isSelectable && !isSelected && !isInRange ? 'hover:bg-gray-100' : ''}
                ${!isSelectable && !isBooked ? 'text-gray-400 cursor-not-allowed' : ''}
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Reset Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => {
            onDateRangeChange('', '');
            setSelectingStart(true);
          }}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          {t('clear_selection')}
        </button>
      </div>
    </div>
  );
};
