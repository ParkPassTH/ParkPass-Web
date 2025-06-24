/*
  # Complete Database Schema with Analytics

  1. Core Tables
    - profiles (user accounts and authentication)
    - vehicles (user vehicle information)
    - parking_spots (parking space listings)
    - bookings (parking reservations)
    - reviews (user reviews and ratings)
    - payment_methods (owner payment configurations)
    - payment_slips (payment verification uploads)
    - availability_blocks (spot availability management)

  2. Analytics Tables
    - analytics_events (event tracking)
    - revenue_reports (revenue analytics)
    - usage_statistics (platform usage metrics)

  3. Security
    - Row Level Security enabled on all tables
    - Appropriate policies for data access control
    - User registration handling via auth triggers

  4. Performance
    - Indexes on frequently queried columns
    - Distance-based search functionality
    - Analytics and reporting functions
*/

-- Create enum types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'owner', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM ('qr_code', 'bank_transfer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE availability_status AS ENUM ('blocked', 'maintenance', 'available');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE analytics_event_type AS ENUM (
    'spot_view',
    'spot_search',
    'booking_started',
    'booking_completed',
    'booking_cancelled',
    'payment_completed',
    'review_submitted',
    'user_registered',
    'spot_created',
    'spot_updated'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  role user_role DEFAULT 'user',
  avatar_url TEXT,
  business_name TEXT,
  business_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  color TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create parking_spots table
CREATE TABLE IF NOT EXISTS parking_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  total_slots INTEGER NOT NULL DEFAULT 1 CHECK (total_slots > 0),
  available_slots INTEGER NOT NULL DEFAULT 1 CHECK (available_slots >= 0),
  price NUMERIC NOT NULL CHECK (price > 0),
  price_type TEXT NOT NULL DEFAULT 'hour' CHECK (price_type IN ('hour', 'day', 'month')),
  amenities TEXT[] DEFAULT '{}',
  images TEXT[] NOT NULL DEFAULT '{}' CHECK (array_length(images, 1) >= 1 AND array_length(images, 1) <= 10),
  operating_hours JSONB DEFAULT '{"24_7": true}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  spot_id UUID NOT NULL REFERENCES parking_spots(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  total_cost NUMERIC NOT NULL CHECK (total_cost > 0),
  status booking_status DEFAULT 'pending',
  payment_method payment_method_type,
  payment_status payment_status DEFAULT 'pending',
  qr_code TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex') UNIQUE,
  pin TEXT NOT NULL DEFAULT lpad((floor(random() * 10000))::text, 4, '0'),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_booking_time CHECK (end_time > start_time)
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  spot_id UUID NOT NULL REFERENCES parking_spots(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  photos TEXT[] DEFAULT '{}',
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type payment_method_type NOT NULL,
  qr_code_url TEXT,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payment_slips table
CREATE TABLE IF NOT EXISTS payment_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  status payment_status DEFAULT 'pending',
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create availability_blocks table
CREATE TABLE IF NOT EXISTS availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES parking_spots(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status availability_status NOT NULL,
  reason TEXT,
  slots_affected INTEGER NOT NULL DEFAULT 1 CHECK (slots_affected > 0),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_block_time CHECK (end_time > start_time)
);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type analytics_event_type NOT NULL,
  event_data JSONB DEFAULT '{}',
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create revenue_reports table
CREATE TABLE IF NOT EXISTS revenue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  total_revenue NUMERIC DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  unique_customers INTEGER DEFAULT 0,
  average_booking_value NUMERIC DEFAULT 0,
  occupancy_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(owner_id, period_start, period_end, period_type)
);

-- Create usage_statistics table
CREATE TABLE IF NOT EXISTS usage_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_spots INTEGER DEFAULT 0,
  active_spots INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  completed_bookings INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_statistics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies with existence checks
DO $$ 
BEGIN
  -- Profiles policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can read own profile'
  ) THEN
    CREATE POLICY "Users can read own profile" ON profiles
      FOR SELECT TO authenticated
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON profiles
      FOR UPDATE TO authenticated
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Service role can insert profiles'
  ) THEN
    CREATE POLICY "Service role can insert profiles" ON profiles
      FOR INSERT TO service_role
      WITH CHECK (true);
  END IF;

  -- Vehicles policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vehicles' AND policyname = 'Users can manage own vehicles'
  ) THEN
    CREATE POLICY "Users can manage own vehicles" ON vehicles
      FOR ALL TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Parking spots policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'parking_spots' AND policyname = 'Anyone can view active parking spots'
  ) THEN
    CREATE POLICY "Anyone can view active parking spots" ON parking_spots
      FOR SELECT TO authenticated
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'parking_spots' AND policyname = 'Owners can manage own spots'
  ) THEN
    CREATE POLICY "Owners can manage own spots" ON parking_spots
      FOR ALL TO authenticated
      USING (auth.uid() = owner_id);
  END IF;

  -- Bookings policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bookings' AND policyname = 'Users can view own bookings'
  ) THEN
    CREATE POLICY "Users can view own bookings" ON bookings
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id OR auth.uid() IN (
        SELECT owner_id FROM parking_spots WHERE id = spot_id
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bookings' AND policyname = 'Users can create bookings'
  ) THEN
    CREATE POLICY "Users can create bookings" ON bookings
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bookings' AND policyname = 'Users can update own bookings'
  ) THEN
    CREATE POLICY "Users can update own bookings" ON bookings
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id OR auth.uid() IN (
        SELECT owner_id FROM parking_spots WHERE id = spot_id
      ));
  END IF;

  -- Reviews policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reviews' AND policyname = 'Anyone can read reviews'
  ) THEN
    CREATE POLICY "Anyone can read reviews" ON reviews
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reviews' AND policyname = 'Users can create reviews for own bookings'
  ) THEN
    CREATE POLICY "Users can create reviews for own bookings" ON reviews
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Payment methods policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_methods' AND policyname = 'Owners can manage own payment methods'
  ) THEN
    CREATE POLICY "Owners can manage own payment methods" ON payment_methods
      FOR ALL TO authenticated
      USING (auth.uid() = owner_id);
  END IF;

  -- Payment slips policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_slips' AND policyname = 'Users can manage payment slips for own bookings'
  ) THEN
    CREATE POLICY "Users can manage payment slips for own bookings" ON payment_slips
      FOR ALL TO authenticated
      USING (auth.uid() IN (
        SELECT user_id FROM bookings WHERE id = booking_id
      ) OR auth.uid() IN (
        SELECT ps.owner_id FROM bookings b 
        JOIN parking_spots ps ON ps.id = b.spot_id 
        WHERE b.id = booking_id
      ));
  END IF;

  -- Availability blocks policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'availability_blocks' AND policyname = 'Owners can manage availability for own spots'
  ) THEN
    CREATE POLICY "Owners can manage availability for own spots" ON availability_blocks
      FOR ALL TO authenticated
      USING (auth.uid() IN (
        SELECT owner_id FROM parking_spots WHERE id = spot_id
      ));
  END IF;

  -- Analytics events policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analytics_events' AND policyname = 'Users can read own analytics events'
  ) THEN
    CREATE POLICY "Users can read own analytics events" ON analytics_events
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analytics_events' AND policyname = 'Service role can insert analytics events'
  ) THEN
    CREATE POLICY "Service role can insert analytics events" ON analytics_events
      FOR INSERT TO service_role
      WITH CHECK (true);
  END IF;

  -- Revenue reports policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'revenue_reports' AND policyname = 'Owners can read own revenue reports'
  ) THEN
    CREATE POLICY "Owners can read own revenue reports" ON revenue_reports
      FOR SELECT TO authenticated
      USING (auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'revenue_reports' AND policyname = 'Service role can manage revenue reports'
  ) THEN
    CREATE POLICY "Service role can manage revenue reports" ON revenue_reports
      FOR ALL TO service_role
      USING (true);
  END IF;

  -- Usage statistics policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'usage_statistics' AND policyname = 'Service role can read usage statistics'
  ) THEN
    CREATE POLICY "Service role can read usage statistics" ON usage_statistics
      FOR SELECT TO service_role
      USING (true);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_parking_spots_owner_id ON parking_spots(owner_id);
CREATE INDEX IF NOT EXISTS idx_parking_spots_location ON parking_spots(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_parking_spots_active ON parking_spots(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_spot_id ON bookings(spot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_reviews_spot_id ON reviews(spot_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_owner_id ON payment_methods(owner_id);
CREATE INDEX IF NOT EXISTS idx_payment_slips_booking_id ON payment_slips(booking_id);
CREATE INDEX IF NOT EXISTS idx_availability_blocks_spot_id ON availability_blocks(spot_id);
CREATE INDEX IF NOT EXISTS idx_availability_blocks_dates ON availability_blocks(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_type ON analytics_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created ON analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_reports_owner_period ON revenue_reports(owner_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_usage_statistics_date ON usage_statistics(date DESC);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (
    id,
    email,
    name,
    phone,
    role,
    business_name,
    business_address
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'::user_role),
    COALESCE(NEW.raw_user_meta_data->>'business_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'business_address', NULL)
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to track analytics events
CREATE OR REPLACE FUNCTION track_analytics_event(
  event_type_param analytics_event_type,
  event_data_param JSONB DEFAULT '{}',
  session_id_param TEXT DEFAULT NULL,
  user_id_param UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := COALESCE(user_id_param, auth.uid());
  
  INSERT INTO analytics_events (user_id, event_type, event_data, session_id)
  VALUES (current_user_id, event_type_param, event_data_param, session_id_param)
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate revenue report
CREATE OR REPLACE FUNCTION generate_revenue_report(
  owner_id_param UUID,
  start_date DATE,
  end_date DATE,
  period_type_param TEXT DEFAULT 'monthly'
)
RETURNS TABLE (
  period_start DATE,
  period_end DATE,
  total_revenue NUMERIC,
  total_bookings BIGINT,
  unique_customers BIGINT,
  average_booking_value NUMERIC,
  occupancy_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH booking_stats AS (
    SELECT 
      b.total_cost,
      b.user_id,
      b.spot_id,
      b.start_time,
      b.end_time,
      ps.total_slots
    FROM bookings b
    JOIN parking_spots ps ON ps.id = b.spot_id
    WHERE 
      ps.owner_id = owner_id_param
      AND b.status = 'completed'
      AND b.start_time::DATE BETWEEN start_date AND end_date
  ),
  aggregated_stats AS (
    SELECT
      SUM(bs.total_cost) as total_revenue,
      COUNT(*) as total_bookings,
      COUNT(DISTINCT bs.user_id) as unique_customers,
      AVG(bs.total_cost) as average_booking_value,
      CASE 
        WHEN COUNT(*) > 0 THEN
          (COUNT(*) * 100.0) / NULLIF((
            SELECT COUNT(*) * AVG(total_slots)
            FROM parking_spots 
            WHERE owner_id = owner_id_param
          ), 0)
        ELSE 0
      END as occupancy_rate
    FROM booking_stats bs
  )
  SELECT 
    start_date,
    end_date,
    COALESCE(agg.total_revenue, 0),
    COALESCE(agg.total_bookings, 0),
    COALESCE(agg.unique_customers, 0),
    COALESCE(agg.average_booking_value, 0),
    COALESCE(agg.occupancy_rate, 0)
  FROM aggregated_stats agg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get spot performance metrics
CREATE OR REPLACE FUNCTION get_spot_performance(
  spot_id_param UUID,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_bookings BIGINT,
  total_revenue NUMERIC,
  average_rating NUMERIC,
  occupancy_rate NUMERIC,
  repeat_customers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH spot_stats AS (
    SELECT 
      COUNT(*) as bookings,
      SUM(b.total_cost) as revenue,
      COUNT(DISTINCT b.user_id) as unique_customers,
      COALESCE(ps.total_slots, 1) as total_slots
    FROM bookings b
    LEFT JOIN parking_spots ps ON ps.id = b.spot_id
    WHERE 
      b.spot_id = spot_id_param
      AND b.status = 'completed'
      AND b.created_at >= (now() - (days_back || ' days')::INTERVAL)
    GROUP BY ps.total_slots
  ),
  rating_stats AS (
    SELECT COALESCE(AVG(rating), 0) as avg_rating
    FROM reviews
    WHERE spot_id = spot_id_param
  ),
  repeat_stats AS (
    SELECT COUNT(*) as repeat_count
    FROM (
      SELECT user_id
      FROM bookings
      WHERE spot_id = spot_id_param AND status = 'completed'
      GROUP BY user_id
      HAVING COUNT(*) > 1
    ) repeat_users
  )
  SELECT 
    COALESCE(ss.bookings, 0),
    COALESCE(ss.revenue, 0),
    COALESCE(rs.avg_rating, 0),
    CASE 
      WHEN ss.bookings > 0 AND ss.total_slots > 0 THEN
        (ss.bookings * 100.0) / NULLIF((days_back * ss.total_slots), 0)
      ELSE 0
    END,
    COALESCE(rps.repeat_count, 0)
  FROM spot_stats ss
  CROSS JOIN rating_stats rs
  CROSS JOIN repeat_stats rps;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update daily usage statistics
CREATE OR REPLACE FUNCTION update_daily_usage_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO usage_statistics (
    date,
    total_users,
    active_users,
    new_users,
    total_spots,
    active_spots,
    total_bookings,
    completed_bookings,
    total_revenue
  )
  SELECT 
    target_date,
    COALESCE((SELECT COUNT(*) FROM profiles), 0),
    COALESCE((SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at::DATE = target_date), 0),
    COALESCE((SELECT COUNT(*) FROM profiles WHERE created_at::DATE = target_date), 0),
    COALESCE((SELECT COUNT(*) FROM parking_spots), 0),
    COALESCE((SELECT COUNT(*) FROM parking_spots WHERE is_active = true), 0),
    COALESCE((SELECT COUNT(*) FROM bookings WHERE created_at::DATE = target_date), 0),
    COALESCE((SELECT COUNT(*) FROM bookings WHERE created_at::DATE = target_date AND status = 'completed'), 0),
    COALESCE((SELECT SUM(total_cost) FROM bookings WHERE created_at::DATE = target_date AND status = 'completed'), 0)
  ON CONFLICT (date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users = EXCLUDED.active_users,
    new_users = EXCLUDED.new_users,
    total_spots = EXCLUDED.total_spots,
    active_spots = EXCLUDED.active_spots,
    total_bookings = EXCLUDED.total_bookings,
    completed_bookings = EXCLUDED.completed_bookings,
    total_revenue = EXCLUDED.total_revenue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for distance-based search
CREATE OR REPLACE FUNCTION search_parking_spots_by_distance(
  search_lat NUMERIC,
  search_lng NUMERIC,
  max_distance_km NUMERIC DEFAULT 10,
  search_text TEXT DEFAULT NULL,
  max_price NUMERIC DEFAULT NULL,
  required_amenities TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  total_slots INTEGER,
  available_slots INTEGER,
  price NUMERIC,
  price_type TEXT,
  amenities TEXT[],
  images TEXT[],
  operating_hours JSONB,
  is_active BOOLEAN,
  distance_km NUMERIC,
  rating NUMERIC,
  review_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH spot_distances AS (
    SELECT 
      ps.*,
      (
        6371 * acos(
          cos(radians(search_lat)) * 
          cos(radians(ps.latitude)) * 
          cos(radians(ps.longitude) - radians(search_lng)) + 
          sin(radians(search_lat)) * 
          sin(radians(ps.latitude))
        )
      ) AS distance_km
    FROM parking_spots ps
    WHERE ps.is_active = true
  ),
  spot_ratings AS (
    SELECT 
      r.spot_id,
      AVG(r.rating) as avg_rating,
      COUNT(r.id) as review_count
    FROM reviews r
    GROUP BY r.spot_id
  )
  SELECT 
    sd.id,
    sd.name,
    sd.description,
    sd.address,
    sd.latitude,
    sd.longitude,
    sd.total_slots,
    sd.available_slots,
    sd.price,
    sd.price_type,
    sd.amenities,
    sd.images,
    sd.operating_hours,
    sd.is_active,
    sd.distance_km,
    COALESCE(sr.avg_rating, 0),
    COALESCE(sr.review_count, 0)
  FROM spot_distances sd
  LEFT JOIN spot_ratings sr ON sr.spot_id = sd.id
  WHERE 
    sd.distance_km <= max_distance_km
    AND (search_text IS NULL OR (
      sd.name ILIKE '%' || search_text || '%' OR
      sd.address ILIKE '%' || search_text || '%' OR
      sd.description ILIKE '%' || search_text || '%'
    ))
    AND (max_price IS NULL OR sd.price <= max_price)
    AND (required_amenities IS NULL OR sd.amenities @> required_amenities)
  ORDER BY sd.distance_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for automatic booking event tracking
CREATE OR REPLACE FUNCTION auto_track_booking_events()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM track_analytics_event(
      'booking_started',
      jsonb_build_object(
        'booking_id', NEW.id,
        'spot_id', NEW.spot_id,
        'total_cost', NEW.total_cost
      ),
      NULL,
      NEW.user_id
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'completed' THEN
      PERFORM track_analytics_event(
        'booking_completed',
        jsonb_build_object(
          'booking_id', NEW.id,
          'spot_id', NEW.spot_id,
          'total_cost', NEW.total_cost
        ),
        NULL,
        NEW.user_id
      );
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM track_analytics_event(
        'booking_cancelled',
        jsonb_build_object(
          'booking_id', NEW.id,
          'spot_id', NEW.spot_id,
          'reason', 'user_cancelled'
        ),
        NULL,
        NEW.user_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic booking event tracking
DROP TRIGGER IF EXISTS auto_track_booking_events_trigger ON bookings;
CREATE TRIGGER auto_track_booking_events_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION auto_track_booking_events();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user TO service_role;
GRANT EXECUTE ON FUNCTION track_analytics_event TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION generate_revenue_report TO authenticated;
GRANT EXECUTE ON FUNCTION get_spot_performance TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_usage_stats TO service_role;
GRANT EXECUTE ON FUNCTION search_parking_spots_by_distance TO authenticated, anon;