/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./shared/**/*.{js,ts,jsx,tsx}",
    "./apps/admin/index.html",
    "./apps/admin/src/**/*.{js,ts,jsx,tsx}",
    "./apps/client/index.html",
    "./apps/client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Brand: sky-blue primary scale (matches the reference theme)
        primary: {
          50: '#eef7fd',
          100: '#d7ecfa',
          200: '#b4dcf4',
          300: '#85c5ec',
          400: '#5cb3e8',
          500: '#2f8fd6',
          600: '#1f6fb2',
          700: '#1c5e98',
          800: '#1b4f7e',
          900: '#1a4368',
          950: '#143049',
        },
        // Secondary: lighter sky blue accent
        secondary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Accent: the reference sky-blue used for headings & chrome
        accent: {
          50: '#eef7fd',
          100: '#d7ecfa',
          200: '#b4dcf4',
          300: '#85c5ec',
          400: '#5cb3e8',
          500: '#2f8fd6',
          600: '#1f6fb2',
          700: '#1c5e98',
          800: '#1b4f7e',
          900: '#1a4368',
        },
      },
      backgroundImage: {
        // Reference chrome: blue top bar + left rail
        'brand-header': 'linear-gradient(90deg, #1f6fb2 0%, #2f8fd6 55%, #4cb0e6 100%)',
        'brand-rail': 'linear-gradient(180deg, #1f6fb2 0%, #1c5e98 100%)',
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgb(15 23 42 / 0.06), 0 4px 16px -4px rgb(15 23 42 / 0.04)',
        'card': '0 1px 3px 0 rgb(15 23 42 / 0.04), 0 1px 2px -1px rgb(15 23 42 / 0.04)',
        'glow': '0 0 0 4px rgb(59 130 246 / 0.12)',
      },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
