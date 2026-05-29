import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101418",
        ember: "#f97316",
        mint: "#2dd4bf",
        plum: "#7c3aed",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.08), 0 24px 70px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
