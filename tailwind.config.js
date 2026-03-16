/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./index.html"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["DM Mono", "SF Mono", "monospace"],
      },
      colors: {
        emotion: {
          happy: "#34d399",
          frustrated: "#f87171",
          anxious: "#fb923c",
          confused: "#a78bfa",
          neutral: "#6b7280",
          excited: "#fbbf24",
          sad: "#60a5fa",
          disengaged: "#4b5563",
          skeptical: "#e879f9",
          focused: "#38bdf8",
        },
        glass: {
          bg: "rgba(12, 12, 16, 0.92)",
          card: "rgba(255, 255, 255, 0.04)",
          "card-hover": "rgba(255, 255, 255, 0.07)",
          border: "rgba(255, 255, 255, 0.08)",
          "border-active": "rgba(255, 255, 255, 0.16)",
        },
        accent: {
          DEFAULT: "#6366f1",
          glow: "rgba(99, 102, 241, 0.3)",
        },
      },
      animation: {
        in: "in 0.2s ease-out",
        out: "out 0.2s ease-in",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
        "slide-in": "slideIn 0.3s ease-out",
        "slide-out": "slideOut 0.3s ease-in",
        "fade-in": "fadeIn 0.2s ease-out",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        in: {
          "0%": { transform: "translateY(100%)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
        out: {
          "0%": { transform: "translateY(0)", opacity: 1 },
          "100%": { transform: "translateY(100%)", opacity: 0 },
        },
        pulse: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.5 },
        },
        slideIn: {
          "0%": { transform: "translateY(-10px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
        slideOut: {
          "0%": { transform: "translateY(0)", opacity: 1 },
          "100%": { transform: "translateY(-10px)", opacity: 0 },
        },
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}
