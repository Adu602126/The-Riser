/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neo-brutalist + Cyber palette
        cyber: {
          black:   '#0a0a0a',
          dark:    '#111111',
          card:    '#1a1a1a',
          border:  '#2a2a2a',
          cyan:    '#00f5ff',
          purple:  '#bf00ff',
          yellow:  '#f5ff00',
          green:   '#00ff88',
          red:     '#ff2d55',
          orange:  '#ff6b00',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body:    ['"DM Mono"', 'monospace'],
        ui:      ['"Syne"', 'sans-serif'],
      },
      boxShadow: {
        'cyber-cyan':   '0 0 20px rgba(0,245,255,0.4), 4px 4px 0 #00f5ff',
        'cyber-purple': '0 0 20px rgba(191,0,255,0.4), 4px 4px 0 #bf00ff',
        'cyber-yellow': '4px 4px 0 #f5ff00',
        'neo':          '4px 4px 0 #fff',
        'neo-dark':     '4px 4px 0 #0a0a0a',
        'glow-cyan':    '0 0 30px rgba(0,245,255,0.6)',
        'glow-purple':  '0 0 30px rgba(191,0,255,0.6)',
      },
      animation: {
        'pulse-fast':  'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glitch':      'glitch 0.3s steps(2) infinite',
        'scan':        'scan 3s linear infinite',
        'float':       'float 3s ease-in-out infinite',
        'bid-flash':   'bidFlash 0.5s ease-out',
      },
      keyframes: {
        glitch: {
          '0%':   { clipPath: 'inset(0 0 95% 0)', transform: 'translateX(-2px)' },
          '50%':  { clipPath: 'inset(50% 0 30% 0)', transform: 'translateX(2px)' },
          '100%': { clipPath: 'inset(90% 0 0 0)', transform: 'translateX(0)' },
        },
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        bidFlash: {
          '0%':   { backgroundColor: 'rgba(0,245,255,0.3)', transform: 'scale(1.02)' },
          '100%': { backgroundColor: 'transparent', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
