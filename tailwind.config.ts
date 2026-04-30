import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0A",
        bone: "#FAFAF7",
        // LA Rams palette
        royal: "#003594",     // Rams Royal Blue — primary action / accent
        sol: "#FFA300",       // Rams Sol Gold — partner / premium
        // Legacy aliases so we don't have to rename every usage in one go
        cobalt: "#003594",
        wax: "#FFA300",
        mist: "#E8E6E0",
        smoke: "#5A5A56",
        good: "#157449",
        bad: "#A12B2B",
      },
      fontFamily: {
        display: ["var(--font-display)", "Anton", "Impact", "sans-serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        eyebrow: "0.18em",
        tight2: "-0.05em",
      },
      maxWidth: {
        screen: "1280px",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.4s infinite",
      },
    },
  },
  plugins: [],
};
export default config;
