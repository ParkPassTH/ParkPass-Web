/*
  # Delete all user records

  1. Security
    - This will delete ALL user accounts from the authentication system
    - This action is irreversible
    - All related profile data will also be deleted due to CASCADE constraints

  2. Changes
    - Delete all records from auth.users table
    - This will trigger CASCADE deletes for profiles and related data
*/

-- Delete all users from auth.users table
-- This will cascade to profiles table and all related data
DELETE FROM auth.users;

-- Reset any sequences or counters if needed
-- (Supabase handles this automatically for UUIDs)

-- Optional: Reset analytics and statistics tables
DELETE FROM analytics_events;
DELETE FROM usage_statistics;
DELETE FROM revenue_reports;