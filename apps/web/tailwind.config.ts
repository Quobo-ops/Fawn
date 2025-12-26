import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        fawn: {
          50: '#fdf8f6',
          100: '#f9ebe4',
          200: '#f4d6c8',
          300: '#e9b9a0',
          400: '#dc9474',
          500: '#cf7452',
          600: '#be5d42',
          700: '#9f4a37',
          800: '#823f32',
          900: '#6b382e',
        },
      },
    },
  },
  plugins: [],
};

export default config;
