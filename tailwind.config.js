/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'playwrite': ['"Playwrite AU SA"', 'cursive'],
        'playfair': ['"Playfair Display"', 'serif'],
      },
      animation: {
        'infinite-scroll': 'scroll 60s linear infinite',
        'fade-in': 'fade-in 1s ease-out forwards',
        'pulse': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'blob': 'blob 7s infinite',
        'scale-in': 'scale-in 0.2s ease-in-out',
        'wiggle': 'wiggle 0.3s ease-in-out',
        'scroll-right': 'scroll-right 60s linear infinite',
      },
      animationDelay: {
        '1500': '1500ms',
        '2000': '2000ms',
        '3000': '3000ms',
        '4000': '4000ms',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        'scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' }
        },
        'scroll-right': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        'pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.6 }
        },
        'float': {
          '0%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-15px)' },
          '100%': { transform: 'translateY(0px)' }
        },
        blob: {
          '0%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)',
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)',
          },
          '100%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
        },
        'scale-in': {
          '0%': { transform: 'scale(0)' },
          '100%': { transform: 'scale(1)' },
        },
        'wiggle': {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },
      transitionDelay: {
        '300': '300ms',
      },
      colors: {
        'shop-primary': '#000000',
        'shop-secondary': '#808080',
        'shop-background': '#ffffff',
      },
      backgroundImage: {
        'grid-white': "linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
      }
    },
  },
  plugins: [],
}; 