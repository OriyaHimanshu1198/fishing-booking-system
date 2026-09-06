// Helper functions for date and week calculations

export const getWeeksInSession = (startDate, endDate) => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const weeks = []
  let weekNumber = 1
  let currentStart = new Date(start)

  while (currentStart <= end) {
    const currentEnd = new Date(currentStart)
    currentEnd.setDate(currentEnd.getDate() + 5) // 6-day week (Monday-Saturday, 0-5 days added)

    // Don't exceed session end date
    const weekEnd = currentEnd > end ? end : currentEnd

    weeks.push({
      weekNumber,
      startDate: new Date(currentStart),
      endDate: new Date(weekEnd),
      days: getDaysInWeek(currentStart, weekEnd)
    })

    weekNumber++
    currentStart.setDate(currentStart.getDate() + 6) // Move to next Monday
  }

  return weeks
}

export const getDaysInWeek = (startDate, endDate) => {
  const days = []
  const current = new Date(startDate)

  while (current <= endDate) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return days
}

export const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const formatDateFull = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export const BEATS = ['Beat 1', 'Beat 2', 'Beat 3', 'Beat 4', 'Beat 5', 'Loch']

export const getAvailableBeatsForWeek = (weekNumber, bookings) => {
  const weekBookings = bookings.filter(b => b.week === weekNumber)
  const usedBeats = weekBookings.map(b => b.beat)
  return BEATS.filter(beat => !usedBeats.includes(beat))
}

// Get available beats for a specific day
export const getAvailableBeatsForDay = (weekNumber, dayIndex, bookings, excludeBookingId = null) => {
  return BEATS.filter(beat => isSlotAvailable(weekNumber, dayIndex, beat, bookings, excludeBookingId))
}

export const isSlotAvailable = (weekNumber, dayIndex, beat, bookings, excludeBookingId = null) => {
  const booking = bookings.find(
    b => b.week === weekNumber &&
         b.beat_allocations &&
         b.beat_allocations[dayIndex] === beat &&
         b.id !== excludeBookingId // Exclude the booking being edited
  )
  return !booking
}

// Auto-assign beats for consecutive days with perfect cyclic rotation
// Ensures:
// 1. Each booking uses every beat exactly once (unique beats per day within booking)
// 2. Each beat is used exactly once per day across all bookings
// 3. Perfect cyclic shift pattern across bookings
//
// Pattern example (6 bookings × 6 days):
//   Booking 1: Beat 1, Beat 2, Beat 3, Beat 4, Beat 5, Loch
//   Booking 2: Beat 2, Beat 3, Beat 4, Beat 5, Loch, Beat 1
//   Booking 3: Beat 3, Beat 4, Beat 5, Loch, Beat 1, Beat 2
//   Booking 4: Beat 4, Beat 5, Loch, Beat 1, Beat 2, Beat 3
//   Booking 5: Beat 5, Loch, Beat 1, Beat 2, Beat 3, Beat 4
//   Booking 6: Loch, Beat 1, Beat 2, Beat 3, Beat 4, Beat 5
export const autoAssignBeats = (weekNumber, selectedDays, bookings, excludeBookingId = null) => {
  const beatAllocations = {}

  // Get all existing bookings for this week (excluding the one being edited)
  const weekBookings = bookings.filter(b => b.week === weekNumber && b.id !== excludeBookingId)

  // The booking number (1-indexed) determines the rotation offset
  const bookingNumber = weekBookings.length + 1

  // If more than 6 bookings, wrap around (though ideally max 6 bookings per week)
  const rotationOffset = (bookingNumber - 1) % BEATS.length

  for (const dayIndex of selectedDays) {
    // Validate dayIndex is within bounds
    if (dayIndex < 0 || dayIndex >= BEATS.length) {
      return null
    }

    // Cyclic shift: beatIndex = (dayIndex + rotationOffset) % 6
    // This ensures:
    //   - Same beat never appears twice in one booking (different dayIndex)
    //   - Same beat never appears twice on same day across bookings (different rotationOffset)
    const beatIndex = (dayIndex + rotationOffset) % BEATS.length
    const assignedBeat = BEATS[beatIndex]

    // Safety check: verify this beat isn't already used on this day by another booking
    if (!isSlotAvailable(weekNumber, dayIndex, assignedBeat, bookings, excludeBookingId)) {
      return null // Conflict detected — cannot assign
    }

    beatAllocations[dayIndex] = assignedBeat
  }

  return beatAllocations
}

// Get distribution statistics for display/debugging
export const getBeatDistribution = (weekNumber, bookings) => {
  const weekBookings = bookings.filter(b => b.week === weekNumber)

  // Initialize tracking
  const beatUsage = {}
  BEATS.forEach(beat => {
    beatUsage[beat] = {
      totalUsage: 0,
      dailyUsage: Array(6).fill(0), // Mon-Sat (0-5)
      bookings: []
    }
  })

  // Count usage from existing bookings
  weekBookings.forEach((booking, index) => {
    if (booking.beat_allocations) {
      Object.entries(booking.beat_allocations).forEach(([dayIndexStr, beat]) => {
        const dayIndex = parseInt(dayIndexStr)
        if (!isNaN(dayIndex) && dayIndex >= 0 && dayIndex < 6) {
          beatUsage[beat].totalUsage++
          beatUsage[beat].dailyUsage[dayIndex]++
          beatUsage[beat].bookings.push({
            bookingIndex: index + 1,
            day: dayIndex,
            beat
          })
        }
      })
    }
  })

  return beatUsage
}

export const getTotalSlots = (weeks) => {
  return weeks.reduce((total, week) => total + (week.days.length * 6), 0) // 6 beats per day
}

export const getBookedSlots = (bookings) => {
  return bookings.reduce((total, booking) => {
    if (booking.beat_allocations) {
      return total + Object.keys(booking.beat_allocations).length
    }
    return total + (booking.specificDays?.length || 0)
  }, 0)
}

// Get beat allocation for a specific booking and day
export const getBeatForDay = (booking, dayIndex) => {
  if (booking.beat_allocations) {
    return booking.beat_allocations[dayIndex]
  }
  // Legacy support for old booking format
  return booking.specificDays?.includes(dayIndex) ? booking.beat : null
}
