/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: 'rgb(var(--accent) / <alpha-value>)',
      },
      boxShadow: {
        glow: '0 0 24px rgba(34,197,94,0.3)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(16,185,129,0.0)' },
          '50%': { boxShadow: '0 0 12px rgba(16,185,129,0.55)' },
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};


