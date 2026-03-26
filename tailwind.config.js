/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px"
      }
    },
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
        },
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        surface: "hsl(var(--surface))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          light: "hsl(var(--primary-light))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          light: "hsl(var(--accent-light))"
        },
        subtle: "hsl(var(--subtle))",
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))"
        },
        status: {
          pending: "hsl(var(--status-pending))",
          "pending-bg": "hsl(var(--status-pending-bg))",
          collected: "hsl(var(--status-collected))",
          "collected-bg": "hsl(var(--status-collected-bg))",
          rejected: "hsl(var(--status-rejected))",
          "rejected-bg": "hsl(var(--status-rejected-bg))",
          accepted: "hsl(var(--status-accepted))",
          "accepted-bg": "hsl(var(--status-accepted-bg))"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      boxShadow: {
        "erp-sm": "var(--shadow-sm)",
        "erp-md": "var(--shadow-md)",
        "erp-lg": "var(--shadow-lg)",
        "brand-sm": "0 2px 12px rgba(15, 118, 110, 0.12)",
        "brand-md": "0 4px 12px rgba(15, 118, 110, 0.2)",
        "brand-lg": "0 8px 24px rgba(15, 118, 110, 0.25)"
      },
      keyframes: {
        blink: {
          "0%, 100%": { backgroundColor: "transparent" },
          "50%": { backgroundColor: "rgba(255, 255, 0, 0.5)" }
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)", filter: "blur(3px)" },
          to: { opacity: "1", transform: "translateY(0)", filter: "blur(0px)" }
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" }
        }
      },
      animation: {
        blink: "blink 1s infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        "slide-in-right": "slide-in-right 0.35s cubic-bezier(0.16, 1, 0.3, 1) both"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
}
