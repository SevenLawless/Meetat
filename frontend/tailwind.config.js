/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Winter chill palette
        primary: {
          50: '#f0f9fa',
          100: '#B8E3E9',  // Light Blue
          200: '#a8d8de',
          300: '#93B1B5',  // Muted Blue-Gray
          400: '#7a9fa3',
          500: '#4F7C82',  // Teal/Dark Blue-Green
          600: '#3d6267',
          700: '#2d4a4f',
          800: '#1a2e33',
          900: '#0B2E33',  // Very Dark Teal
          950: '#051a1f',
        },
        // Neutral grays for text and backgrounds
        surface: {
          50: '#f8f9fa',
          100: '#f0f2f4',
          200: '#e5e8eb',
          300: '#d4d8dc',
          400: '#a3a8ad',
          500: '#73787d',
          600: '#52575c',
          700: '#404448',
          800: '#26292c',
          900: '#17191b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.08), 0 4px 16px -4px rgba(0, 0, 0, 0.06)',
        'medium': '0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 8px 24px -4px rgba(0, 0, 0, 0.08)',
        'elevated': '0 8px 24px -4px rgba(0, 0, 0, 0.12), 0 16px 40px -8px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-down': 'slideDown 0.25s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.97)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
