// frontend/src/components/common/CustomCursor.jsx
// ─────────────────────────────────────────────────
// Replaces the default browser cursor with a cyber
// crosshair + trailing dot effect.
// Renders a small ring that follows the mouse and
// a filled dot that lags slightly behind (smooth).
//
// WHERE TO PLACE THIS FILE:
//   frontend/src/components/common/CustomCursor.jsx
//
// HOW TO USE:
//   Import and drop <CustomCursor /> once inside App.jsx
//   (outside your Routes, just inside the root div)

import { useEffect, useRef, useState } from 'react'

export default function CustomCursor() {
  const ringRef  = useRef(null)
  const dotRef   = useRef(null)

  // Raw mouse pos (ring snaps here instantly)
  const mouse  = useRef({ x: -100, y: -100 })
  // Lagged pos (dot lerps toward mouse)
  const lagged = useRef({ x: -100, y: -100 })
  const animId = useRef(null)

  const [clicking, setClicking]   = useState(false)
  const [hovering, setHovering]   = useState(false)

  useEffect(() => {
    // Hide native cursor globally
    document.documentElement.style.cursor = 'none'

    const onMove = (e) => {
      mouse.current = { x: e.clientX, y: e.clientY }
    }
    const onDown = () => setClicking(true)
    const onUp   = () => setClicking(false)

    // Detect hoverable elements → expand ring
    const onOver = (e) => {
      const tag = e.target.tagName.toLowerCase()
      const isClickable =
        tag === 'a' ||
        tag === 'button' ||
        tag === 'input'  ||
        tag === 'select' ||
        tag === 'textarea' ||
        e.target.closest('a, button, [role="button"]')
      setHovering(!!isClickable)
    }

    window.addEventListener('mousemove',  onMove)
    window.addEventListener('mousedown',  onDown)
    window.addEventListener('mouseup',    onUp)
    window.addEventListener('mouseover',  onOver)

    // Animation loop — lerp dot position
    const lerp = (a, b, t) => a + (b - a) * t

    const tick = () => {
      lagged.current.x = lerp(lagged.current.x, mouse.current.x, 0.12)
      lagged.current.y = lerp(lagged.current.y, mouse.current.y, 0.12)

      if (ringRef.current) {
        ringRef.current.style.transform =
          `translate(${mouse.current.x}px, ${mouse.current.y}px)`
      }
      if (dotRef.current) {
        dotRef.current.style.transform =
          `translate(${lagged.current.x}px, ${lagged.current.y}px)`
      }

      animId.current = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      document.documentElement.style.cursor = ''
      window.removeEventListener('mousemove',  onMove)
      window.removeEventListener('mousedown',  onDown)
      window.removeEventListener('mouseup',    onUp)
      window.removeEventListener('mouseover',  onOver)
      cancelAnimationFrame(animId.current)
    }
  }, [])

  // Don't render on touch devices
  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
    return null
  }

  const ringSize  = hovering ? 40 : clicking ? 16 : 28
  const ringColor = hovering ? '#bf00ff' : '#00f5ff'

  return (
    <>
      {/* ── Outer ring — snaps to cursor ─────────────────── */}
      <div
        ref={ringRef}
        style={{
          position:        'fixed',
          top:             0,
          left:            0,
          width:           ringSize,
          height:          ringSize,
          marginLeft:      -(ringSize / 2),
          marginTop:       -(ringSize / 2),
          border:          `2px solid ${ringColor}`,
          borderRadius:    '50%',
          pointerEvents:   'none',
          zIndex:          99999,
          transition:      'width 0.15s, height 0.15s, margin 0.15s, border-color 0.15s',
          mixBlendMode:    'exclusion',
          /* crosshair lines */
          boxShadow: `
            0 0 0 0.5px ${ringColor}44,
            0 0 8px ${ringColor}66
          `,
        }}
      >
        {/* Top tick */}
        <span style={{
          position: 'absolute', top: -6, left: '50%',
          transform: 'translateX(-50%)',
          width: 1, height: 4,
          background: ringColor,
          display: 'block',
        }} />
        {/* Bottom tick */}
        <span style={{
          position: 'absolute', bottom: -6, left: '50%',
          transform: 'translateX(-50%)',
          width: 1, height: 4,
          background: ringColor,
          display: 'block',
        }} />
        {/* Left tick */}
        <span style={{
          position: 'absolute', left: -6, top: '50%',
          transform: 'translateY(-50%)',
          width: 4, height: 1,
          background: ringColor,
          display: 'block',
        }} />
        {/* Right tick */}
        <span style={{
          position: 'absolute', right: -6, top: '50%',
          transform: 'translateY(-50%)',
          width: 4, height: 1,
          background: ringColor,
          display: 'block',
        }} />
      </div>

      {/* ── Inner dot — lags behind (trail effect) ────────── */}
      <div
        ref={dotRef}
        style={{
          position:      'fixed',
          top:           0,
          left:          0,
          width:         clicking ? 3 : 5,
          height:        clicking ? 3 : 5,
          marginLeft:    clicking ? -1.5 : -2.5,
          marginTop:     clicking ? -1.5 : -2.5,
          background:    '#ffffff',
          borderRadius:  '50%',
          pointerEvents: 'none',
          zIndex:        99999,
          transition:    'width 0.1s, height 0.1s',
          mixBlendMode:  'exclusion',
        }}
      />
    </>
  )
}
