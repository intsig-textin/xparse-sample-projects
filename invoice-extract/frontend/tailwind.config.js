/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        indigo: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      animation: {
        'pulse-highlight': 'pulse-highlight 1.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-highlight': {
          '0%, 100%': { opacity: '0.7', boxShadow: '0 0 0 2px rgba(251, 191, 36, 0.8)' },
          '50%': { opacity: '1', boxShadow: '0 0 0 4px rgba(251, 191, 36, 1), 0 0 12px rgba(251, 191, 36, 0.6)' },
        },
      },
    },
  },
  plugins: [],
}
