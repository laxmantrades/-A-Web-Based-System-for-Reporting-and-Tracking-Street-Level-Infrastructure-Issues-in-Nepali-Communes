// Tailwind settings.
// content = files Tailwind scans for class names (unused styles get removed).
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Brand colours: brand = crimson, ink = soft black for text.
      colors: {
        brand: {
          50: '#fff1f2',
          100: '#ffe0e2',
          200: '#ffc6cb',
          300: '#ff9da5',
          400: '#f76e7c',
          500: '#e63950',
          600: '#c8102e', // primary
          700: '#a80c26',
          800: '#8a0f24',
          900: '#731122',
        },
        ink: {
          DEFAULT: '#1b1f24',
          soft: '#5b6570',
        },
      },
      fontFamily: {
        // system fonts, no font download
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      container: {
        center: true,
        padding: '1rem',
      },
      // slow up-down float for the hero cards
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
