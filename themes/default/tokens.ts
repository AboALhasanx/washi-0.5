/**
 * Default Theme Tokens — Washi MVP1
 * Editorial palette: paper/ink, sharp radius, rule dividers.
 * Mirrors tailwind.config.js and app/globals.css.
 */

export const colors = {
  paper: "#FFFCF8",
  paper2: "#F7F2EA",
  ink: "#0B1120",
  ink2: "#3A4356",
  accent: "#1E3A5F",
  accent2: "#2C517F",
  line: "#DED4C2",
  ok: "#2F5D3A",
  warn: "#8A5A20",
  err: "#7A2E2E",

  /* Shadcn compat aliases */
  background: "#FFFCF8",
  foreground: "#0B1120",
  card: "#FFFCF8",
  cardForeground: "#0B1120",
  primary: "#0B1120",
  primaryForeground: "#FFFCF8",
  secondary: "#F7F2EA",
  secondaryForeground: "#3A4356",
  muted: "#3A4356",
  mutedForeground: "#3A4356",
  accentBg: "#1E3A5F",
  accentForeground: "#FFFCF8",
  border: "#DED4C2",
  input: "#DED4C2",
  ring: "#1E3A5F",

  alert: {
    note: "#E8EDF4",
    noteForeground: "#1E3A5F",
    noteBorder: "#93B5D6",
    important: "#F5EFE0",
    importantForeground: "#8A5A20",
    importantBorder: "#D4C49A",
    warning: "#F5E0D0",
    warningForeground: "#7A2E2E",
    warningBorder: "#D4A080",
    example: "#E0F0E4",
    exampleForeground: "#2F5D3A",
    exampleBorder: "#8CBF96",
  },

  tableHeader: "#F7F2EA",
  pageHeader: "#F7F2EA",
  pageFooter: "#F7F2EA",
} as const;

export const typography = {
  fontSans: '"Source Sans 3", ui-sans-serif, system-ui, sans-serif',
  fontMono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  fontSerif: '"Newsreader", "Merriweather", ui-serif, Georgia, serif',
  fontDisplay: '"Merriweather", "Newsreader", serif',

  heading: {
    h1: {
      fontFamily: '"Merriweather", "Newsreader", serif',
      fontSize: "26pt",
      fontWeight: 900,
      lineHeight: 1.15,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontFamily: '"Merriweather", "Newsreader", serif',
      fontSize: "16pt",
      fontWeight: 700,
      lineHeight: 1.25,
      letterSpacing: "-0.01em",
    },
    h3: {
      fontFamily: '"Merriweather", "Newsreader", serif',
      fontSize: "13pt",
      fontWeight: 700,
      lineHeight: 1.35,
    },
  },
  body: {
    fontFamily: '"Newsreader", "Merriweather", ui-serif, Georgia, serif',
    fontSize: "10pt",
    lineHeight: 1.65,
    fontWeight: 400,
  },
  small: {
    fontSize: "8pt",
    lineHeight: 1.5,
    color: colors.ink2,
  },
  caption: {
    fontSize: "8pt",
    lineHeight: 1.4,
    fontStyle: "italic" as const,
    color: colors.ink2,
  },
  code: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: "8.5pt",
    lineHeight: 1.5,
  },
  ar: {
    fontFamily: '"Source Sans 3", ui-sans-serif, system-ui, sans-serif',
    lineHeight: 1.8,
    direction: "rtl" as const,
  },
} as const;

export const spacing = {
  pageMargin: "20mm",
  sectionGap: "16pt",
  cardPadding: "12pt",
  paragraphGap: "8pt",
} as const;

export const radius = {
  lg: "2px",
  md: "2px",
  sm: "2px",
  card: "2px",
} as const;

export const pagination = {
  keepTogether: "break-inside: avoid",
  headerAvoid: "break-after: avoid",
  tableHeaderGroup: "table-header-group",
  pageBreakBefore: "break-before: page",
} as const;

export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  pagination,
} as const;

export default tokens;
