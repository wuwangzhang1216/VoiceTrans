/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',      // Extra small devices
        'sm': '640px',      // Small devices (default)
        'md': '768px',      // Medium devices (tablets)
        'lg': '1024px',     // Large devices (desktops)
        'xl': '1280px',     // Extra large devices
        '2xl': '1536px',    // 2X large devices
        '3xl': '1920px',    // 3X large devices (4K)
        // Custom breakpoints for specific devices
        'mobile': { 'max': '767px' },       // Mobile-first
        'tablet': { 'min': '768px', 'max': '1023px' }, // Tablet only
        'desktop': { 'min': '1024px' },     // Desktop and above
        // Portrait and landscape
        'portrait': { 'raw': '(orientation: portrait)' },
        'landscape': { 'raw': '(orientation: landscape)' },
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Luxury theme colors
        gold: {
          50: '#fffef0',
          100: '#fffad1',
          200: '#fff5a3',
          300: '#ffed6b',
          400: '#ffd700',
          500: '#d4af37',
          600: '#b8922f',
          700: '#967525',
          800: '#735919',
          900: '#4d3b0f',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
        'wave': 'wave 1.2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'scaleY(1)', opacity: '0.6' },
          '50%': { transform: 'scaleY(1.4)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      fontSize: {
        'xxs': '0.625rem',     // 10px
        'xxxs': '0.5rem',      // 8px
      },
      lineClamp: {
        7: '7',
        8: '8',
        9: '9',
        10: '10',
      },
      // Touch-friendly sizing
      minHeight: {
        'touch': '44px',  // iOS minimum touch target
      },
      minWidth: {
        'touch': '44px',  // iOS minimum touch target
      },
    },
  },
  plugins: [],
}