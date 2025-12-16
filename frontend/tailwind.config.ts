import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
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
        'espotz-success': '#22c55e',
        'espotz-danger': '#ef4444',
        'espotz-warning': '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-espotz': 'linear-gradient(to right, #00cfff, #7a00ff)',
      },
    },
  },
  plugins: [],
}

export default config
