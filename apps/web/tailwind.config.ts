import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      colors: {
        canvas: "#F4F7F6",
        surface: "#FFFFFF",
        subtle: "#D8E2E1",
        border: "#D8E2E1",
        accent: "#9FC490",
        accentSoft: "#C0DFA1",
        interactive: "#82A3A1",
        primary: "#011936",
        heading: "#011936",
        muted: "#465362",
        sage: "#82A3A1",
        olive: "#9FC490",
        sprout: "#C0DFA1",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(1, 25, 54, 0.05)",
        card: "0 1px 3px 0 rgba(1, 25, 54, 0.06), 0 1px 2px -1px rgba(1, 25, 54, 0.06)",
        elevated: "0 4px 14px 0 rgba(1, 25, 54, 0.08)",
        modal: "0 16px 36px 0 rgba(1, 25, 54, 0.14), 0 2px 6px 0 rgba(1, 25, 54, 0.06)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        toastIn: {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        toastOut: {
          "0%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(8px) scale(0.96)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "toast-in": "toastIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "toast-out": "toastOut 0.15s ease-in forwards",
      },
    },
  },
  plugins: [],
} satisfies Config;
