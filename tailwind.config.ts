import type { Config } from "tailwindcss";

/**
 * Colors are semantic tokens backed by CSS variables (see globals.css), so the same
 * class works in both themes:
 *   - dark  = slate-grey base (#44444E) + lavender accent (#BDA6CE)
 *   - light = beige/cream base (#FFFAF3) + lavender accent
 * Variables are space-separated RGB triplets, enabling Tailwind's `/<alpha>` opacity.
 */
const rgb = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: rgb("--canvas"), // page background
        sunken: rgb("--sunken"), // inputs / deepest surfaces
        card: rgb("--card"), // raised surfaces
        cardhi: rgb("--cardhi"), // hover / secondary surface
        edge: rgb("--edge"), // borders
        fg: rgb("--fg"), // primary text
        muted: rgb("--muted"), // secondary text
        faint: rgb("--faint"), // tertiary text
        onaccent: rgb("--onaccent"), // text on an accent fill
        lav: {
          DEFAULT: rgb("--lav"),
          light: rgb("--lav-light"),
          dark: rgb("--lav-dark"),
          dim: rgb("--lav-dim"),
          glow: rgb("--lav-glow"),
        },
      },
      boxShadow: {
        glow: "0 0 24px -6px rgba(189, 166, 206, 0.5)",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
