/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#fdfaf5",
        foreground: "#241a12",
        ink: "#241a12",
        cream: "#f8f1e7",
        sand: "#eee0cd",
        clay: "#8a4f27",
        ember: "#c8712f",
        muted: "#f5efe6",
        "muted-foreground": "#6d5c4c",
        border: "rgba(36, 26, 18, 0.12)",
      },
      fontFamily: {
        sans: ["Tenor Sans", "Inter", "system-ui", "sans-serif"],
        display: ["Athena", "Cormorant Garamond", "EB Garamond", "Playfair Display", "serif"],
        serif: ["Athena", "Cormorant Garamond", "EB Garamond", "serif"],
        mono: ["monospace"],
      },
    },
  },
  plugins: [],
};
