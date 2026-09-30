// Calendar helper utility for generating iCal (.ics) and Google Calendar links

export const generateIcsContent = (booking, currentWeek) => {
  const startDate = currentWeek?.startDate ? new Date(currentWeek.startDate) : new Date()
  const endDate = currentWeek?.endDate ? new Date(currentWeek.endDate) : new Date(startDate.getTime() + 6 * 86400000)

  // Format date to UTC YYYYMMDDTHHMMSSZ
  const formatDateToIcs = (d) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const dtStart = formatDateToIcs(startDate)
  const dtEnd = formatDateToIcs(endDate)
  const now = formatDateToIcs(new Date())

  // Beat allocations description
  let beatSummary = 'No specific beats assigned'
  if (booking.beat_allocations && Object.keys(booking.beat_allocations).length > 0) {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    beatSummary = Object.entries(booking.beat_allocations)
      .map(([dayIdx, beat]) => `${dayNames[parseInt(dayIdx)] || `Day ${parseInt(dayIdx) + 1}`}: ${beat}`)
      .join('\\n')
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Highland Angling//Fishing Booking System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:booking-${booking.id || Date.now()}@highlandangling.co.uk`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:🎣 Fishing Trip - Week ${booking.week} (${booking.name})`,
    `DESCRIPTION:Fishing Booking Reference: ${booking.booking_ref || 'BK-101'}\\nDays: ${booking.days_count} day(s)\\n\\nBeat Schedule:\\n${beatSummary}\\n\\nPlease arrive 30 minutes prior to fishing start. Bring your rod license and permit.`,
    'LOCATION:Highland River & Loch Fishery, Scotland',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')
}

export const downloadIcsFile = (booking, currentWeek) => {
  const icsData = generateIcsContent(booking, currentWeek)
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `fishing-booking-week-${booking.week}.ics`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const getGoogleCalendarUrl = (booking, currentWeek) => {
  const startDate = currentWeek?.startDate ? new Date(currentWeek.startDate) : new Date()
  const endDate = currentWeek?.endDate ? new Date(currentWeek.endDate) : new Date(startDate.getTime() + 6 * 86400000)

  const formatGoogleDate = (d) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const title = encodeURIComponent(`🎣 Fishing Trip - Week ${booking.week}`)
  const details = encodeURIComponent(
    `Booking Ref: ${booking.booking_ref || 'BK-101'}\nGuest: ${booking.name}\nDays: ${booking.days_count} day(s)\nType: ${booking.booking_type}`
  )
  const location = encodeURIComponent('Highland River & Loch Fishery, Scotland')
  const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`
}
