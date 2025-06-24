import React, { useState, useEffect } from 'react';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface DayHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  is24Hours: boolean;
}

interface OpeningHoursProps {
  value: string;
  onChange: (hours: string) => void;
}

const DAYS = [
  'Monday',
  'Tuesday', 
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const TIME_OPTIONS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

export const OpeningHours: React.FC<OpeningHoursProps> = ({ value, onChange }) => {
  const [hours, setHours] = useState<Record<string, DayHours>>({});
  const [is24_7, setIs24_7] = useState(false);

  // Initialize hours from value prop
  useEffect(() => {
    if (value) {
      if (value === '24/7 Access') {
        setIs24_7(true);
        initializeAllDays24Hours();
      } else {
        try {
          const parsed = JSON.parse(value);
          setHours(parsed);
          setIs24_7(false);
        } catch {
          // Initialize with default values if parsing fails
          initializeDefaultHours();
        }
      }
    } else {
      initializeDefaultHours();
    }
  }, [value]);

  const initializeDefaultHours = () => {
    const defaultHours: Record<string, DayHours> = {};
    DAYS.forEach(day => {
      defaultHours[day] = {
        isOpen: false,
        openTime: '09:00',
        closeTime: '17:00',
        is24Hours: false
      };
    });
    setHours(defaultHours);
    setIs24_7(false);
  };

  const initializeAllDays24Hours = () => {
    const allDays24: Record<string, DayHours> = {};
    DAYS.forEach(day => {
      allDays24[day] = {
        isOpen: true,
        openTime: '00:00',
        closeTime: '23:59',
        is24Hours: true
      };
    });
    setHours(allDays24);
    onChange('24/7 Access');
  };

  const updateHours = (newHours: Record<string, DayHours>) => {
    setHours(newHours);
    
    // Check if all days are 24/7
    const allDays24Hours = DAYS.every(day => 
      newHours[day]?.isOpen && newHours[day]?.is24Hours
    );
    
    if (allDays24Hours) {
      setIs24_7(true);
      onChange('24/7 Access');
    } else {
      setIs24_7(false);
      onChange(JSON.stringify(newHours));
    }
  };

  const toggleDay = (day: string, isOpen: boolean) => {
    const newHours = {
      ...hours,
      [day]: {
        ...hours[day],
        isOpen,
        is24Hours: isOpen ? hours[day]?.is24Hours || false : false
      }
    };
    updateHours(newHours);
  };

  const toggle24Hours = (day: string, is24Hours: boolean) => {
    const newHours = {
      ...hours,
      [day]: {
        ...hours[day],
        is24Hours,
        openTime: is24Hours ? '00:00' : hours[day]?.openTime || '09:00',
        closeTime: is24Hours ? '23:59' : hours[day]?.closeTime || '17:00'
      }
    };
    updateHours(newHours);
  };

  const updateTime = (day: string, timeType: 'openTime' | 'closeTime', time: string) => {
    const newHours = {
      ...hours,
      [day]: {
        ...hours[day],
        [timeType]: time
      }
    };
    updateHours(newHours);
  };

  const selectAllDays = () => {
    const newHours: Record<string, DayHours> = {};
    DAYS.forEach(day => {
      newHours[day] = {
        isOpen: true,
        openTime: '09:00',
        closeTime: '17:00',
        is24Hours: false
      };
    });
    updateHours(newHours);
  };

  const set24HoursAll = () => {
    initializeAllDays24Hours();
    setIs24_7(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Opening Hours</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAllDays}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Select All Days
          </button>
          <button
            type="button"
            onClick={set24HoursAll}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            24/7 Access
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {DAYS.map(day => (
          <div key={day} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-2 w-24">
              <Checkbox
                checked={hours[day]?.isOpen || false}
                onCheckedChange={(checked) => toggleDay(day, checked as boolean)}
              />
              <Label className="text-sm font-medium">{day}</Label>
            </div>

            {hours[day]?.isOpen && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={hours[day]?.is24Hours || false}
                    onCheckedChange={(checked) => toggle24Hours(day, checked as boolean)}
                  />
                  <Label className="text-sm">24 Hours</Label>
                </div>

                {!hours[day]?.is24Hours && (
                  <div className="flex items-center space-x-2">
                    <Select
                      value={hours[day]?.openTime || '09:00'}
                      onValueChange={(time) => updateTime(day, 'openTime', time)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <span className="text-sm text-gray-500">to</span>
                    
                    <Select
                      value={hours[day]?.closeTime || '17:00'}
                      onValueChange={(time) => updateTime(day, 'closeTime', time)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {is24_7 && (
        <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-green-800 font-semibold">24/7 Access Available</span>
        </div>
      )}
    </div>
  );
};