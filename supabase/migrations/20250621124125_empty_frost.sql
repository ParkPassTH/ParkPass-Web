/*
  # Real-time Notifications System

  1. New Tables
    - `notifications` - Store user notifications
    - `notification_preferences` - User notification settings

  2. Features
    - Real-time booking updates
    - Payment confirmations
    - Availability alerts
    - Review notifications

  3. Security
    - RLS policies for user privacy
    - Proper indexing for performance
*/

-- Create notification types enum
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

-- Create notifications table
CREATE TABLE notifications (
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
CREATE TABLE notification_preferences (
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

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for notification preferences
CREATE POLICY "Users can read own notification preferences"
  ON notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role policies for creating notifications
CREATE POLICY "Service role can insert notifications"
  ON notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Function to create notification
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

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications 
  SET read_at = now()
  WHERE id = notification_id AND user_id = auth.uid() AND read_at IS NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications 
  SET read_at = now()
  WHERE user_id = auth.uid() AND read_at IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
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

-- Trigger function for booking notifications
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
CREATE TRIGGER booking_notifications_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION handle_booking_notifications();

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_notification TO service_role;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_notifications TO service_role;

-- Create default notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT user_id FROM notification_preferences);