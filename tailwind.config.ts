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
        cobalt: "#1E40FF",
        wax: "#C9A961",
        mist: "#E8E6E0",
        smoke: "#6E6E6A",
        good: "#157449",
        bad: "#A12B2B",
      },
      fontFamily: {
        display: ["var(--font-display)", "Instrument Serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "DM Sans", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        eyebrow: "0.18em",
        tight2: "-0.05em",
      },
      maxWidth: {
        screen: "1280px",
      },
    },
  },
  plugins: [],
};
export default config;
