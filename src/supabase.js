import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

// Session management constants
export const SESSION_TABLE = 'sessions'
export const BOOKING_TABLE = 'bookings'
export const SETTINGS_TABLE = 'settings'

// In-memory & LocalStorage Mock Provider for local development or when Supabase is not configured
const STORAGE_PREFIX = 'fishing_app_'

const getDefaultTableData = (table) => {
  if (table === SESSION_TABLE) {
    return [
      {
        id: 'session-2026',
        year: 2026,
        name: '2026 Season',
        start_date: '2026-03-01',
        end_date: '2026-10-31',
        status: 'active',
        created_at: new Date('2026-01-01').toISOString(),
        updated_at: new Date('2026-01-01').toISOString()
      },
      {
        id: 'session-2027',
        year: 2027,
        name: '2027 Season',
        start_date: '2027-03-01',
        end_date: '2027-10-31',
        status: 'upcoming',
        created_at: new Date('2026-01-01').toISOString(),
        updated_at: new Date('2026-01-01').toISOString()
      }
    ]
  }

  if (table === BOOKING_TABLE) {
    return [
      {
        id: 'b-101',
        session_id: 'session-2026',
        name: 'Alexander Stewart',
        email: 'alex.stewart@highlandangling.co.uk',
        phone: '+44 7911 123456',
        week: 1,
        days_count: 6,
        booking_type: 'consecutive',
        beat_allocations: {
          0: 'Beat 1',
          1: 'Beat 2',
          2: 'Beat 3',
          3: 'Beat 4',
          4: 'Beat 5',
          5: 'Loch'
        },
        created_at: new Date('2026-03-01T08:00:00Z').toISOString()
      },
      {
        id: 'b-102',
        session_id: 'session-2026',
        name: 'Claire Fraser',
        email: 'claire.fraser@scotoutdoors.org',
        phone: '+44 7911 654321',
        week: 1,
        days_count: 3,
        booking_type: 'flexible',
        beat_allocations: {
          0: 'Beat 2',
          2: 'Beat 4',
          4: 'Loch'
        },
        created_at: new Date('2026-03-02T09:30:00Z').toISOString()
      },
      {
        id: 'b-103',
        session_id: 'session-2026',
        name: 'David MacLeod',
        email: 'david.macleod@flyfishclub.com',
        phone: '+44 7911 987654',
        week: 2,
        days_count: 4,
        booking_type: 'consecutive',
        beat_allocations: {
          0: 'Beat 1',
          1: 'Beat 2',
          2: 'Beat 3',
          3: 'Beat 4'
        },
        created_at: new Date('2026-03-05T14:15:00Z').toISOString()
      }
    ]
  }

  if (table === SETTINGS_TABLE) {
    return [
      {
        id: 1,
        session_start: '2026-03-01',
        session_end: '2026-10-31',
        updated_at: new Date('2026-01-01').toISOString()
      }
    ]
  }

  return []
}

const memoryStore = new Map()

const getTableRecords = (tableName) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(STORAGE_PREFIX + tableName)
      if (stored) {
        return JSON.parse(stored)
      }
      const initial = getDefaultTableData(tableName)
      window.localStorage.setItem(STORAGE_PREFIX + tableName, JSON.stringify(initial))
      return initial
    } catch {
      // Fallback to memoryStore
    }
  }

  if (!memoryStore.has(tableName)) {
    memoryStore.set(tableName, getDefaultTableData(tableName))
  }
  return memoryStore.get(tableName)
}

const saveTableRecords = (tableName, records) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + tableName, JSON.stringify(records))
    } catch {
      // Fallback
    }
  }
  memoryStore.set(tableName, records)
}

class MockQueryBuilder {
  constructor(tableName) {
    this.tableName = tableName
    this.filters = []
    this.orderConfig = null
    this.limitCount = null
    this.isSingle = false
    this.action = 'select'
    this.actionData = null
  }

  select() {
    return this
  }

  order(column, { ascending = true } = {}) {
    this.orderConfig = { column, ascending }
    return this
  }

  eq(column, value) {
    this.filters.push((item) => String(item[column]) === String(value))
    return this
  }

  is(column, value) {
    this.filters.push((item) => (value === null ? item[column] == null : item[column] === value))
    return this
  }

  limit(count) {
    this.limitCount = count
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  insert(data) {
    this.action = 'insert'
    this.actionData = data
    return this
  }

  update(data) {
    this.action = 'update'
    this.actionData = data
    return this
  }

  delete() {
    this.action = 'delete'
    return this
  }

  upsert(data) {
    this.action = 'upsert'
    this.actionData = data
    return this
  }

  then(resolve, reject) {
    try {
      const res = this._execute()
      resolve(res)
    } catch (err) {
      if (reject) reject(err)
      else resolve({ data: null, error: err })
    }
  }

  _execute() {
    const records = [...getTableRecords(this.tableName)]

    if (this.action === 'select') {
      let filtered = records.filter((item) => this.filters.every((fn) => fn(item)))
      if (this.orderConfig) {
        const { column, ascending } = this.orderConfig
        filtered.sort((a, b) => {
          if (a[column] < b[column]) return ascending ? -1 : 1
          if (a[column] > b[column]) return ascending ? 1 : -1
          return 0
        })
      }
      if (this.limitCount !== null) {
        filtered = filtered.slice(0, this.limitCount)
      }
      if (this.isSingle) {
        return { data: filtered[0] || null, error: null }
      }
      return { data: filtered, error: null }
    }

    if (this.action === 'insert') {
      const toInsert = Array.isArray(this.actionData) ? this.actionData : [this.actionData]
      const inserted = toInsert.map((item) => ({
        id: item.id || `id-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
        ...item
      }))
      records.push(...inserted)
      saveTableRecords(this.tableName, records)
      if (this.isSingle) {
        return { data: inserted[0], error: null }
      }
      return { data: Array.isArray(this.actionData) ? inserted : inserted[0], error: null }
    }

    if (this.action === 'update') {
      let updatedCount = 0
      for (let i = 0; i < records.length; i++) {
        if (this.filters.every((fn) => fn(records[i]))) {
          records[i] = {
            ...records[i],
            ...this.actionData,
            updated_at: new Date().toISOString()
          }
          updatedCount++
        }
      }
      saveTableRecords(this.tableName, records)
      return { data: records, count: updatedCount, error: null }
    }

    if (this.action === 'delete') {
      const remaining = records.filter((item) => !this.filters.every((fn) => fn(item)))
      saveTableRecords(this.tableName, remaining)
      return { data: null, error: null }
    }

    if (this.action === 'upsert') {
      const item = this.actionData
      const idx = records.findIndex((r) => String(r.id) === String(item.id))
      if (idx >= 0) {
        records[idx] = { ...records[idx], ...item, updated_at: new Date().toISOString() }
      } else {
        records.push({
          id: item.id || `id-${Date.now()}`,
          created_at: new Date().toISOString(),
          ...item
        })
      }
      saveTableRecords(this.tableName, records)
      return { data: item, error: null }
    }

    return { data: null, error: null }
  }
}

const createMockSupabaseClient = () => ({
  from: (tableName) => new MockQueryBuilder(tableName)
})

const isConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  typeof supabaseUrl === 'string' &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('example.com') &&
  !supabaseUrl.includes('placeholder')
)

let activeClient = null
if (isConfigured) {
  try {
    activeClient = createClient(supabaseUrl, supabaseKey)
  } catch (err) {
    console.warn('[AI Studio] Supabase init failed, falling back to local store:', err)
  }
}

export const supabase = activeClient || createMockSupabaseClient()

// Check if sessions table exists (safe check)
export const sessionsTableExists = async () => {
  if (!isConfigured) return true
  try {
    const { error } = await supabase
      .from(SESSION_TABLE)
      .select('id')
      .limit(1)
    if (!error) return true
    if (error.code === 'PGRST205' || error.message?.includes('404') || error.status === 404) {
      return false
    }
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

  if (currentSession) {
    const { error } = await supabase
      .from(BOOKING_TABLE)
      .update({ session_id: currentSession.id })
      .is('session_id', null)
    return { error }
  }
  return { error: null }
}
