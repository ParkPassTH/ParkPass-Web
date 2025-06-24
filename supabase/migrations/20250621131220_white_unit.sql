/*
  # Enhanced Search and Filtering Capabilities

  1. New Features
    - Add full-text search capabilities
    - Add geospatial indexing for location-based searches
    - Add composite indexes for common query patterns
    - Add search ranking and relevance scoring

  2. Performance Improvements
    - Optimize common query patterns
    - Add proper indexing for search operations
*/

-- Enable PostGIS extension for geospatial operations (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add full-text search capabilities
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

-- Update existing records
UPDATE parking_spots SET updated_at = updated_at;

-- Add geospatial column for location queries
ALTER TABLE parking_spots ADD COLUMN IF NOT EXISTS location geometry(POINT, 4326);

-- Update location column with existing lat/lng data
UPDATE parking_spots 
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE location IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_parking_spots_search_vector ON parking_spots USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_parking_spots_location ON parking_spots USING gist(location);
CREATE INDEX IF NOT EXISTS idx_parking_spots_price ON parking_spots(price);
CREATE INDEX IF NOT EXISTS idx_parking_spots_available ON parking_spots(is_active, available_slots) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_parking_spots_amenities ON parking_spots USING gin(amenities);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_parking_spots_active_price ON parking_spots(is_active, price) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_parking_spots_owner_active ON parking_spots(owner_id, is_active);

-- Add indexes for bookings table
CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_spot_time ON bookings(spot_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status_time ON bookings(status, start_time) WHERE status IN ('pending', 'confirmed');

-- Add indexes for reviews table
CREATE INDEX IF NOT EXISTS idx_reviews_spot_rating ON reviews(spot_id, rating);
CREATE INDEX IF NOT EXISTS idx_reviews_user_created ON reviews(user_id, created_at);

-- Drop existing function if it exists to avoid return type conflicts
DROP FUNCTION IF EXISTS search_parking_spots_by_distance(numeric,numeric,numeric,text,numeric,text[]);

-- Create function for distance-based search
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
  price NUMERIC,
  price_type TEXT,
  available_slots INTEGER,
  total_slots INTEGER,
  amenities TEXT[],
  images TEXT[],
  distance_km NUMERIC,
  search_rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.name,
    ps.description,
    ps.address,
    ps.latitude,
    ps.longitude,
    ps.price,
    ps.price_type,
    ps.available_slots,
    ps.total_slots,
    ps.amenities,
    ps.images,
    ROUND(
      ST_Distance(
        ps.location,
        ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)
      ) / 1000, 2
    ) as distance_km,
    CASE 
      WHEN search_text IS NOT NULL THEN
        ts_rank(ps.search_vector, plainto_tsquery('english', search_text))
      ELSE 0.5
    END as search_rank
  FROM parking_spots ps
  WHERE 
    ps.is_active = true
    AND ps.available_slots > 0
    AND ST_DWithin(
      ps.location,
      ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326),
      max_distance_km * 1000
    )
    AND (search_text IS NULL OR ps.search_vector @@ plainto_tsquery('english', search_text))
    AND (max_price IS NULL OR ps.price <= max_price)
    AND (required_amenities IS NULL OR ps.amenities @> required_amenities)
  ORDER BY 
    distance_km ASC,
    search_rank DESC,
    ps.price ASC;
END;
$$ LANGUAGE plpgsql;

-- Create function for availability checking
CREATE OR REPLACE FUNCTION check_spot_availability(
  spot_id_param UUID,
  start_time_param TIMESTAMP WITH TIME ZONE,
  end_time_param TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
DECLARE
  spot_total_slots INTEGER;
  conflicting_bookings INTEGER;
  blocked_slots INTEGER;
BEGIN
  -- Get total slots for the spot
  SELECT total_slots INTO spot_total_slots
  FROM parking_spots
  WHERE id = spot_id_param AND is_active = true;
  
  IF spot_total_slots IS NULL THEN
    RETURN false;
  END IF;
  
  -- Count conflicting bookings
  SELECT COALESCE(COUNT(*), 0) INTO conflicting_bookings
  FROM bookings
  WHERE 
    spot_id = spot_id_param
    AND status IN ('confirmed', 'active')
    AND (
      (start_time <= start_time_param AND end_time > start_time_param)
      OR (start_time < end_time_param AND end_time >= end_time_param)
      OR (start_time >= start_time_param AND end_time <= end_time_param)
    );
  
  -- Count blocked slots during the requested time
  SELECT COALESCE(SUM(slots_affected), 0) INTO blocked_slots
  FROM availability_blocks
  WHERE 
    spot_id = spot_id_param
    AND status IN ('blocked', 'maintenance')
    AND (
      (start_time <= start_time_param AND end_time > start_time_param)
      OR (start_time < end_time_param AND end_time >= end_time_param)
      OR (start_time >= start_time_param AND end_time <= end_time_param)
    );
  
  -- Check if there are available slots
  RETURN (spot_total_slots - conflicting_bookings - blocked_slots) > 0;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION search_parking_spots_by_distance TO authenticated;
GRANT EXECUTE ON FUNCTION check_spot_availability TO authenticated;