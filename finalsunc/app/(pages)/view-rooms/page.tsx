
'use client'

import { useEffect, useState } from 'react'

interface AvailabilityRow {
  room: string
  weekday: string
  free_start: string
  free_end: string
}

export default function ViewRoomsPage() {
  const [availability, setAvailability] = useState<AvailabilityRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 1) Define the room and weekday you want to fetch
    const roomName = 'Administrative Offi-Rm 2501'
    const weekday  = 'Friday'

    // 2) Build the URL with query params
    const url =
      `/api/room-availability?room=${encodeURIComponent(roomName)}&weekday=${encodeURIComponent(weekday)}`
    // 3) Fetch from the Next.js API route
    fetch(url)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        return res.json() as Promise<AvailabilityRow[]>
      })
      .then((data) => {
        setAvailability(data)
      })
      .catch((err) => {
        console.error('Fetch error:', err)
        setError(err.message)
      })
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <h1>Free Slots for Abernethy Hall-Rm 0102 (Friday)</h1>
      {error && (
        <p style={{ color: 'red' }}>
          Failed to load availability: {error}
        </p>
      )}
      {!error && availability.length === 0 && (
        <p>Loading…</p>
      )}
      {!error && availability.length > 0 && (
        <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 16 }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: 8 }}>Room</th>
              <th style={{ border: '1px solid #ddd', padding: 8 }}>Weekday</th>
              <th style={{ border: '1px solid #ddd', padding: 8 }}>Free Start</th>
              <th style={{ border: '1px solid #ddd', padding: 8 }}>Free End</th>
            </tr>
          </thead>
          <tbody>
            {availability.map((row, idx) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>
                  {row.room}
                </td>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>
                  {row.weekday}
                </td>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>
                  {row.free_start}
                </td>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>
                  {row.free_end}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
