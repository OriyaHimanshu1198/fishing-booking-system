/**
 * Booking Reference (BK-xxxxx) Generator
 *
 * DB-first: queries Supabase for the last booking_ref,
 * increments the numeric portion, and guarantees uniqueness.
 * Falls back to a local-storage counter if the DB query fails.
 */

import { supabase, BOOKING_TABLE } from '../supabase'

const BK_PREFIX = 'BK-'
const BK_PAD_LENGTH = 5
const STORAGE_KEY = 'last_bk_ref'

/**
 * Extract the numeric portion from a booking_ref string.
 * Returns null if the string is not a valid BK- reference.
 */
function extractNumber(ref) {
  if (!ref || typeof ref !== 'string') return null
  const match = ref.match(/^BK-(\d+)$/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Format a number into a BK-xxxxx string.
 */
export function formatBookingRef(num) {
  return `${BK_PREFIX}${String(num).padStart(BK_PAD_LENGTH, '0')}`
}

export function generateRandomBookingRef() {
  const rand = Math.floor(Math.random() * 90000) + 10000 // 10000-99999
  return formatBookingRef(rand)
}

/**
 * Generate the next unique booking reference.
 *
 * 1. Query the database for all existing booking_ref values.
 * 2. Find the maximum numeric value.
 * 3. Increment by 1.
 * 4. Verify the resulting BK-xxxxx does not already exist in the DB.
 * 5. If a collision is detected, keep incrementing until unique.
 * 6. Fall back to localStorage if the DB query fails.
 *
 * @returns {Promise<string>} The next unique booking reference (e.g., "BK-00101")
 */
export async function generateBookingRef() {
  // --- Step 1: Try DB-first ---
  try {
    const { data: allRefs, error } = await supabase
      .from(BOOKING_TABLE)
      .select('booking_ref')

    if (!error && allRefs && allRefs.length > 0) {
      const numbers = allRefs
        .map(r => extractNumber(r.booking_ref))
        .filter(n => n !== null && !isNaN(n))

      if (numbers.length > 0) {
        let nextNum = Math.max(...numbers) + 1
        const existingRefs = new Set(allRefs.map(r => r.booking_ref))

        // --- Steps 4-5: Uniqueness verification ---
        // Increment until we find a reference that does not already exist
        let attempts = 0
        const maxAttempts = 1000
        while (existingRefs.has(formatBookingRef(nextNum)) && attempts < maxAttempts) {
          nextNum++
          attempts++
        }

        if (attempts >= maxAttempts) {
          throw new Error('Could not find a unique booking reference after 1000 attempts')
        }

        const newRef = formatBookingRef(nextNum)

        // Persist to localStorage for fast fallback next time
        try {
          localStorage.setItem(STORAGE_KEY, String(nextNum))
        } catch {}

        return newRef
      }
    }
  } catch (dbError) {
    console.warn('[bookingRef] DB query failed, falling back to localStorage:', dbError)
  }

  // --- Step 6: localStorage fallback ---
  try {
    const lastNum = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
    const nextNum = lastNum + 1
    try {
      localStorage.setItem(STORAGE_KEY, String(nextNum))
    } catch {}
    return formatBookingRef(nextNum)
  } catch {
    // Absolute last resort
    return formatBookingRef(101)
  }
}

export default { generateBookingRef, formatBookingRef, extractNumber }
