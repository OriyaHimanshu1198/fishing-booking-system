-- Create sessions table for multi-year booking management
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  year INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sessions_year ON sessions(year);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- Add session_id column to bookings table if it doesn't exist
-- Note: Only runs if the column doesn't already exist (safe to re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN session_id UUID REFERENCES sessions(id);
    CREATE INDEX IF NOT EXISTS idx_bookings_session_id ON bookings(session_id);
  END IF;
END $$;

-- Note: This app uses a custom login, not Supabase auth.
-- If RLS is enabled on the bookings table, ensure policies allow
-- anon key access, or disable RLS.

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for sessions table
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default current year session if none exists
INSERT INTO sessions (year, name, start_date, end_date, status)
SELECT
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  CONCAT(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, ' Season'),
  CONCAT(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, '-01-01')::DATE,
  CONCAT(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, '-12-31')::DATE,
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM sessions WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
);

-- Migrate existing bookings to current session (if they don't have a session_id)
UPDATE bookings
SET session_id = (
  SELECT id FROM sessions
  WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
  LIMIT 1
)
WHERE session_id IS NULL;

-- Create view for easy session booking counts
CREATE OR REPLACE VIEW session_booking_counts AS
SELECT
  s.id,
  s.year,
  s.name,
  s.start_date,
  s.end_date,
  s.status,
  COUNT(b.id) as booking_count,
  COALESCE(SUM(b.days_count), 0) as total_days_booked
FROM sessions s
LEFT JOIN bookings b ON s.id = b.session_id
GROUP BY s.id, s.year, s.name, s.start_date, s.end_date, s.status;

-- Create function to auto-complete old sessions
CREATE OR REPLACE FUNCTION auto_complete_old_sessions()
RETURNS void AS $$
BEGIN
  UPDATE sessions
  SET status = 'completed'
  WHERE status = 'active'
    AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-activate upcoming sessions
CREATE OR REPLACE FUNCTION auto_activate_upcoming_sessions()
RETURNS void AS $$
BEGIN
  UPDATE sessions
  SET status = 'active'
  WHERE status = 'upcoming'
    AND start_date <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Note: RLS is NOT enabled for sessions table since the app uses
-- a custom hardcoded login, not Supabase auth.
-- The anon key is used directly for all operations.
-- If you later add Supabase auth, enable RLS and add policies as needed.
