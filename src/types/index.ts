export interface DayHours {
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  is24Hours?: boolean;
}

export interface OpeningHours {
  [key: string]: DayHours;
}

export interface PricingOptions {
  hourly?: number;
  daily?: number;
  monthly?: number;
}

export interface PricingConfig {
  hour: { enabled: boolean; price: number };
  day: { enabled: boolean; price: number };
  month: { enabled: boolean; price: number };
}

export type BookingType = 'hourly' | 'daily' | 'monthly';

export interface BookingSelection {
  type: BookingType;
  startDate: string;
  endDate?: string; // For daily and monthly bookings
  startTime?: string; // For hourly bookings
  endTime?: string; // For hourly bookings
  duration?: number; // Number of hours/days/months
}

export interface ParkingSpot {
  id: string;
  name: string;
  address: string;
  price: number;
  daily_price?: number;
  monthly_price?: number;
  priceType: 'hour' | 'day' | 'month';
  pricing?: PricingConfig; // New field for multiple pricing options
  totalSlots: number;
  availableSlots: number;
  rating: number;
  reviewCount: number;
  images: string[];
  amenities: string[];
  openingHours: string | OpeningHours;
  phone?: string;
  description: string;
  lat: number;
  lng: number;
  ownerId: string;
}

export interface Booking {
  id: string;
  spotId: string;
  userId: string;
  startTime: string;
  endTime: string;
  vehicleId: string;
  totalCost: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  qrCode: string;
  pin: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
  color: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicles: Vehicle[];
}

export interface Review {
  id: string;
  userId: string;
  spotId: string;
  rating: number;
  comment: string;
  createdAt: string;
  userName: string;
}