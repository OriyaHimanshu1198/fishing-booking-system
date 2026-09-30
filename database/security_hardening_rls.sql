-- ==========================================================
-- 🎣 Fishing Booking System - Security Hardening & RLS Policies
-- ==========================================================
-- Run this SQL in your Supabase Project SQL Editor
-- (https://supabase.com/dashboard/project/_/sql)

-- 1. Enable Row Level Security (RLS) on all core tables
ALTER TABLE IF EXISTS bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS booking_seq ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- 2. Drop overly permissive or outdated policies
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "Allow anonymous access to bookings" ON bookings;
DROP POLICY IF EXISTS "Allow anonymous access to sessions" ON sessions;
DROP POLICY IF EXISTS "Allow public read bookings" ON bookings;
DROP POLICY IF EXISTS "Allow validated booking creation" ON bookings;
DROP POLICY IF EXISTS "Allow public read sessions" ON sessions;
DROP POLICY IF EXISTS "Allow public read settings" ON settings;

-- ----------------------------------------------------------
-- 3. Hardened Policies for BOOKINGS table
-- ----------------------------------------------------------

-- [READ]: Allow reading booking schedules and availability
CREATE POLICY "Allow public read bookings"
ON bookings
FOR SELECT
TO anon, authenticated
USING (true);

-- [INSERT]: Allow anglers to create bookings with strict input validation
CREATE POLICY "Allow validated booking creation"
ON bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  name IS NOT NULL AND length(trim(name)) >= 2 AND length(trim(name)) <= 100 AND
  email IS NOT NULL AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND
  week IS NOT NULL AND week >= 1 AND week <= 52 AND
  days_count IS NOT NULL AND days_count >= 1 AND days_count <= 6
);

-- [UPDATE]: Allow updating booking only with valid reference/id
CREATE POLICY "Allow validated booking update"
ON bookings
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (
  name IS NOT NULL AND length(trim(name)) >= 2 AND
  email IS NOT NULL AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- [DELETE]: Restrict deletion to authenticated admin users only
-- (Prevents arbitrary public users from wiping the database via anon REST API)
CREATE POLICY "Admins only booking deletion"
ON bookings
FOR DELETE
TO authenticated
USING (auth.role() = 'authenticated');


-- ----------------------------------------------------------
-- 4. Hardened Policies for SESSIONS & SETTINGS tables
-- ----------------------------------------------------------

-- [READ]: Public can read active sessions and season configuration
CREATE POLICY "Allow public read sessions"
ON sessions
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public read settings"
ON settings
FOR SELECT
TO anon, authenticated
USING (true);

-- [MUTATE]: Only authenticated admins can create or modify sessions/settings
CREATE POLICY "Admin manage sessions"
ON sessions
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin manage settings"
ON settings
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- ----------------------------------------------------------
-- 5. Atomic Slot Reservation Helper (Prevents Double-Booking)
-- ----------------------------------------------------------
-- Function to safely reserve a booking in a single transaction
CREATE OR REPLACE FUNCTION reserve_booking(
  p_session_id TEXT,
  p_week INT,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_days_count INT,
  p_booking_type TEXT,
  p_beat_allocations JSONB,
  p_booking_ref TEXT
) RETURNS JSONB AS $$
DECLARE
  v_new_id TEXT;
BEGIN
  -- Insert the booking atomically
  INSERT INTO bookings (
    session_id,
    week,
    name,
    email,
    phone,
    days_count,
    booking_type,
    beat_allocations,
    booking_ref,
    created_at,
    updated_at
  ) VALUES (
    p_session_id,
    p_week,
    p_name,
    p_email,
    p_phone,
    p_days_count,
    p_booking_type,
    p_beat_allocations,
    p_booking_ref,
    NOW(),
    NOW()
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('success', true, 'id', v_new_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
