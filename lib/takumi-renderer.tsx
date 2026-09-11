/**
 * lib/takumi-renderer.tsx
 * takumi-first PDF composition: ChapterAST -> inline-styled React element tree
 * for takumi-pdf (0.14+). takumi reads inline styles (no Tailwind), so every
 * component here styles itself explicitly.
 *
 * Design system "washi editorial luxe" (v2):
 *   - full-bleed gradient cover with CSS-art orbs and glass meta cards
 *   - numbered gradient section badges + gradient rules
 *   - DefinitionCard / CalloutBox with gradient label chips
 *   - StatBars: %-valued tables render as horizontal gradient bar charts
 *   - dark-gradient table heads, zebra rows, arabic-indic page counters
 *
 * Semantic components (pdfcn-style vocabulary, owned locally):
 *   ChapterDoc, CoverSection, SectionHeading, Para, DefinitionCard, CalloutBox,
 *   StatBars, ComparisonTable, FormulaCard, CodeCard, ListBlock, SourceNote
 *
 * Pagination policy:
 *   - atomic blocks (definitions, callouts, formulas, examples) -> KeepTogether
 *   - section headings + first block glued (no orphan headings)
 *   - thead repeats on every page (takumi-pdf native)
 *   - header/footer/page numbers come from render options, not in-flow nodes
 *
 * Render environment (M3.1): theme/palette/fonts/arBodyMode are explicit
 * per-render values threaded via React context — no module-level mutable state.
 */

import React from "react";
import { AsyncLocalStorage } from "node:async_hooks";
import type { ChapterAST, AstNode } from "./schemas";
import { norm } from "./formula-svg";

// ---------------------------------------------------------------------------
// Render environment — one per render, via AsyncLocalStorage.
// Next.js API routes are Server Components: React.createContext is rejected
// in their import graph. ALS isolates concurrent renders without context.
// ---------------------------------------------------------------------------

import { StudioTheme, DEFAULT_THEME, mergeTheme } from "./theme";

export type RenderEnv = {
  theme: StudioTheme;
  palette: StudioTheme["colors"] & StudioTheme["callouts"];
  fontBody: string;
  fontHead: string;
  fontMono: string;
  arBodyMode: boolean;
};

/** Builds an immutable render environment from an optional theme and language. */
export function makeRenderEnv(themeInput?: unknown, language?: string): RenderEnv {
  const theme = themeInput ? mergeTheme(themeInput) : DEFAULT_THEME;
  return {
    theme,
    palette: { ...theme.colors, ...theme.callouts },
    fontBody: theme.fonts.body,
    fontHead: theme.fonts.heading,
    fontMono: theme.fonts.mono,
    arBodyMode: language === "ar",
  };
}

const envStorage = new AsyncLocalStorage<RenderEnv>();

/** Run `fn` with `env` bound to this async context (and nested awaits). */
export function runWithRenderEnv<T>(env: RenderEnv, fn: () => T): T {
  return envStorage.run(env, fn);
}

/** Current render env; falls back to DEFAULT_THEME outside a render. */
export function getRenderEnv(): RenderEnv {
  return envStorage.getStore() ?? makeRenderEnv(DEFAULT_THEME);
}

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const toArabicDigits = (n: number | string) =>
  String(n)
    .split("")
    .map((d) => (/\d/.test(d) ? AR_DIGITS[Number(d)] : d))
    .join("");

/** Body-text digit unification: Arabic-Indic numerals inside Arabic prose.
 *  Skips digits glued to Latin words (HTML5, T9) and never applies to LTR
 *  islands (formulas, source lines, code) which keep Western digits. */
const arabicize = (s: string, arBodyMode: boolean): string =>
  arBodyMode ? s.replace(/(?<![A-Za-z])\d+(?![A-Za-z])/g, (d) => toArabicDigits(d)) : s;

/** Subject slug -> Arabic display name (small catalog, falls back to slug). */
const SUBJECT_AR: Record<string, string> = {
  "software-engineering": "هندسة البرمجيات",
  "computer-networks": "شبكات الحاسوب",
  databases: "قواعد البيانات",
  "operating-systems": "أنظمة التشغيل",
  "artificial-intelligence": "الذكاء الاصطناعي",
};

// ---------------------------------------------------------------------------
// KeepTogether glue (single-level avoid — nested avoid makes takumi split at
// the outer boundary, re-creating the orphan-heading problem).
// glueDepth is a per-call parameter, not module state.
// ---------------------------------------------------------------------------

function KT(children: React.ReactNode, glueDepth: number): React.ReactNode {
  if (glueDepth > 0) return <>{children}</>;
  return <div style={{ breakInside: "avoid" } as React.CSSProperties}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Shared atoms
// ---------------------------------------------------------------------------

const Chip: React.FC<{ label: string; colors: [string, string]; size?: number }> = ({
  label,
  colors,
  size = 10.5,
}) => {
  const env = getRenderEnv();
  return (
    <span
      style={{
        display: "inline-block",
        background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
        color: "#FFFFFF",
        fontFamily: env.fontHead,
        fontSize: size,
        fontWeight: 700,
        lineHeight: 1,
        padding: "4px 11px",
        borderRadius: 999,
        letterSpacing: 0.2,
        flexShrink: 0,
      } as React.CSSProperties}
    >
      {label}
    </span>
  );
};

const cleanSource = (s?: string) =>
  s
    ? s
        .replace(/<!--/g, "")
        .replace(/-->/g, "")
        .replace(/^\s*source\s*:?\s*/i, "")
        .trim()
    : "";

/** Human-readable provenance line for a parsed source node. */
const sourceLine = (n: { raw?: string; document?: string; pages?: number[] }) => {
  if (n.document && n.pages?.length) {
    return `Source: ${n.document} · p. ${n.pages.join(", ")}`;
  }
  const cleaned = cleanSource(n.raw);
  return cleaned ? `Source: ${cleaned}` : "";
};

const SourceNote: React.FC<{ text: string }> = ({ text }) => {
  const env = getRenderEnv();
  return (
    <div
      style={{
        fontSize: 10,
        lineHeight: 1.6,
        color: env.palette.muted,
        fontFamily: env.fontMono,
        direction: "ltr",
        textAlign: "right",
        margin: "-2px 0 12px 0",
      } as React.CSSProperties}
    >
      {text}
    </div>
  );
};

const Para: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const env = getRenderEnv();
  return (
    <p
      style={{
        fontSize: env.theme.fonts.bodySize,
        lineHeight: env.theme.fonts.lineHeight,
        color: env.palette.ink,
        margin: "0 0 10px 0",
        textAlign: "start",
        textAlignLast: "right",
      } as React.CSSProperties}
    >
      {typeof children === "string" ? arabicize(children, env.arBodyMode) : children}
    </p>
  );
};

// ---------------------------------------------------------------------------
// Section heading — numbered gradient badge + title + gradient rule
// ---------------------------------------------------------------------------

const SectionHeading: React.FC<{ level: 2 | 3; num?: number; children: React.ReactNode }> = ({
  level,
  num,
  children,
}) => {
  const env = getRenderEnv();
  if (level === 2) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "22px 0 14px 0",
        } as React.CSSProperties}
      >
        {num !== undefined && (
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              background: `linear-gradient(135deg, ${env.palette.accent} 0%, ${env.palette.accentDeep} 100%)`,
              color: "#FFFFFF",
              fontFamily: env.fontHead,
              fontSize: 16,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            } as React.CSSProperties}
          >
            {toArabicDigits(num)}
          </span>
        )}
        <h2
          style={{
            fontFamily: env.fontHead,
            fontSize: 20,
            fontWeight: 700,
            lineHeight: 1.5,
            color: env.palette.ink,
            margin: 0,
            flexShrink: 0,
          } as React.CSSProperties}
        >
          {children}
        </h2>
        <span
          style={{
            flex: 1,
            height: 3,
            borderRadius: 999,
            background: `linear-gradient(-90deg, ${env.palette.accent} 0%, rgba(194,65,12,0.08) 100%)`,
            marginTop: 4,
          } as React.CSSProperties}
        />
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "16px 0 9px 0" } as React.CSSProperties}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${env.palette.gold}, ${env.palette.accent})`,
          flexShrink: 0,
          transform: "rotate(45deg)",
        } as React.CSSProperties}
      />
      <h3
        style={{
          fontFamily: env.fontHead,
          fontSize: 15.5,
          fontWeight: 700,
          lineHeight: 1.55,
          color: env.palette.accentDeep,
          margin: 0,
        } as React.CSSProperties}
      >
        {children}
      </h3>
    </div>
  );
};

// ---------------------------------------------------------------------------
// DefinitionCard — gradient tint, chip, accent spine (RTL: right edge)
// Plain-function builder: takes env + glueDepth; must not call hooks.
// ---------------------------------------------------------------------------

type CardEnvProps = {
  env: RenderEnv;
  glueDepth: number;
};

const DefinitionCard = ({
  term,
  definition,
  source,
  env,
  glueDepth,
}: {
  term: string;
  definition: string;
  source?: string;
} & CardEnvProps): React.ReactNode =>
  KT(
    <div
      style={{
        background: `linear-gradient(135deg, ${env.palette.accentSoft} 0%, #FFFBF7 70%)`,
        border: "1px solid #FED7AA",
        borderRight: `4px solid ${env.palette.accent}`,
        borderRadius: 12,
        padding: "13px 16px",
        margin: "0 0 10px 0",
      } as React.CSSProperties}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 } as React.CSSProperties}>
        <Chip label="تعريف" colors={[env.palette.accent, env.palette.accentDeep]} />
        <span
          style={{
            fontFamily: env.fontHead,
            fontSize: 14.5,
            fontWeight: 700,
            color: env.palette.accentDeep,
          } as React.CSSProperties}
        >
          {term}
        </span>
      </div>
      <div style={{ fontSize: 13, lineHeight: 2, color: env.palette.ink2 } as React.CSSProperties}>
        {arabicize(definition, env.arBodyMode)}
      </div>
      {source && (
        <div
          style={{
            fontSize: 10,
            color: env.palette.muted,
            marginTop: 6,
            fontFamily: env.fontMono,
            direction: "ltr",
            textAlign: "right",
          } as React.CSSProperties}
        >
          {source}
        </div>
      )}
    </div>,
    glueDepth
  );

// ---------------------------------------------------------------------------
// CalloutBox — tinted card + gradient chip per variant
// ---------------------------------------------------------------------------

const calloutLabel: Record<string, string> = {
  note: "ملاحظة",
  important: "مهم",
  warning: "تحذير",
  example: "مثال",
  tip: "نصيحة",
};

const CalloutBox = ({
  variant,
  content,
  source,
  env,
  glueDepth,
}: {
  variant: string;
  content: string;
  source?: string;
} & CardEnvProps): React.ReactNode => {
  const v = env.palette[(variant || "note").toLowerCase() as keyof typeof env.palette] as
    | { bg: string; border: string; text: string; chip: [string, string] }
    | undefined;
  const c = v ?? env.palette.note;
  const label = calloutLabel[(variant || "note").toLowerCase()] ?? variant.toUpperCase();
  const lines = content
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  return KT(
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRight: `4px solid ${c.chip[0]}`,
        borderRadius: 12,
        padding: "13px 16px",
        margin: "0 0 10px 0",
      } as React.CSSProperties}
    >
      <div style={{ marginBottom: lines.length > 1 ? 9 : 6 } as React.CSSProperties}>
        <Chip label={label} colors={c.chip as [string, string]} />
      </div>
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 9,
            fontSize: 13,
            lineHeight: 1.95,
            color: c.text,
            marginBottom: i < lines.length - 1 ? 7 : 0,
          } as React.CSSProperties}
        >
          {lines.length > 1 && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: c.chip[0],
                flexShrink: 0,
                marginTop: 11,
              } as React.CSSProperties}
            />
          )}
          <span style={{ flex: 1 } as React.CSSProperties}>{arabicize(line, env.arBodyMode)}</span>
        </div>
      ))}
      {source && (
        <div
          style={{
            fontSize: 10,
            color: env.palette.muted,
            marginTop: 7,
            fontFamily: env.fontMono,
            direction: "ltr",
            textAlign: "right",
          } as React.CSSProperties}
        >
          {source}
        </div>
      )}
    </div>,
    glueDepth
  );
};

// ---------------------------------------------------------------------------
// StatBars — tables whose values are percentages render as gradient bars
// ---------------------------------------------------------------------------

const isPct = (s: string) => /^\s*\d+(\.\d+)?\s*%\s*$/.test(s);

// StatBars is intentionally multi-row: each row is its own breakInside:avoid
// unit so long %-tables can split across pages. Wrapping the whole chart in
// KT() would force a single atomic block — so it does NOT take glueDepth.
const StatBars = ({
  headers,
  rows,
  source,
  env,
}: {
  headers: string[];
  rows: string[][];
  source?: string;
} & Omit<CardEnvProps, "glueDepth">): React.ReactNode => {
  // find the column holding the percentages (first column with any % cell)
  let pctCol = -1;
  for (let c = 0; c < headers.length; c++) {
    if (rows.some((r) => r[c] !== undefined && isPct(r[c]))) {
      pctCol = c;
      break;
    }
  }
  if (pctCol < 0) return null;
  const pcts = rows.map((r) => parseFloat((r[pctCol] ?? "0").replace(/[^\d.]/g, "")) || 0);
  const max = Math.max(...pcts, 1);

  return (
    <div style={{ margin: "6px 0 14px 0" } as React.CSSProperties}>
      {rows.map((row, ri) => {
        const label = row[0] ?? "";
        const pct = pcts[ri];
        const note = row.filter((_, c) => c !== 0 && c !== pctCol).join(" · ");
        const widthPct = Math.round((pct / max) * 100);
        return (
          <div
            key={ri}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 11,
              breakInside: "avoid",
            } as React.CSSProperties}
          >
            <div style={{ width: "42%", flexShrink: 0 } as React.CSSProperties}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: env.fontHead,
                  color: env.palette.ink,
                  lineHeight: 1.6,
                } as React.CSSProperties}
              >
                {label}
              </div>
              {note && (
                <div style={{ fontSize: 10.5, color: env.palette.muted, lineHeight: 1.6 } as React.CSSProperties}>
                  {note}
                </div>
              )}
            </div>
            <div
              style={{
                flex: 1,
                height: 20,
                background: "#F3F1EC",
                borderRadius: 999,
                overflow: "hidden",
              } as React.CSSProperties}
            >
              <div
                style={{
                  width: `${widthPct}%`,
                  height: 20,
                  borderRadius: 999,
                  background: `linear-gradient(-90deg, ${env.palette.gold} 0%, ${env.palette.accent} 55%, ${env.palette.accentDeep} 100%)`,
                } as React.CSSProperties}
              />
            </div>
            <div
              style={{
                width: 44,
                textAlign: "center",
                fontFamily: env.fontHead,
                fontSize: 14,
                fontWeight: 700,
                color: env.palette.accentDeep,
                flexShrink: 0,
              } as React.CSSProperties}
            >
              {toArabicDigits(pct)}٪
            </div>
          </div>
        );
      })}
      {source && <SourceNote text={source} />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ComparisonTable — dark gradient head, zebra body, RTL aware
// ---------------------------------------------------------------------------

const ComparisonTable = ({
  headers,
  rows,
  caption,
  source,
  env,
  glueDepth,
}: {
  headers: string[];
  rows: string[][];
  caption?: string;
  source?: string;
} & CardEnvProps): React.ReactNode =>
  KT(
    <>
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          margin: "4px 0 8px 0",
          fontSize: 12.5,
        } as React.CSSProperties}
      >
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                style={{
                  background: `linear-gradient(135deg, ${env.palette.ink} 0%, #44403C 100%)`,
                  color: "#FFFBF5",
                  fontFamily: env.fontHead,
                  fontWeight: 700,
                  fontSize: 12.5,
                  textAlign: "start",
                  padding: "9px 13px",
                  borderTopRightRadius: i === 0 ? 10 : 0,
                  borderTopLeftRadius: i === headers.length - 1 ? 10 : 0,
                } as React.CSSProperties}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ breakInside: "avoid" } as React.CSSProperties}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    color: ci === 0 ? env.palette.ink : env.palette.ink2,
                    fontWeight: ci === 0 ? 700 : 400,
                    textAlign: "start",
                    padding: "9px 13px",
                    borderBottom: "1px solid #EEECE8",
                    background: ri % 2 === 0 ? "#FFFFFF" : "#FAF9F6",
                  lineHeight: 1.85,
                } as React.CSSProperties}
              >
                {arabicize(cell, env.arBodyMode)}
              </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {caption && (
        <div style={{ fontSize: 11, color: env.palette.muted, marginBottom: 8 } as React.CSSProperties}>
          {caption}
        </div>
      )}
      {source && <SourceNote text={source} />}
    </>,
    glueDepth
  );

// ---------------------------------------------------------------------------
// FormulaCard — cool-tinted math card with chip
// ---------------------------------------------------------------------------

/** LaTeX-lite: render simple sub/superscripts and common operators as styled
 *  spans (verified working in takumi). Complex LaTeX stays verbatim — the
 *  full KaTeX pipeline is an open experiment. */
function latexToSpans(latex: string): React.ReactNode[] {
  const text = latex
    .replace(/\\times/g, " × ")
    .replace(/\\cdot/g, " · ")
    .replace(/\\pm/g, "±")
    .replace(/\\approx/g, " ≈ ")
    .replace(/\\ll/g, " ≪ ")
    .replace(/\\gg/g, " ≫ ")
    .replace(/\\%/g, "%")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\mathrm\{([^}]*)\}/g, "$1")
    .replace(/\\\\/g, "\n")
    .replace(/\\[, !]/g, " ");
  const out: React.ReactNode[] = [];
  const re = /([_^])\{([^}]*)\}|([_^])(\w)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const kind = m[1] ?? m[3];
    const val = m[2] ?? m[4];
    out.push(
      <span
        key={k++}
        style={
          {
            fontSize: "65%",
            verticalAlign: kind === "_" ? "sub" : "super",
          } as React.CSSProperties
        }
      >
        {val}
      </span>
    );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Registered MathJax SVG art for formulas, keyed by normalized LaTeX.
 *  Formulas absent from the map fall back to the LaTeX-lite text card. */
export type FormulaArtMap = Map<string, { src: string; width: number; height: number }>;

/** Compact inline math (displayMode=false). No card chrome — sits in text flow. */
const InlineFormula = ({
  latex,
  art,
  env,
}: {
  latex: string;
  art?: { src: string; width: number; height: number };
  env: RenderEnv;
}): React.ReactNode => {
  if (art) {
    return (
      <span
        style={
          {
            display: "inline-block",
            verticalAlign: "middle",
            direction: "ltr",
            margin: "0 2px",
          } as React.CSSProperties
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={art.src}
          width={art.width}
          height={art.height}
          style={{ width: art.width, height: art.height } as React.CSSProperties}
        />
      </span>
    );
  }
  return (
    <span
      dir="ltr"
      style={
        {
          fontFamily: env.fontMono,
          fontSize: "0.95em",
          color: env.palette.ink,
          padding: "0 3px",
          unicodeBidi: "isolate",
        } as React.CSSProperties
      }
    >
      {latexToSpans(latex.trim())}
    </span>
  );
};

const FormulaCard = ({
  latex,
  caption,
  source,
  art,
  env,
  glueDepth,
}: {
  latex: string;
  caption?: string;
  source?: string;
  art?: { src: string; width: number; height: number };
} & CardEnvProps): React.ReactNode =>
  KT(
    <div style={{ margin: "0 0 10px 0" } as React.CSSProperties}>
    <div
      style={{
        background: "linear-gradient(135deg, #F8FAFC 0%, #FDFDFB 60%)",
        border: "1px solid #E2E8F0",
        borderRight: `4px solid #0F766E`,
        borderRadius: 12,
        padding: "14px 18px",
      } as React.CSSProperties}
    >
      <div style={{ marginBottom: 10 } as React.CSSProperties}>
        <Chip label="معادلة" colors={["#0D9488", "#115E59"]} />
      </div>
      {art ? (
        // MathJax SVG — real typeset math as vector paths via resvg.
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            direction: "ltr",
            padding: "2px 0 4px 0",
          } as React.CSSProperties}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={art.src}
            width={art.width}
            height={art.height}
            style={{ width: art.width, height: art.height } as React.CSSProperties}
          />
        </div>
      ) : (
        <div
          style={{
            fontFamily: env.fontMono,
            fontSize: 13.5,
            lineHeight: 1.9,
            color: env.palette.ink,
            direction: "ltr",
            textAlign: "center",
            whiteSpace: "pre-wrap",
          } as React.CSSProperties}
        >
          {latexToSpans(latex.trim())}
        </div>
      )}
      {caption && (
        <div
          style={{
            fontSize: 12.5,
            lineHeight: 1.95,
            color: env.palette.ink2,
            marginTop: 10,
            paddingTop: 9,
            borderTop: "1px dashed #E2E8F0",
          } as React.CSSProperties}
        >
          {caption}
        </div>
      )}
      </div>
      {source && (
        <SourceNote text={source} />
      )}
    </div>,
    glueDepth
  );

// ---------------------------------------------------------------------------
// CodeCard — dark editor card
// ---------------------------------------------------------------------------

const CodeCard = ({
  code,
  language,
  source,
  env,
  glueDepth,
}: {
  code: string;
  language?: string;
  source?: string;
} & CardEnvProps): React.ReactNode =>
  KT(
    <div
      style={{
        // Light editor card — same card family as FormulaCard (no black boxes)
        background: env.palette.surface,
        border: "1px solid #E2E8F0",
        borderRight: `4px solid ${env.palette.accent}`,
        borderRadius: 12,
        padding: "13px 17px",
        margin: "0 0 10px 0",
      } as React.CSSProperties}
    >
      {language && (
        <div style={{ marginBottom: 8 } as React.CSSProperties}>
          <span
            style={{
              fontFamily: env.fontMono,
              fontSize: 10,
              fontWeight: 700,
              color: env.palette.accentDeep,
              background: env.palette.accentSoft,
              border: `1px solid ${env.palette.accent}55`,
              borderRadius: 6,
              padding: "2px 9px",
              direction: "ltr",
            } as React.CSSProperties}
          >
            {language.toUpperCase()}
          </span>
        </div>
      )}
      <div
        style={{
          fontFamily: env.fontMono,
          fontSize: 11.5,
          lineHeight: 1.75,
          color: env.palette.ink,
          direction: "ltr",
          textAlign: "left",
          whiteSpace: "pre-wrap",
        } as React.CSSProperties}
      >
        {code}
      </div>
      {source && (
        <div
          style={{ fontSize: 10, color: env.palette.muted, marginTop: 6, direction: "ltr", textAlign: "left" } as React.CSSProperties}
        >
          {source}
        </div>
      )}
    </div>,
    glueDepth
  );

// ---------------------------------------------------------------------------
// ListBlock — gradient circle chips (ordered/key-points) or styled bullets
// ---------------------------------------------------------------------------

/** Split item text on $latex$ segments for compact inline math in lists. */
function renderItemText(text: string, env: RenderEnv): React.ReactNode[] {
  if (!text.includes("$")) return [arabicize(text, env.arBodyMode)];
  const parts: React.ReactNode[] = [];
  const re = /\$([^$]+)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(arabicize(text.slice(last, m.index), env.arBodyMode));
    parts.push(
      <InlineFormula key={`li-${k++}`} latex={m[1].trim()} env={env} />
    );
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(arabicize(text.slice(last), env.arBodyMode));
  return parts;
}

const ListBlock: React.FC<{
  items: string[];
  ordered?: boolean;
  start?: number;
  variant?: "plain" | "review";
}> = ({ items, ordered, start = 1, variant = "plain" }) => {
  const env = getRenderEnv();
  return (
    <div style={{ margin: "2px 0 12px 0" } as React.CSSProperties}>
      {items.map((item, i) => {
        const num = toArabicDigits(start + i);
        const chip =
          variant === "review" ? (
            <span
              style={{
                minWidth: 26,
                height: 26,
                borderRadius: 9,
                border: `1.5px solid ${env.palette.accent}`,
                background: env.palette.accentSoft,
                color: env.palette.accentDeep,
                fontFamily: env.fontHead,
                fontWeight: 700,
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 3,
                padding: "0 4px",
              } as React.CSSProperties}
            >
              {num}
            </span>
          ) : ordered ? (
            <span
              style={{
                minWidth: 22,
                height: 22,
                borderRadius: 999,
                background: `linear-gradient(135deg, ${env.palette.accent}, ${env.palette.accentDeep})`,
                color: "#FFFFFF",
                fontFamily: env.fontHead,
                fontWeight: 700,
                fontSize: 10.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 4,
                padding: "0 4px",
              } as React.CSSProperties}
            >
              {num}
            </span>
          ) : (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${env.palette.gold}, ${env.palette.accent})`,
                transform: "rotate(45deg)",
                flexShrink: 0,
                marginTop: 12,
              } as React.CSSProperties}
            />
          );
        return (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 11,
              marginBottom: 9,
              fontSize: 13.5,
              lineHeight: 2,
              color: env.palette.ink,
              breakInside: "avoid",
            } as React.CSSProperties}
          >
            {chip}
            <span style={{ flex: 1 } as React.CSSProperties}>{renderItemText(item, env)}</span>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Node dispatch (composition table: AST type -> component)
// Plain function (not JSX): takes env + glueDepth; must not call hooks.
// ---------------------------------------------------------------------------

function RenderNode({
  node,
  formulaArt,
  env,
  glueDepth,
}: {
  node: AstNode;
  formulaArt?: FormulaArtMap;
  env: RenderEnv;
  glueDepth: number;
}): React.ReactNode {
  const n = node as any;
  switch (n.type) {
    case "heading":
      return n.level === 3 ? (
        <SectionHeading level={3}>{n.text}</SectionHeading>
      ) : n.level === 2 ? null : (
        <SectionHeading level={2}>{n.text}</SectionHeading>
      );
    case "paragraph":
      return <Para>{n.text}</Para>;
    // KT-bearing builders are invoked as plain functions (with explicit env +
    // glueDepth) so they must not call hooks.
    case "definition":
      return DefinitionCard({
        term: n.term,
        definition: n.definition,
        source: n.source,
        env,
        glueDepth,
      });
    case "callout":
      return CalloutBox({
        variant: n.variant,
        content: n.content,
        source: n.source,
        env,
        glueDepth,
      });
    case "formula": {
      const art = formulaArt?.get(norm(n.latex ?? ""));
      // displayMode=false → compact inline (P1); true/undefined → display card
      if (n.displayMode === false) {
        return InlineFormula({ latex: n.latex, art, env });
      }
      return FormulaCard({
        latex: n.latex,
        caption: n.caption,
        source: n.source,
        art,
        env,
        glueDepth,
      });
    }
    case "table": {
      const hasPct = n.rows?.some((r: string[]) => r.some((c: string) => isPct(c ?? "")));
      if (hasPct) {
        return StatBars({ headers: n.headers, rows: n.rows, source: n.source, env });
      }
      return ComparisonTable({
        headers: n.headers,
        rows: n.rows,
        caption: n.caption,
        source: n.source,
        env,
        glueDepth,
      });
    }
    case "code":
      return CodeCard({
        code: n.code,
        language: n.language,
        source: n.source,
        env,
        glueDepth,
      });
    case "list":
      return <ListBlock items={n.items} ordered={n.ordered} start={n.start ?? 1} />;
    case "source": {
      const text = sourceLine(n);
      return text ? <SourceNote text={text} /> : null;
    }
    case "figure":
      // v1: figures deferred (placeholder extraction is TODO upstream)
      return KT(
        <div
          style={{
            border: `1.5px dashed ${env.palette.hairline}`,
            borderRadius: 12,
            padding: 16,
            margin: "0 0 10px 0",
            fontSize: 12,
            color: env.palette.muted,
            textAlign: "center",
            background: "#FDFCFA",
          } as React.CSSProperties}
        >
          {n.caption || "شكل غير متاح في هذه النسخة"}
        </div>,
        glueDepth
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Cover — full-page gradient, CSS-art orbs, glass meta cards
// ---------------------------------------------------------------------------

const Orb: React.FC<{ size: number; x: string; y: string; opacity?: number; ring?: boolean }> = ({
  size,
  x,
  y,
  opacity = 0.16,
  ring = false,
}) => (
  <div
    style={{
      position: "absolute",
      top: y,
      [x.startsWith("right") ? "right" : "left"]: x.replace(/^(left|right):\s*/, ""),
      width: size,
      height: size,
      borderRadius: 999,
      opacity,
      ...(ring
        ? { border: "1.5px solid #FFFFFF" }
        : {
            background:
              "radial-gradient(circle at 32% 32%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.18) 45%, rgba(255,255,255,0) 72%)",
          }),
      pointerEvents: "none",
    } as React.CSSProperties}
  />
);

function CoverSection({
  ast,
  sectionsCount,
  height = 946,
}: {
  ast: ChapterAST;
  sectionsCount: number;
  height?: number;
}) {
  const env = getRenderEnv();
  const { frontmatter } = ast;
  const pages = frontmatter.sources[0]?.pages ?? [];
  const pagesLabel = pages.length
    ? `${toArabicDigits(pages[0])} – ${toArabicDigits(pages[pages.length - 1])}`
    : "—";
  const subjectAr = SUBJECT_AR[frontmatter.subject] ?? frontmatter.subject;
  const docs = frontmatter.sources.map((s: any) => s.document).filter(Boolean) as string[];
  // Cover cards are narrow — a long filename clips. First document + count.
  const sourceLabel = docs.length ? docs[0] + (docs.length > 1 ? ` +${docs.length - 1}` : "") : "—";
  const coverMetaLine = [
    docs[0] ? docs[0].toUpperCase() : null,
    String(frontmatter.subject ?? "").toUpperCase(),
    frontmatter.sources[0]?.pages?.length ? `PP. ${frontmatter.sources[0].pages[0]}–${frontmatter.sources[0].pages[frontmatter.sources[0].pages.length - 1]}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const brand = env.theme.cover.brand;
  const badge = env.theme.cover.badge;
  const lede =
    env.theme.cover.lede?.trim() ||
    `ملخص مركّز بالعربية للفصل «${frontmatter.title}» مع الحفاظ على المصطلحات الأصلية — جاهز للمراجعة والطباعة.`;

  return (
    <div style={{ breakAfter: "page" } as React.CSSProperties}>
      <div
        style={{
          height,
          borderRadius: 22,
          background:
            "linear-gradient(150deg, #292524 0%, #7C2D12 52%, #C2410C 100%)",
          position: "relative",
          overflow: "hidden",
          padding: "44px 48px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        } as React.CSSProperties}
      >
        {/* decorative shapes */}
        <Orb size={260} x="left: -70px" y="-80px" opacity={0.14} />
        <Orb size={130} x="right: 90px" y="70px" opacity={0.12} />
        <Orb size={330} x="right: -110px" y="330px" opacity={0.1} />
        <Orb size={210} x="left: 60px" y="700px" opacity={0.1} ring />
        <Orb size={90} x="right: 240px" y="820px" opacity={0.2} ring />

        {/* top row: brand + badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" } as React.CSSProperties}>
          <div
            style={{
              fontFamily: env.fontHead,
              fontSize: 15,
              fontWeight: 700,
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              gap: 8,
            } as React.CSSProperties}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: `linear-gradient(135deg, #FDE68A, ${env.palette.gold})`,
                transform: "rotate(45deg)",
              } as React.CSSProperties}
            />
            {brand}
          </div>
          <span
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.28)",
              color: "#FFFFFF",
              fontFamily: env.fontHead,
              fontSize: 11,
              fontWeight: 700,
              padding: "6px 14px",
              borderRadius: 999,
            } as React.CSSProperties}
          >
            {badge}
          </span>
        </div>

        {/* middle: subject, title, rule, lede */}
        <div>
          <span
            style={{
              display: "inline-block",
              background: "rgba(253,230,138,0.16)",
              border: "1px solid rgba(253,230,138,0.4)",
              color: "#FDE68A",
              fontFamily: env.fontHead,
              fontSize: 12.5,
              fontWeight: 700,
              padding: "5px 14px",
              borderRadius: 999,
              marginBottom: 18,
            } as React.CSSProperties}
          >
            {subjectAr}
          </span>
          <h1
            style={{
              fontFamily: env.fontHead,
              fontSize: 46,
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.55,
              margin: "0 0 2px 0",
            } as React.CSSProperties}
          >
            {frontmatter.title}
          </h1>
          <div
            style={{
              fontFamily: env.fontMono,
              fontSize: 12.5,
              color: "rgba(255,255,255,0.62)",
              direction: "ltr",
              textAlign: "right",
              letterSpacing: 1.5,
              margin: "8px 0 20px 0",
            } as React.CSSProperties}
          >
            {coverMetaLine}
          </div>
          <div
            style={{
              width: 74,
              height: 5,
              borderRadius: 999,
              background: `linear-gradient(90deg, #FDE68A, ${env.palette.gold})`,
              marginBottom: 22,
            } as React.CSSProperties}
          />
          <div
            style={{
              fontSize: 14.5,
              lineHeight: 2.1,
              color: "rgba(255,255,255,0.88)",
              maxWidth: 500,
            } as React.CSSProperties}
          >
            {lede}
          </div>
        </div>

        {/* bottom: glass meta cards + credit */}
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 20 } as React.CSSProperties}>
            {[
              ["المصدر", sourceLabel],
              ["الصفحات", pagesLabel],
              ["الأقسام", `${toArabicDigits(sectionsCount)} أقسام`],
            ].map(([k, v], i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  borderRadius: 14,
                  padding: "11px 15px",
                } as React.CSSProperties}
              >
                <div
                  style={{
                    fontFamily: env.fontHead,
                    fontSize: 10.5,
                    color: "rgba(255,255,255,0.6)",
                    marginBottom: 4,
                  } as React.CSSProperties}
                >
                  {k}
                </div>
                <div
                  style={{
                    fontFamily: env.fontHead,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    lineHeight: 1.6,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                  } as React.CSSProperties}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: env.fontMono,
              fontSize: 10.5,
              color: "rgba(255,255,255,0.5)",
              direction: "ltr",
            } as React.CSSProperties}
          >
            <span>{env.theme.cover.brand} · takumi-pdf engine</span>
            <span>generated {new Date().toISOString().slice(0, 10)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Document root + page chrome builders (exported for render options)
// ---------------------------------------------------------------------------

export function ChapterDoc({
  ast,
  coverHeight,
  formulaArt,
}: {
  ast: ChapterAST;
  coverHeight?: number;
  formulaArt?: FormulaArtMap;
}) {
  const env = getRenderEnv();
  const { frontmatter, sections } = ast;
  const isAr = frontmatter.language === "ar";

  return (
    <div
      style={{
        fontFamily: env.fontBody,
        color: env.palette.ink,
        background: env.palette.paper,
        direction: (isAr ? "rtl" : "ltr") as "rtl" | "ltr",
        fontSize: env.theme.fonts.bodySize,
      } as React.CSSProperties}
    >
      {env.theme.cover.enabled && (
        <CoverSection ast={ast} sectionsCount={sections.length} height={coverHeight} />
      )}

      {/* Sections */}
      {sections.map((sec, idx) => (
        <section key={idx}>
          <SectionBody sec={sec} num={idx + 1} formulaArt={formulaArt} />
        </section>
      ))}
    </div>
  );
}

/** Renders one section as a stream of atomic "block + provenance" units.
 *  Glue rules (all single-level avoid — nested avoid makes takumi split at
 *  the outer boundary, re-creating orphans):
 *    - section h2 + first block + its sources  (no orphan section heading)
 *    - h3 + its first following block + sources (no orphan subsection)
 *    - every block + its trailing source nodes  (no stranded Source line)
 *  SectionBody opens the glue window by passing glueDepth=1 to RenderNode /
 *  plain builders so nested KT() stays bare. */
function SectionBody({
  sec,
  num,
  formulaArt,
}: {
  sec: ChapterAST["sections"][number];
  num: number;
  formulaArt?: FormulaArtMap;
}) {
  const env = getRenderEnv();
  // The parser re-emits the section's h2 as a node inside nodes[] — drop
  // those duplicates so glue binds the real first block.
  const nodes = (sec.nodes as any[]).filter(
    (n) => !(n.type === "heading" && n.level === 2)
  );

  const blocks: Array<{ node: any; sources: any[] }> = [];
  for (let i = 0; i < nodes.length; ) {
    const n = nodes[i];
    if (n.type === "source") {
      blocks.push({ node: null, sources: [n] });
      i += 1;
      continue;
    }
    const sources: any[] = [];
    let j = i + 1;
    while (j < nodes.length && nodes[j].type === "source") {
      sources.push(nodes[j]);
      j += 1;
    }
    blocks.push({ node: n, sources });
    i = j;
  }

  const sourceSpans = (sources: any[]) =>
    sources.map((s, k) => <SourceNote key={k} text={sourceLine(s)} />);

  // Builds the avoid-wrapper. Children are created eagerly so the outer div
  // owns the page-break; nested KT is bare via glueDepth=1.
  const renderGlued = (children: React.ReactNode, sources: any[], key: React.Key) => (
    <div key={key} style={{ breakInside: "avoid" } as React.CSSProperties}>
      {children}
      {sourceSpans(sources)}
    </div>
  );

  const isReview = sec.name === "review";
  const GLUE = 1;
  const renderNode = (node: any) =>
    RenderNode({ node, formulaArt, env, glueDepth: GLUE });

  const parts: React.ReactNode[] = [];
  const headingEl = <SectionHeading level={2} num={num}>{sec.heading}</SectionHeading>;

  let start = 0;
  const first = blocks[0];
  if (first && first.node && first.node.type !== "heading") {
    parts.push(
      renderGlued(
        <>
          {headingEl}
          {renderNode(first.node)}
        </>,
        first.sources,
        "lead"
      )
    );
    start = 1;
  } else {
    parts.push(<React.Fragment key="lead">{headingEl}</React.Fragment>);
  }

  let b = start;
  while (b < blocks.length) {
    const blk = blocks[b];
    const node = blk.node;
    if (node && node.type === "heading" && node.level === 3) {
      const next = blocks[b + 1];
      if (next && next.node && next.node.type !== "heading") {
        parts.push(
          renderGlued(
            <>
              {renderNode(node)}
              {renderNode(next.node)}
            </>,
            next.sources,
            b
          )
        );
        b += 2;
        continue;
      }
    }
    // review sections render their lists with question chips
    if (node && node.type === "list" && isReview) {
      parts.push(
        renderGlued(
          <ListBlock items={(node as any).items} ordered={(node as any).ordered} start={(node as any).start ?? 1} variant="review" />,
          blk.sources,
          b
        )
      );
      b += 1;
      continue;
    }
    if (!node) {
      parts.push(<React.Fragment key={b}>{sourceSpans(blk.sources)}</React.Fragment>);
    } else {
      parts.push(renderGlued(renderNode(node), blk.sources, b));
    }
    b += 1;
  }
  return <>{parts}</>;
}

/** Repeating band for the top of every page (passed via render options). */
export function PageHeaderBand({ ast }: { ast: ChapterAST }) {
  const env = getRenderEnv();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        fontFamily: env.fontHead,
        fontSize: 10,
        color: env.palette.ink2,
        borderBottom: "1px solid #EEECE8",
        paddingBottom: 7,
        direction: "rtl",
      } as React.CSSProperties}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 7 } as React.CSSProperties}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${env.palette.gold}, ${env.palette.accent})`,
            transform: "rotate(45deg)",
          } as React.CSSProperties}
        />
        <span style={{ fontWeight: 700, color: env.palette.ink } as React.CSSProperties}>
          {ast.frontmatter.title}
        </span>
      </span>
      <span style={{ fontFamily: env.fontMono, fontSize: 9.5, color: env.palette.muted } as React.CSSProperties}>
        {SUBJECT_AR[ast.frontmatter.subject] ?? ast.frontmatter.subject}
      </span>
    </div>
  );
}

export interface PageFooterBandProps {
  ast: ChapterAST;
}

/**
 * Repeating band for the bottom of every page, with takumi page counters.
 * takumi fills any node carrying the `pageNumber` / `totalPages` class with
 * the counter text; the `arabic-indic` counter-style class formats it ١٢٣.
 */
export function PageFooterBand({ ast }: PageFooterBandProps) {
  const env = getRenderEnv();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        fontFamily: env.fontHead,
        fontSize: 10,
        color: env.palette.muted,
        borderTop: "1px solid #EEECE8",
        paddingTop: 7,
        direction: "rtl",
      } as React.CSSProperties}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 7 } as React.CSSProperties}>
        <span
          style={{
            fontFamily: env.fontHead,
            fontWeight: 700,
            fontSize: 11,
            color: env.palette.accent,
          } as React.CSSProperties}
        >
          {env.theme.footer.brand}
        </span>
        {env.theme.footer.tagline && <span>{env.theme.footer.tagline}</span>}
      </span>
      {env.theme.footer.showPageNumbers ? (
        <span>
          صفحة <span className="pageNumber arabic-indic">٠</span> من{" "}
          <span className="totalPages arabic-indic">٠</span>
        </span>
      ) : (
        <span />
      )}
    </div>
  );
}

/** Base CSS applied before layout (pagination + table policy).
 *  NOTE: takumi-pdf only honors break-before/after: page|always|left|right and
 *  break-inside: avoid — "avoid" is NOT a valid break-after value there.
 *  Heading keep-with-next is emulated by KeepTogether(heading + first node). */
export const baseCss = `
  .keep-together { break-inside: avoid; }
  thead { display: table-header-group; }
  p { orphans: 3; widows: 3; }
  table { border-collapse: separate; }
  td { vertical-align: top; }
`;
