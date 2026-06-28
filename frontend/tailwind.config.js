export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
      },
      colors: {
        cinema: {
          black: '#0a0a0f',
          dark: '#121218',
          gray: '#94a3b8',
          cream: '#e2e8f0',
          gold: '#f59e0b',
          goldLight: '#fbbf24',
          goldDark: '#d97706',
        }
      }
    },
  },
  plugins: [],
};
