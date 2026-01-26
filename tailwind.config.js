/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a"
        }
      },
      keyframes: {
        blink: {
          "0%, 100%": { backgroundColor: "transparent" },
          "50%": { backgroundColor: "rgba(255, 255, 0, 0.5)" }
        }
      },
      animation: {
        blink: "blink 1s infinite"
      },
      boxShadow: {
        "brand-sm": "0 2px 12px rgba(15, 118, 110, 0.12)",
        "brand-md": "0 4px 12px rgba(15, 118, 110, 0.2)",
        "brand-lg": "0 8px 24px rgba(15, 118, 110, 0.25)"
      }
    }
  },
  plugins: []
}
