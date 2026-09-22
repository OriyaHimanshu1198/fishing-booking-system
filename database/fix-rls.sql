-- Fix RLS authentication errors for fishing booking system
-- This app uses custom authentication, not Supabase Auth
-- So we need to allow anonymous access to all tables

-- Option 1: Disable RLS completely (simplest for this use case)
ALTER TABLE IF EXISTS bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sessions DISABLE ROW LEVEL SECURITY;

-- Option 2: If you prefer to keep RLS enabled, uncomment these policies instead:
/*
-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow anonymous access to bookings" ON bookings;
DROP POLICY IF EXISTS "Allow anonymous access to sessions" ON sessions;

-- Create policies for anonymous access
CREATE POLICY "Allow anonymous access to bookings" ON bookings
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous access to sessions" ON sessions
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
*/
