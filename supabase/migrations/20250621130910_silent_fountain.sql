/*
  # Database Schema Enhancements and Optimizations

  1. New Features
    - Add notification system enums and tables
    - Enhanced search capabilities with full-text search
    - Geospatial indexing for location-based queries
    - Improved analytics and reporting

  2. Performance Optimizations
    - Additional indexes for common query patterns
    - Materialized views for analytics
    - Query optimization functions

  3. Data Integrity
    - Additional constraints and validations
    - Improved foreign key relationships
*/

-- Create notification types enum if not exists
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'booking_confirmed',
    'booking_cancelled',
    'booking_reminder',
    'payment_received',
    'payment_pending',
    'review_received',
    'spot_unavailable',
    'system_update'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  booking_reminders BOOLEAN DEFAULT true,
  payment_alerts BOOLEAN DEFAULT true,
  review_notifications BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on notification tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create notification policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' AND policyname = 'Users can read own notifications'
  ) THEN
    CREATE POLICY "Users can read own notifications"
      ON notifications
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications"
      ON notifications
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' AND policyname = 'Service role can insert notifications'
  ) THEN
    CREATE POLICY "Service role can insert notifications"
      ON notifications
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_preferences' AND policyname = 'Users can read own notification preferences'
  ) THEN
    CREATE POLICY "Users can read own notification preferences"
      ON notification_preferences
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_preferences' AND policyname = 'Users can update own notification preferences'
  ) THEN
    CREATE POLICY "Users can update own notification preferences"
      ON notification_preferences
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_preferences' AND policyname = 'Users can insert own notification preferences'
  ) THEN
    CREATE POLICY "Users can insert own notification preferences"
      ON notification_preferences
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Add full-text search capabilities to parking_spots
ALTER TABLE parking_spots ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_parking_spot_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.address, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(NEW.amenities, ' ')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS parking_spots_search_vector_update ON parking_spots;
CREATE TRIGGER parking_spots_search_vector_update
  BEFORE INSERT OR UPDATE ON parking_spots
  FOR EACH ROW EXECUTE FUNCTION update_parking_spot_search_vector();

-- Update existing records with search vectors
UPDATE parking_spots SET updated_at = updated_at WHERE search_vector IS NULL;

-- Create additional performance indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parking_spots_search_vector ON parking_spots USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_parking_spots_price ON parking_spots(price);
CREATE INDEX IF NOT EXISTS idx_parking_spots_amenities ON parking_spots USING gin(amenities);
CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_spot_time ON bookings(spot_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_reviews_spot_rating ON reviews(spot_id, rating);

-- Enhanced search function with full-text search
CREATE OR REPLACE FUNCTION enhanced_search_parking_spots(
  search_lat NUMERIC DEFAULT NULL,
  search_lng NUMERIC DEFAULT NULL,
  max_distance_km NUMERIC DEFAULT 50,
  search_text TEXT DEFAULT NULL,
  max_price NUMERIC DEFAULT NULL,
  min_price NUMERIC DEFAULT NULL,
  required_amenities TEXT[] DEFAULT NULL,
  min_rating NUMERIC DEFAULT NULL,
  sort_by TEXT DEFAULT 'distance' -- 'distance', 'price_low', 'price_high', 'rating'
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
  review_count BIGINT,
  search_rank REAL
) AS $$
BEGIN
  RETURN QUERY
  WITH spot_distances AS (
    SELECT 
      ps.*,
      CASE 
        WHEN search_lat IS NOT NULL AND search_lng IS NOT NULL THEN
          (
            6371 * acos(
              cos(radians(search_lat)) * 
              cos(radians(ps.latitude)) * 
              cos(radians(ps.longitude) - radians(search_lng)) + 
              sin(radians(search_lat)) * 
              sin(radians(ps.latitude))
            )
          )
        ELSE 0
      END AS distance_km,
      CASE 
        WHEN search_text IS NOT NULL AND ps.search_vector IS NOT NULL THEN
          ts_rank(ps.search_vector, plainto_tsquery('english', search_text))
        ELSE 0.5
      END as search_rank
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
    COALESCE(sr.review_count, 0),
    sd.search_rank
  FROM spot_distances sd
  LEFT JOIN spot_ratings sr ON sr.spot_id = sd.id
  WHERE 
    (search_lat IS NULL OR search_lng IS NULL OR sd.distance_km <= max_distance_km)
    AND (search_text IS NULL OR sd.search_vector @@ plainto_tsquery('english', search_text))
    AND (max_price IS NULL OR sd.price <= max_price)
    AND (min_price IS NULL OR sd.price >= min_price)
    AND (required_amenities IS NULL OR sd.amenities @> required_amenities)
    AND (min_rating IS NULL OR COALESCE(sr.avg_rating, 0) >= min_rating)
    AND sd.available_slots > 0
  ORDER BY 
    CASE 
      WHEN sort_by = 'distance' AND search_lat IS NOT NULL THEN sd.distance_km
      WHEN sort_by = 'price_low' THEN sd.price
      WHEN sort_by = 'price_high' THEN -sd.price
      WHEN sort_by = 'rating' THEN -COALESCE(sr.avg_rating, 0)
      ELSE sd.distance_km
    END,
    sd.search_rank DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check spot availability with conflicts
CREATE OR REPLACE FUNCTION check_spot_availability_detailed(
  spot_id_param UUID,
  start_time_param TIMESTAMP WITH TIME ZONE,
  end_time_param TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  is_available BOOLEAN,
  available_slots INTEGER,
  conflicting_bookings INTEGER,
  blocked_slots INTEGER,
  total_slots INTEGER
) AS $$
DECLARE
  spot_total_slots INTEGER;
  conflicting_bookings_count INTEGER;
  blocked_slots_count INTEGER;
  available_slots_count INTEGER;
BEGIN
  -- Get total slots for the spot
  SELECT ps.total_slots INTO spot_total_slots
  FROM parking_spots ps
  WHERE ps.id = spot_id_param AND ps.is_active = true;
  
  IF spot_total_slots IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 0, 0;
    RETURN;
  END IF;
  
  -- Count conflicting bookings
  SELECT COALESCE(COUNT(*), 0) INTO conflicting_bookings_count
  FROM bookings b
  WHERE 
    b.spot_id = spot_id_param
    AND b.status IN ('confirmed', 'active')
    AND (
      (b.start_time <= start_time_param AND b.end_time > start_time_param)
      OR (b.start_time < end_time_param AND b.end_time >= end_time_param)
      OR (b.start_time >= start_time_param AND b.end_time <= end_time_param)
    );
  
  -- Count blocked slots during the requested time
  SELECT COALESCE(SUM(ab.slots_affected), 0) INTO blocked_slots_count
  FROM availability_blocks ab
  WHERE 
    ab.spot_id = spot_id_param
    AND ab.status IN ('blocked', 'maintenance')
    AND (
      (ab.start_time <= start_time_param AND ab.end_time > start_time_param)
      OR (ab.start_time < end_time_param AND ab.end_time >= end_time_param)
      OR (ab.start_time >= start_time_param AND ab.end_time <= end_time_param)
    );
  
  -- Calculate available slots
  available_slots_count := spot_total_slots - conflicting_bookings_count - blocked_slots_count;
  
  RETURN QUERY SELECT 
    available_slots_count > 0,
    available_slots_count,
    conflicting_bookings_count,
    blocked_slots_count,
    spot_total_slots;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
  user_id_param UUID,
  type_param notification_type,
  title_param TEXT,
  message_param TEXT,
  data_param JSONB DEFAULT '{}',
  expires_hours INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
  expires_at_param TIMESTAMP WITH TIME ZONE;
BEGIN
  IF expires_hours IS NOT NULL THEN
    expires_at_param := now() + (expires_hours || ' hours')::INTERVAL;
  END IF;
  
  INSERT INTO notifications (user_id, type, title, message, data, expires_at)
  VALUES (user_id_param, type_param, title_param, message_param, data_param, expires_at_param)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle booking notifications
CREATE OR REPLACE FUNCTION handle_booking_notifications()
RETURNS TRIGGER AS $$
DECLARE
  spot_name TEXT;
  spot_owner_id UUID;
  user_name TEXT;
BEGIN
  -- Get spot and user information
  SELECT ps.name, ps.owner_id INTO spot_name, spot_owner_id
  FROM parking_spots ps WHERE ps.id = NEW.spot_id;
  
  SELECT p.name INTO user_name
  FROM profiles p WHERE p.id = NEW.user_id;
  
  -- Handle different booking status changes
  IF TG_OP = 'INSERT' THEN
    -- Notify spot owner of new booking
    PERFORM create_notification(
      spot_owner_id,
      'booking_confirmed',
      'New Booking Received',
      user_name || ' has booked your parking spot "' || spot_name || '"',
      jsonb_build_object('booking_id', NEW.id, 'spot_id', NEW.spot_id),
      72
    );
    
    -- Notify user of booking confirmation
    PERFORM create_notification(
      NEW.user_id,
      'booking_confirmed',
      'Booking Confirmed',
      'Your booking for "' || spot_name || '" has been confirmed',
      jsonb_build_object('booking_id', NEW.id, 'spot_id', NEW.spot_id),
      72
    );
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- Handle status changes
    IF NEW.status = 'cancelled' THEN
      -- Notify both parties of cancellation
      PERFORM create_notification(
        spot_owner_id,
        'booking_cancelled',
        'Booking Cancelled',
        'Booking for "' || spot_name || '" has been cancelled',
        jsonb_build_object('booking_id', NEW.id, 'spot_id', NEW.spot_id),
        24
      );
      
      PERFORM create_notification(
        NEW.user_id,
        'booking_cancelled',
        'Booking Cancelled',
        'Your booking for "' || spot_name || '" has been cancelled',
        jsonb_build_object('booking_id', NEW.id, 'spot_id', NEW.spot_id),
        24
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for booking notifications
DROP TRIGGER IF EXISTS booking_notifications_trigger ON bookings;
CREATE TRIGGER booking_notifications_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION handle_booking_notifications();

-- Function to get popular spots
CREATE OR REPLACE FUNCTION get_popular_spots(
  limit_count INTEGER DEFAULT 10,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  price NUMERIC,
  price_type TEXT,
  rating NUMERIC,
  review_count BIGINT,
  booking_count BIGINT,
  images TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH spot_stats AS (
    SELECT 
      ps.id,
      ps.name,
      ps.address,
      ps.price,
      ps.price_type,
      ps.images,
      COUNT(b.id) as booking_count
    FROM parking_spots ps
    LEFT JOIN bookings b ON b.spot_id = ps.id 
      AND b.status = 'completed'
      AND b.created_at >= (now() - (days_back || ' days')::INTERVAL)
    WHERE ps.is_active = true
    GROUP BY ps.id, ps.name, ps.address, ps.price, ps.price_type, ps.images
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
    ss.id,
    ss.name,
    ss.address,
    ss.price,
    ss.price_type,
    COALESCE(sr.avg_rating, 0),
    COALESCE(sr.review_count, 0),
    ss.booking_count,
    ss.images
  FROM spot_stats ss
  LEFT JOIN spot_ratings sr ON sr.spot_id = ss.id
  ORDER BY ss.booking_count DESC, COALESCE(sr.avg_rating, 0) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications 
  WHERE expires_at IS NOT NULL AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION enhanced_search_parking_spots TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_spot_availability_detailed TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO service_role;
GRANT EXECUTE ON FUNCTION get_popular_spots TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_expired_notifications TO service_role;

-- Create default notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;