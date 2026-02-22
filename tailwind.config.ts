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
        // Primary brand tokens (remapped — all ucd-* references auto-update)
        "ucd-blue":       "#E37861", // warm coral  → primary interactive
        "ucd-gold":       "#EEB467", // warm gold   → accent / highlights
        "ucd-light-blue": "#F4E8D0", // neutral sand → light surfaces

        // Full Pantry palette (use these in new code)
        "pantry-coral":        "#E37861",
        "pantry-coral-dark":   "#D65539",
        "pantry-gold":         "#EEB467",
        "pantry-gold-dark":    "#DD912D",
        "pantry-sand":         "#F4E8D0",
        "pantry-sand-dark":    "#DED2B9",
        "pantry-green":        "#5E7F64",
        "pantry-green-dark":   "#436A4A",
        "pantry-dark":         "#312F2D",
        "pantry-neutral":      "#5D5C5A",
        "pantry-purple":       "#A592C0",
        "pantry-blue-muted":   "#6C90B2",
      },
      fontFamily: {
        sans: ["var(--font-rubik)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
