/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./themes/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{md,mdx}",
  ],
  theme: {
    extend: {
      // Editorial palette colors are exposed via CSS variables in
      // `app/globals.css` so they can switch with the active theme
      // (light / dark / auto). The utility classes `bg-paper`,
      // `bg-paper-2`, `text-ink`, `text-ink-2`, `text-accent`,
      // `border-line` are defined in the components layer and
      // resolve to `var(--paper)`, `var(--ink)`, etc.
      //
      // Legacy aliases (paper2, ink2, accent2) are kept so existing
      // component code continues to compile without a rename pass.
      paper: "var(--paper)",
      "paper-2": "var(--paper-2)",
      paper2: "var(--paper-2)",
      ink: "var(--ink)",
      "ink-2": "var(--ink-2)",
      ink2: "var(--ink-2)",
      "ink-3": "var(--ink-3)",
      accent: "var(--accent)",
      accent2: "var(--accent-2)",
      line: "var(--line)",

      /* Shadcn compatibility — fixed (independent of theme) */
      border: "var(--line)",
      input: "var(--line)",
      ring: "var(--accent)",
      background: "var(--paper)",
      foreground: "var(--ink)",
      primary: {
        DEFAULT: "var(--ink)",
        foreground: "var(--paper)",
      },
      secondary: {
        DEFAULT: "var(--paper-2)",
        foreground: "var(--ink-2)",
      },
      muted: {
        DEFAULT: "var(--ink-2)",
        foreground: "var(--ink-2)",
      },
      destructive: {
        DEFAULT: "var(--err)",
        foreground: "var(--paper)",
      },
      /* Status colors used by validators (fixed) */
      ok: "var(--ok)",
      warn: "var(--warn)",
      err: "var(--err)",

      fontFamily: {
        serif: ["var(--font-serif)", "Newsreader", "Merriweather", "Georgia", "serif"],
        display: ["var(--font-serif)", "Merriweather", "Newsreader", "serif"],
        sans: ["var(--font-sans)", "Source Sans 3", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "8px",
        md: "6px",
        sm: "4px",
      },
      spacing: {
        "page-margin": "var(--page-margin)",
      },
    },
  },
  plugins: [],
};
