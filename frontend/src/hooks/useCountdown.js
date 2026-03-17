// hooks/useCountdown.js — The Riser
import { useState, useEffect } from 'react'

/**
 * Returns live countdown object for a given endTime.
 * { days, hours, minutes, seconds, isExpired, isUrgent, formatted }
 */
export function useCountdown(endTime) {
  const calcTime = () => {
    const diff = new Date(endTime) - Date.now()
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, isUrgent: false, formatted: 'ENDED' }
    }
    const days    = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    const isUrgent = diff < 5 * 60 * 1000  // < 5 minutes

    let formatted = ''
    if (days > 0) formatted = `${days}D ${hours.toString().padStart(2,'0')}H ${minutes.toString().padStart(2,'0')}M`
    else if (hours > 0) formatted = `${hours.toString().padStart(2,'0')}H ${minutes.toString().padStart(2,'0')}M ${seconds.toString().padStart(2,'0')}S`
    else formatted = `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`

    return { days, hours, minutes, seconds, isExpired: false, isUrgent, formatted }
  }

  const [time, setTime] = useState(calcTime)

  useEffect(() => {
    if (time.isExpired) return
    const interval = setInterval(() => setTime(calcTime()), 1000)
    return () => clearInterval(interval)
  }, [endTime, time.isExpired])

  return time
}
