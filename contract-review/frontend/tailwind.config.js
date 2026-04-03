/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f4ff',
          100: '#dce8ff',
          200: '#b9d0ff',
          300: '#8ab0f8',
          400: '#5a88f0',
          500: '#2e65e3',
          600: '#1a4dc7',
          700: '#1a2744',
          800: '#162040',
          900: '#0f1830',
        },
        gold: {
          50:  '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#d4a843',
          500: '#b8902d',
          600: '#9a7421',
          700: '#7c5c18',
        },
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body:    ['Open Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
