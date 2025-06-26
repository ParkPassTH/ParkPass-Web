import { ParkingSpot as SupabaseParkingSpot } from '../services/supabaseService';
import { ParkingSpot as UIType } from '../types';

// Convert Supabase ParkingSpot to UI ParkingSpot
export const convertSupabaseToUI = (supabaseSpot: SupabaseParkingSpot): UIType => {
  return {
    id: supabaseSpot.id,
    name: supabaseSpot.name,
    address: supabaseSpot.address,
    price: supabaseSpot.price,
    priceType: supabaseSpot.price_type as 'hour' | 'day' | 'month',
    totalSlots: supabaseSpot.total_slots,
    availableSlots: supabaseSpot.available_slots,
    rating: 4.5, // Default rating since it's not in Supabase schema
    reviewCount: 0, // Default review count
    images: supabaseSpot.images || [],
    amenities: supabaseSpot.amenities || [],
    openingHours: supabaseSpot.operating_hours || {},
    phone: '', // Default phone
    description: supabaseSpot.description || '',
    lat: supabaseSpot.latitude || 0,
    lng: supabaseSpot.longitude || 0,
    ownerId: supabaseSpot.owner_id
  };
};