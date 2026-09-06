import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Session management helpers
export const SESSION_TABLE = 'sessions'
export const BOOKING_TABLE = 'bookings'

// Check if sessions table exists (safe check)
// Handles both PGRST205 (schema cache) and 404 (not found) errors
export const sessionsTableExists = async () => {
  try {
    const { error } = await supabase
      .from(SESSION_TABLE)
      .select('id')
      .limit(1)
    if (!error) return true
    // PGRST205 = table not in schema cache, 404 = not found
    if (error.code === 'PGRST205' || error.message?.includes('404') || error.status === 404) {
      return false
    }
    // Other errors (network, auth) — table might exist, don't block
    return true
  } catch {
    return false
  }
}

// Fetch all sessions (gracefully handles missing table)
export const fetchSessions = async () => {
  const exists = await sessionsTableExists()
  if (!exists) return { data: [], error: null }
  const { data, error } = await supabase
    .from(SESSION_TABLE)
    .select('*')
    .order('year', { ascending: true })
  return { data, error }
}

// Create a new session (gracefully handles missing table)
export const createSession = async (session) => {
  const exists = await sessionsTableExists()
  if (!exists) return { data: null, error: { message: 'Sessions table not found. Run the migration SQL first.' } }
  const { data, error } = await supabase
    .from(SESSION_TABLE)
    .insert(session)
    .select()
    .single()
  return { data, error }
}

// Update session status
export const updateSessionStatus = async (sessionId, status) => {
  const exists = await sessionsTableExists()
  if (!exists) return { error: null }
  const { error } = await supabase
    .from(SESSION_TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
  return { error }
}

// Get active session
export const getActiveSession = async () => {
  const exists = await sessionsTableExists()
  if (!exists) return { data: null, error: null }
  const { data, error } = await supabase
    .from(SESSION_TABLE)
    .select('*')
    .eq('status', 'active')
    .single()
  return { data, error }
}

// Get upcoming session
export const getUpcomingSession = async () => {
  const exists = await sessionsTableExists()
  if (!exists) return { data: null, error: null }
  const { data, error } = await supabase
    .from(SESSION_TABLE)
    .select('*')
    .eq('status', 'upcoming')
    .single()
  return { data, error }
}

// Get sessions by year
export const getSessionsByYear = async (year) => {
  const exists = await sessionsTableExists()
  if (!exists) return { data: null, error: null }
  const { data, error } = await supabase
    .from(SESSION_TABLE)
    .select('*')
    .eq('year', year)
    .single()
  return { data, error }
}

// Check if session year exists
export const sessionYearExists = async (year) => {
  const exists = await sessionsTableExists()
  if (!exists) return { data: false, error: null }
  const { data, error } = await supabase
    .from(SESSION_TABLE)
    .select('id')
    .eq('year', year)
    .single()
  return { data: !!data, error }
}

// Auto-create next year session
export const autoCreateNextYearSession = async (currentYear) => {
  const nextYear = currentYear + 1
  const { exists } = await sessionYearExists(nextYear)

  if (!exists) {
    return await createSession({
      year: nextYear,
      name: `${nextYear} Season`,
      start_date: `${nextYear}-01-01`,
      end_date: `${nextYear}-12-31`,
      status: 'upcoming'
    })
  }
  return { data: null, error: null }
}

// Migrate existing bookings to sessions (one-time migration)
export const migrateBookingsToSessions = async () => {
  // Get or create current year session
  const currentYear = new Date().getFullYear()
  let { data: currentSession } = await getSessionsByYear(currentYear)

  if (!currentSession) {
    const { data } = await createSession({
      year: currentYear,
      name: `${currentYear} Season`,
      start_date: `${currentYear}-01-01`,
      end_date: `${currentYear}-12-31`,
      status: 'active'
    })
    currentSession = data
  }

  // Update bookings without session_id
  if (currentSession) {
    const { error } = await supabase
      .from(BOOKING_TABLE)
      .update({ session_id: currentSession.id })
      .is('session_id', null)
    return { error }
  }
  return { error: null }
}