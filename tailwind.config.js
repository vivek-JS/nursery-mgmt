/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      keyframes: {
        blink: {
          "0%, 100%": { backgroundColor: "transparent" },
          "50%": { backgroundColor: "rgba(255, 255, 0, 0.5)" } // Light yellow
        }
      },
      animation: {
        blink: "blink 1s infinite"
      }
    }
  },
  plugins: []
}
