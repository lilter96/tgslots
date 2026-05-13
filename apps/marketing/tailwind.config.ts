import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
      },
      colors: {
        forest: '#060e04',
        gold: '#d4a017',
        'gold-glow': '#ffe066',
        woodland: '#2d7a2d',
      },
      dropShadow: {
        gold: '0 0 15px rgba(212, 160, 23, 0.8)',
        glow: '0 0 25px rgba(255, 224, 102, 0.9)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.85', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
        'fade-up': 'fade-up 0.7s ease-out forwards',
      },
    },
  },
  plugins: [],
}

export default config
