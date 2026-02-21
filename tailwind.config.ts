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
        // UC Davis brand colors
        "ucd-blue": "#002855",
        "ucd-gold": "#FFBF00",
        "ucd-light-blue": "#B0D0E8",
      },
    },
  },
  plugins: [],
};

export default config;
