/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          blue: '#0071E3',
          'blue-hover': '#006EDB',
          'blue-press': '#0076DF',
        },
        text: {
          dominant: '#1D1D1F',
          secondary: '#333336',
          tertiary: '#6E6E73',
          inverse: '#000000',
        },
        surface: {
          light: '#EDEDF2',
        },
        dark: {
          medium: '#272729',
          deep: '#18181A',
        }
      },
      fontFamily: {
        text: ['"SF Pro Text"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['"SF Pro Display"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      spacing: {
        '4.5': '18px',
        '11': '44px',
        '13': '52px',
        '14': '56px',
      },
      borderRadius: {
        'input': '8px',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.2, 0, 0, 1)',
      }
    },
  },
  plugins: [],
}
