/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0E0E14',
        surface: '#16161F',
        card: '#1C1C28',
        border: '#2A2A3A',
        accent: '#FF6B00',
        'accent-light': '#FF8C33',
        muted: '#6B6B80',
        text: '#E8E8F0',
        'text-muted': '#9090A8',
      },
    },
  },
  plugins: [],
}
