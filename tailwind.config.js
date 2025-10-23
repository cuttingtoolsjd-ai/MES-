/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        white: '#FFFFFF',
        black: '#111111',
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB', // mid-gray accent
          300: '#D1D5DB',
          400: '#9CA3AF', // silver-gray
        },
        blue: {
          700: '#1E40AF', // industrial blue
        },
        charcoal: '#111111',
        silver: '#9CA3AF',
        'industrial-blue': '#1E40AF',
      },
      borderRadius: {
        '2xl': '1rem',
      },
      boxShadow: {
        subtle: '0 2px 8px 0 rgba(17,17,17,0.04)',
      },
    },
  },
  plugins: [],
}