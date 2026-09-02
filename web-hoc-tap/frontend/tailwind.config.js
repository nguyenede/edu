const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, 'src/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(__dirname, 'src/pages/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(__dirname, 'src/components/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(__dirname, 'src/app/**/*.{js,ts,jsx,tsx,mdx}'),
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './frontend/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        google: {
          blue: '#1a73e8',
          red: '#ea4335',
          yellow: '#fbbc04',
          green: '#34a853',
          bg: '#f8fafd',
          'bg-dark': '#090a0f',
          card: '#ffffff',
          'card-dark': '#111827',
          hover: '#f0f4f9',
          'hover-dark': '#1f2937',
          pill: '#c2e7ff',
          'pill-text': '#001d35',
          'pill-dark': '#004a77',
          'pill-dark-text': '#c2e7ff',
          input: '#e9eef6',
          'input-dark': '#1f2937',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '28px',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
