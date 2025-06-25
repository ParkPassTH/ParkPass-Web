import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: 'user' | 'owner' | 'admin';
  avatar_url?: string | null;
  business_name?: string | null;
  business_address?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParkingSpot {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  total_slots: number;
  available_slots: number;
  price: number;
  price_type: string;
  amenities: string[];
  images: string[];
  operating_hours?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  search_vector?: any;
  location?: any;
}

export interface Booking {
  id: string;
  user_id: string;
  spot_id: string;
  vehicle_id?: string | null;
  start_time: string;
  end_time: string;
  total_cost: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  payment_method?: 'qr_code' | 'bank_transfer' | null;
  payment_status: 'pending' | 'verified' | 'rejected';
  qr_code: string;
  pin: string;
  confirmed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  user_id: string;
  spot_id: string;
  rating: number;
  comment?: string | null;
  photos?: string[];
  is_anonymous: boolean;
  created_at: string;
}

export interface Vehicle {
  id: string;
  user_id: string;
  make: string;
  model: string;
  license_plate: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

class SupabaseService {
  private generateUUID(): string {
    return crypto.randomUUID();
  }

  // Profile methods
  async getCurrentUserProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data as Profile;
  }

  async updateProfile(updates: Partial<Profile>): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  }

  // Vehicle methods
  async getMyVehicles(): Promise<Vehicle[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;
    return (data || []) as Vehicle[];
  }

  async createVehicle(vehicleData: Omit<Vehicle, 'id' | 'user_id' | 'created_at' | 'is_active'>): Promise<Vehicle> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        id: this.generateUUID(),
        ...vehicleData,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data as Vehicle;
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Vehicle;
  }

  async deleteVehicle(id: string): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Parking spot methods
  async getParkingSpots(filters?: {
    location?: string;
    startDate?: string;
    endDate?: string;
    maxPrice?: number;
  }): Promise<ParkingSpot[]> {
    let query = supabase
      .from('parking_spots')
      .select('*')
      .eq('is_active', true);

    if (filters?.maxPrice) {
      query = query.lte('price', filters.maxPrice);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform database field names to match our interface
    const transformedData = (data || []).map(spot => ({
      ...spot,
      totalSlots: spot.total_slots || 1,  // Transform total_slots to totalSlots
      openingHours: spot.operating_hours  // Transform operating_hours to openingHours
    }));
    
    return transformedData as ParkingSpot[];
  }

  async getParkingSpotById(id: string): Promise<ParkingSpot | null> {
    const { data, error } = await supabase
      .from('parking_spots')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching parking spot:', error);
      return null;
    }

    // Transform database field names to match our interface
    const transformedData = {
      ...data,
      totalSlots: data.total_slots || 1,  // Transform total_slots to totalSlots
      openingHours: data.operating_hours  // Transform operating_hours to openingHours
    };

    return transformedData as ParkingSpot;
  }

  async getMyParkingSpots(): Promise<ParkingSpot[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('parking_spots')
      .select('*')
      .eq('owner_id', user.id)
      .eq('is_approved', true);
      
    if (error) throw error;
    
    // Transform database field names to match our interface
    const transformedData = (data || []).map(spot => ({
      ...spot,
      totalSlots: spot.total_slots || 1,  // Transform total_slots to totalSlots
      openingHours: spot.operating_hours  // Transform operating_hours to openingHours
    }));
    
    return transformedData as ParkingSpot[];
  }

  async createParkingSpot(spotData: Omit<ParkingSpot, 'id' | 'owner_id' | 'created_at' | 'updated_at'>): Promise<ParkingSpot> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('parking_spots')
      .insert({
        id: this.generateUUID(),
        ...spotData,
        owner_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data as ParkingSpot;
  }

  async updateParkingSpot(id: string, updates: Partial<ParkingSpot>): Promise<ParkingSpot> {
    const { data, error } = await supabase
      .from('parking_spots')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ParkingSpot;
  }

  async deleteParkingSpot(id: string): Promise<void> {
    const { error } = await supabase
      .from('parking_spots')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Booking methods
  async createBooking(bookingData: {
    spot_id: string;
    start_time: string;
    end_time: string;
    total_cost: number;
    vehicle_id?: string;
    payment_method?: 'qr_code' | 'bank_transfer';
  }): Promise<Booking> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        id: this.generateUUID(),
        ...bookingData,
        user_id: user.id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data as Booking;
  }

  async getMyBookings(): Promise<Booking[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Booking[];
  }

  async updateBookingStatus(id: string, status: Booking['status']): Promise<Booking> {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Booking;
  }

  // Review methods
  async getReviewsForSpot(spotId?: string): Promise<Review[]> {
    let query = supabase
      .from('reviews')
      .select('*');

    if (spotId) {
      query = query.eq('spot_id', spotId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Review[];
  }

  async createReview(reviewData: {
    booking_id: string;
    spot_id: string;
    rating: number;
    comment?: string;
    photos?: string[];
    is_anonymous?: boolean;
  }): Promise<Review> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        id: this.generateUUID(),
        ...reviewData,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data as Review;
  }

  // Authentication methods
  async signUp(email: string, password: string, fullName: string) {
    if (!fullName || !fullName.trim()) {
      throw new Error('Full name is required');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: fullName.trim()
        }
      }
    });

    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  // Search and filter methods
  async searchParkingSpots(query: string, filters?: {
    max_price?: number;
    amenities?: string[];
  }): Promise<ParkingSpot[]> {
    let supabaseQuery = supabase
      .from('parking_spots')
      .select('*')
      .eq('is_active', true);

    if (query) {
      supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,address.ilike.%${query}%,description.ilike.%${query}%`);
    }

    if (filters?.max_price) {
      supabaseQuery = supabaseQuery.lte('price', filters.max_price);
    }

    if (filters?.amenities && filters.amenities.length > 0) {
      supabaseQuery = supabaseQuery.contains('amenities', filters.amenities);
    }

    const { data, error } = await supabaseQuery.order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ParkingSpot[];
  }
}

export const supabaseService = new SupabaseService();