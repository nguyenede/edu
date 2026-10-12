import type { Config } from 'tailwindcss';
import path from 'path';

const config: Config = {
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
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        google: {
          blue: '#1a73e8',
          red: '#ea4335',
          yellow: '#fbbc04',
          green: '#34a853',
          bg: '#f8fafd',
          'bg-dark': '#131314',
          card: '#ffffff',
          'card-dark': '#1e1f20',
          hover: '#f0f4f9',
          'hover-dark': '#2d2f31',
          pill: '#c2e7ff',
          'pill-text': '#001d35',
          'pill-dark': '#2d2f31',
          'pill-dark-text': '#e3e3e3',
          input: '#e9eef6',
          'input-dark': '#282a2c',
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

export default config;
