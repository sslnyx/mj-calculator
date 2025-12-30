/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core Pop-Art Colors
        orange: '#FF9E00',
        yellow: '#FFD600',
        cyan: '#00CCFF',
        pink: '#FF85C1',
        red: '#FF0055',
        green: '#33FF33',
        purple: '#9333EA',
        // Neutrals
        black: '#000000',
        white: '#FFFFFF',
        gray: {
          100: '#F0F0F0',
          200: '#E0E0E0',
          500: '#888888',
        },
      },
      fontFamily: {
        title: ['Bangers', 'cursive'],
        body: ['Comic Neue', 'cursive'],
      },
      boxShadow: {
        'comic-sm': '2px 2px 0px 0px #000000',
        'comic-md': '4px 4px 0px 0px #000000',
        'comic-lg': '6px 6px 0px 0px #000000',
        'comic-xl': '10px 10px 0px 0px #FF9E00',
      },
      borderRadius: {
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shine': 'shine 2.5s ease-in-out infinite',
        'spin': 'spin 0.8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '4px 4px 0px 0px #000000, 0 0 20px rgba(255, 158, 0, 0.5)' },
          '50%': { boxShadow: '4px 4px 0px 0px #000000, 0 0 40px rgba(255, 158, 0, 0.8)' },
        },
        shine: {
          '0%': { transform: 'translateX(-100%) rotate(45deg)' },
          '100%': { transform: 'translateX(100%) rotate(45deg)' },
        },
      },
    },
  },
  plugins: [],
}
