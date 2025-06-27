import { ParkingSpot as SupabaseParkingSpot } from '../services/supabaseService';
import { ParkingSpot as UIType } from '../types';

// Convert Supabase ParkingSpot to UI ParkingSpot
export const convertSupabaseToUI = (supabaseSpot: SupabaseParkingSpot): UIType => {
  // Convert new pricing structure or fallback to legacy price/price_type
  let pricing: UIType['pricing'];
  if (supabaseSpot.pricing) {
    pricing = {
      hour: {
        enabled: supabaseSpot.pricing.hour.enabled,
        price: supabaseSpot.pricing.hour.price
      },
      day: {
        enabled: supabaseSpot.pricing.day.enabled,
        price: supabaseSpot.pricing.day.price
      },
      month: {
        enabled: supabaseSpot.pricing.month.enabled,
        price: supabaseSpot.pricing.month.price
      }
    };
  } else {
    // Fallback to legacy price/price_type
    pricing = {
      hour: {
        enabled: supabaseSpot.price_type === 'hour',
        price: supabaseSpot.price_type === 'hour' ? supabaseSpot.price : 0
      },
      day: {
        enabled: supabaseSpot.price_type === 'day',
        price: supabaseSpot.price_type === 'day' ? supabaseSpot.price : 0
      },
      month: {
        enabled: supabaseSpot.price_type === 'month',
        price: supabaseSpot.price_type === 'month' ? supabaseSpot.price : 0
      }
    };
  }

  return {
    id: supabaseSpot.id,
    name: supabaseSpot.name,
    address: supabaseSpot.address,
    price: supabaseSpot.price,
    priceType: supabaseSpot.price_type as 'hour' | 'day' | 'month',
    pricing: pricing,
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