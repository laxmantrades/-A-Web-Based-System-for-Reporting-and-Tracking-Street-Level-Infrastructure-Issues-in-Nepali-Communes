/**
 * Tailwind CSS configuration.
 *
 * `content` tells Tailwind which files to scan for class names so it can
 * strip every unused style out of the final CSS bundle (this is what keeps
 * a Tailwind build small). If you add a new folder with JSX, list it here.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      /**
       * Brand palette for MeroSadak.
       * `brand` is the crimson used across Nepal's identity; `ink` is the
       * near-black we use for text so it is softer than pure #000.
       */
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
        // System font stack: fast, no web-font download, looks native everywhere.
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
    },
  },
  plugins: [],
}
