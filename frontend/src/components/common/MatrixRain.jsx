// frontend/src/components/common/MatrixRain.jsx
// ─────────────────────────────────────────────
// Canvas-based Matrix digital rain background.
// Drop this anywhere as <MatrixRain /> — it covers
// its parent with position:absolute, pointer-events:none
// so it never blocks clicks.
//
// WHERE TO PLACE THIS FILE:
//   frontend/src/components/common/MatrixRain.jsx

import { useEffect, useRef } from 'react'

// Characters used in the rain — mix of katakana + digits + symbols
const CHARS =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*<>/\\|~'

export default function MatrixRain({
  opacity     = 0.18,    // overall canvas opacity (0–1)
  color       = '#00f5ff', // rain color (default: cyber-cyan)
  fontSize    = 14,      // px size of each character
  speed       = 1.2,     // multiplier — higher = faster rain
  density     = 0.975,   // 0–1: higher = more columns active
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let animId
    let cols
    let drops = []

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      cols  = Math.floor(canvas.width / fontSize)
      drops = Array.from({ length: cols }, () => Math.random() * -100)
    }

    const draw = () => {
      // Fade-trail effect — semi-transparent black overlay each frame
      ctx.fillStyle = 'rgba(10, 10, 10, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = color
      ctx.font      = `${fontSize}px "DM Mono", monospace`

      for (let i = 0; i < drops.length; i++) {
        // Random char from our set
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        const x    = i * fontSize
        const y    = drops[i] * fontSize

        // Brightest char at the head of each column
        ctx.fillStyle = drops[i] > 1
          ? color
          : '#ffffff'  // white head

        ctx.fillText(char, x, y)

        // Reset column when it goes off screen, randomly
        if (y > canvas.height && Math.random() > density) {
          drops[i] = 0
        }
        drops[i] += speed
      }

      animId = requestAnimationFrame(draw)
    }

    resize()
    draw()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
    }
  }, [color, fontSize, speed, density])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'absolute',
        inset:         0,
        width:         '100%',
        height:        '100%',
        opacity,
        pointerEvents: 'none',
        zIndex:        0,
        display:       'block',
      }}
    />
  )
}
