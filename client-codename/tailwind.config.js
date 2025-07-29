/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      screens: {
        'max-ml': { 'max': '1500px' }, // For screens 1500px and below (up to 15-16-inch laptops)
      },
    },
  },
  plugins: [],
}

