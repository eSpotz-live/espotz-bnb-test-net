/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'espotz-cyan': '#00cfff',
        'espotz-purple': '#7a00ff',
        'espotz-white': '#ffffff',
        'espotz-black': '#0f0f0f',
        'espotz-dark-gray': '#1a1a2e',
        'espotz-mid-gray': '#2d2d44',
        'espotz-light-gray': '#a0a0a0',
      },
      backgroundImage: {
        'gradient-espotz': 'linear-gradient(to right, #00cfff, #7a00ff)',
      },
    },
  },
  plugins: [],
}
