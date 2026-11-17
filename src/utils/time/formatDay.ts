/** A day (YYYY-MM-DD) as the viewer writes dates, e.g. "Nov 5, 2026". Read at noon so no time zone moves it to another day. */
export const formatDay = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
