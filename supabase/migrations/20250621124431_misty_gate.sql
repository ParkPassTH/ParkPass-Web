/*
  # Analytics and Reporting System

  1. New Tables
    - `analytics_events` - Track user interactions and system events
    - `revenue_reports` - Store calculated revenue metrics for owners
    - `usage_statistics` - Daily system usage statistics

  2. Functions
    - `track_analytics_event` - Log analytics events
    - `generate_revenue_report` - Calculate revenue metrics
    - `get_spot_performance` - Get performance metrics for spots
    - `update_daily_usage_stats` - Update daily statistics

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for data access
    - Grant necessary permissions
*/

-- Create event types enum
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

-- Create analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type analytics_event_type NOT NULL,
  event_data JSONB DEFAULT '{}',
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create revenue reports table (materialized view data)
CREATE TABLE IF NOT EXISTS revenue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
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

-- Create usage statistics table
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

-- Add foreign key constraints after ensuring tables exist
DO $$ 
BEGIN
  -- Add foreign key for analytics_events.user_id if profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'analytics_events_user_id_fkey' 
      AND table_name = 'analytics_events'
    ) THEN
      ALTER TABLE analytics_events 
      ADD CONSTRAINT analytics_events_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Add foreign key for revenue_reports.owner_id if profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'revenue_reports_owner_id_fkey' 
      AND table_name = 'revenue_reports'
    ) THEN
      ALTER TABLE revenue_reports 
      ADD CONSTRAINT revenue_reports_owner_id_fkey 
      FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_statistics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ 
BEGIN
  -- Analytics events policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analytics_events' 
    AND policyname = 'Users can read own analytics events'
  ) THEN
    CREATE POLICY "Users can read own analytics events"
      ON analytics_events
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analytics_events' 
    AND policyname = 'Service role can insert analytics events'
  ) THEN
    CREATE POLICY "Service role can insert analytics events"
      ON analytics_events
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;

  -- Revenue reports policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'revenue_reports' 
    AND policyname = 'Owners can read own revenue reports'
  ) THEN
    CREATE POLICY "Owners can read own revenue reports"
      ON revenue_reports
      FOR SELECT
      TO authenticated
      USING (auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'revenue_reports' 
    AND policyname = 'Service role can manage revenue reports'
  ) THEN
    CREATE POLICY "Service role can manage revenue reports"
      ON revenue_reports
      FOR ALL
      TO service_role
      USING (true);
  END IF;

  -- Usage statistics policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'usage_statistics' 
    AND policyname = 'Admins can read usage statistics'
  ) THEN
    CREATE POLICY "Admins can read usage statistics"
      ON usage_statistics
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_type ON analytics_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created ON analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_reports_owner_period ON revenue_reports(owner_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_usage_statistics_date ON usage_statistics(date DESC);

-- Function to track analytics event
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
  -- Use provided user_id or get from auth context
  current_user_id := COALESCE(user_id_param, auth.uid());
  
  INSERT INTO analytics_events (user_id, event_type, event_data, session_id)
  VALUES (current_user_id, event_type_param, event_data_param, session_id_param)
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate revenue report for owner
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
  -- Check if required tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Required table bookings does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parking_spots' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Required table parking_spots does not exist';
  END IF;

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
      -- Calculate occupancy rate (simplified)
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
  -- Check if required tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Required table bookings does not exist';
  END IF;

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

-- Create triggers for automatic event tracking (only if bookings table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings' AND table_schema = 'public') THEN
    -- Create the trigger function
    CREATE OR REPLACE FUNCTION auto_track_booking_events()
    RETURNS TRIGGER AS $trigger$
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
    $trigger$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Drop existing trigger if it exists
    DROP TRIGGER IF EXISTS auto_track_booking_events_trigger ON bookings;
    
    -- Create the trigger
    CREATE TRIGGER auto_track_booking_events_trigger
      AFTER INSERT OR UPDATE ON bookings
      FOR EACH ROW EXECUTE FUNCTION auto_track_booking_events();
  END IF;
END $$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION track_analytics_event TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION generate_revenue_report TO authenticated;
GRANT EXECUTE ON FUNCTION get_spot_performance TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_usage_stats TO service_role;