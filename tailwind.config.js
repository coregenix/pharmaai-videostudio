/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#06101e", 900: "#0a1a2f", 800: "#102641", 700: "#1a3556", 600: "#2a4a70" },
        lab: { 300: "#7ee8dc", 400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488" },
        warn: "#f5b544",
      },
      fontFamily: { display: ["var(--font-display)", "sans-serif"], body: ["var(--font-body)", "sans-serif"] },
    },
  },
  plugins: [],
};
