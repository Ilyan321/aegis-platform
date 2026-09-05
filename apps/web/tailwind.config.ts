import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      colors: {
        background: "#09090b",
        foreground: "#f4f4f5",
        surface: {
          DEFAULT: "rgba(18, 18, 23, 0.7)",
          elevated: "rgba(24, 24, 30, 0.85)",
          border: "rgba(255, 255, 255, 0.08)",
          "border-hover": "rgba(255, 255, 255, 0.16)",
        },
        status: {
          critical: "#f43f5e",
          high: "#fb923c",
          medium: "#facc15",
          low: "#38bdf8",
          active: "#ef4444",
          clean: "#10b981",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
