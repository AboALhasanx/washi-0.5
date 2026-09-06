/**
 * lib/theme.ts
 * Studio theme: a single serializable JSON that drives BOTH the takumi PDF
 * renderer and the live HTML preview. Client-safe (no fs) — server fs lives
 * in lib/theme-server.ts.
 *
 * This is the WordPress-analog: themes are editable, savable, switchable,
 * and every part of the output (palette, fonts, page geometry, cover,
 * footer) reads from here.
 */

export interface CalloutStyle {
  bg: string;
  border: string;
  text: string;
  chip: [string, string];
}

export interface StudioTheme {
  id: string;
  name: string;
  colors: {
    paper: string;
    ink: string;
    ink2: string;
    muted: string;
    hairline: string;
    accent: string;
    accentDeep: string;
    accentSoft: string;
    surface: string;
    gold: string;
  };
  callouts: {
    note: CalloutStyle;
    important: CalloutStyle;
    warning: CalloutStyle;
    example: CalloutStyle;
    tip: CalloutStyle;
  };
  fonts: {
    body: string;
    heading: string;
    mono: string;
    bodySize: number;
    lineHeight: number;
  };
  page: {
    size: "a4" | "letter";
    background: string;
    marginTop: number;
    marginSide: number;
  };
  cover: {
    enabled: boolean;
    brand: string;
    badge: string;
    lede: string;
  };
  footer: {
    brand: string;
    tagline: string;
    showPageNumbers: boolean;
  };
}

export const DEFAULT_THEME: StudioTheme = {
  id: "default",
  name: "الورق الدافئ",
  colors: {
    paper: "#FFFCF8",
    ink: "#1C1917",
    ink2: "#57534E",
    muted: "#A8A29E",
    hairline: "#E7E5E0",
    accent: "#C2410C",
    accentDeep: "#7C2D12",
    accentSoft: "#FFF1E7",
    surface: "#F7F5F1",
    gold: "#F59E0B",
  },
  callouts: {
    note: { bg: "#F0F9FF", border: "#BAE6FD", text: "#0C4A6E", chip: ["#0284C7", "#075985"] },
    important: { bg: "#FFF7ED", border: "#FED7AA", text: "#7C2D12", chip: ["#EA580C", "#9A3412"] },
    warning: { bg: "#FEF2F2", border: "#FECACA", text: "#7F1D1D", chip: ["#DC2626", "#991B1B"] },
    example: { bg: "#FAF5FF", border: "#E9D5FF", text: "#4C1D95", chip: ["#8B5CF6", "#6D28D9"] },
    tip: { bg: "#F0FDFA", border: "#99F6E4", text: "#134E4A", chip: ["#0D9488", "#115E59"] },
  },
  fonts: {
    body: '"Noto Naskh Arabic", "Noto Sans", serif',
    heading: '"Noto Sans Arabic", "Noto Sans", sans-serif',
    mono: '"JetBrains Mono", "Noto Sans", monospace',
    bodySize: 13.5,
    lineHeight: 2.0,
  },
  page: {
    size: "a4",
    background: "#FFFCF8",
    marginTop: 56,
    marginSide: 56,
  },
  cover: {
    enabled: true,
    brand: "washi",
    badge: "ملخص أكاديمي",
    lede: "",
  },
  footer: {
    brand: "washi",
    tagline: "· ملخصات أكاديمية",
    showPageNumbers: true,
  },
};

/** Deep-merges a partial theme (from older saves or hand edits) onto the
 *  defaults, so new schema fields never break saved themes. */
export function mergeTheme(partial: any): StudioTheme {
  const t = partial ?? {};
  return {
    ...DEFAULT_THEME,
    ...t,
    colors: { ...DEFAULT_THEME.colors, ...(t.colors ?? {}) },
    callouts: {
      note: { ...DEFAULT_THEME.callouts.note, ...(t.callouts?.note ?? {}) },
      important: { ...DEFAULT_THEME.callouts.important, ...(t.callouts?.important ?? {}) },
      warning: { ...DEFAULT_THEME.callouts.warning, ...(t.callouts?.warning ?? {}) },
      example: { ...DEFAULT_THEME.callouts.example, ...(t.callouts?.example ?? {}) },
      tip: { ...DEFAULT_THEME.callouts.tip, ...(t.callouts?.tip ?? {}) },
    },
    fonts: { ...DEFAULT_THEME.fonts, ...(t.fonts ?? {}) },
    page: { ...DEFAULT_THEME.page, ...(t.page ?? {}) },
    cover: { ...DEFAULT_THEME.cover, ...(t.cover ?? {}) },
    footer: { ...DEFAULT_THEME.footer, ...(t.footer ?? {}) },
  };
}

/** Font families actually registered with the renderer — the inspector's
 *  font pickers offer exactly these. */
export const AVAILABLE_FONT_STACKS: Array<{ label: string; value: string }> = [
  { label: "نسخ — Noto Naskh Arabic (تقليدي)", value: '"Noto Naskh Arabic", "Noto Sans", serif' },
  { label: "سانس — Noto Sans Arabic (حديث)", value: '"Noto Sans Arabic", "Noto Sans", sans-serif' },
  { label: "Noto Sans (لاتيني)", value: '"Noto Sans", sans-serif' },
  { label: "JetBrains Mono (برمجي)", value: '"JetBrains Mono", "Noto Sans", monospace' },
];
