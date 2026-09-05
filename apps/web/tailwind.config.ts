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
        canvas: "#E6F4F3",
        surface: "#FFFFFF",
        subtle: "#BEE7E3",
        border: "#BEE7E3",
        accent: "#7ED2CC",
        interactive: "#40B3A6",
        primary: "#16857A",
        heading: "#0D3B39",
        muted: "#4D6F6D",
      },
    },
  },
  plugins: [],
} satisfies Config;
