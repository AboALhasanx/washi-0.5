"use client";

/**
 * components/studio/LivePreview.tsx
 * Live HTML mirror of the PDF document, driven by the same StudioTheme JSON
 * the takumi renderer consumes. Not pixel-identical to takumi's output, but
 * structurally and chromatically faithful — the Canva-style editing loop:
 * edit markdown / tweak the theme → the sheet updates instantly.
 */

import * as React from "react";
import { Logo } from "@/components/studio/Logo";
import type { StudioTheme } from "@/lib/theme";

type AstNode = any;
type Ast = { frontmatter: any; sections: Array<{ heading: string; name: string; nodes: AstNode[]; source?: string }> };

const SUBJECT_AR: Record<string, string> = {
  "software-engineering": "هندسة البرمجيات",
  "computer-networks": "شبكات الحاسوب",
  databases: "قواعد البيانات",
  "operating-systems": "أنظمة التشغيل",
  "artificial-intelligence": "الذكاء الاصطناعي",
};

const AR = "٠١٢٣٤٥٦٧٨٩";
const toAr = (n: number | string) =>
  String(n).split("").map((d) => (/\d/.test(d) ? AR[Number(d)] : d)).join("");
const arabicize = (s: string) => s.replace(/(?<![A-Za-z])\d+(?![A-Za-z])/g, (d) => toAr(d));

function Chip({ label, colors }: { label: string; colors: [string, string] }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
        color: "#fff",
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1,
        padding: "4px 11px",
        borderRadius: 999,
        fontFamily: '"Noto Sans Arabic", sans-serif',
      }}
    >
      {label}
    </span>
  );
}

function PreviewNode({ node, theme }: { node: AstNode; theme: StudioTheme }) {
  const n = node;
  switch (n.type) {
    case "heading":
      return n.level === 2 ? null : (
        <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "16px 0 9px 0" }}>
          <span
            style={{
              width: 8, height: 8, borderRadius: 3, flexShrink: 0, transform: "rotate(45deg)",
              background: `linear-gradient(135deg, ${theme.colors.gold}, ${theme.colors.accent})`,
            }}
          />
          <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: theme.colors.accentDeep, fontFamily: theme.fonts.heading }}>
            {n.text}
          </h3>
        </div>
      );
    case "paragraph":
      return (
        <p style={{ fontSize: theme.fonts.bodySize, lineHeight: theme.fonts.lineHeight, color: theme.colors.ink, margin: "0 0 10px 0" }}>
          {arabicize(n.text)}
        </p>
      );
    case "definition":
      return (
        <div
          style={{
            background: `linear-gradient(135deg, ${theme.colors.accentSoft} 0%, #FFFBF7 70%)`,
            border: "1px solid #FED7AA",
            borderRight: `4px solid ${theme.colors.accent}`,
            borderRadius: 12,
            padding: "13px 16px",
            margin: "0 0 10px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Chip label="تعريف" colors={[theme.colors.accent, theme.colors.accentDeep]} />
            <b style={{ fontSize: 14.5, color: theme.colors.accentDeep, fontFamily: theme.fonts.heading }}>{n.term}</b>
          </div>
          <div style={{ fontSize: 13, lineHeight: 2, color: theme.colors.ink2 }}>{arabicize(n.definition)}</div>
        </div>
      );
    case "callout": {
      const v = n.variant?.toLowerCase?.() ?? "note";
      const c = (theme.callouts as any)[v] ?? theme.callouts.note;
      const labels: Record<string, string> = { note: "ملاحظة", important: "مهم", warning: "تحذير", example: "مثال", tip: "نصيحة" };
      return (
        <div
          style={{
            background: c.bg, border: `1px solid ${c.border}`, borderRight: `4px solid ${c.chip[0]}`,
            borderRadius: 12, padding: "13px 16px", margin: "0 0 10px 0",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <Chip label={labels[v] ?? v.toUpperCase()} colors={c.chip} />
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.95, color: c.text, whiteSpace: "pre-wrap" }}>
            {arabicize(n.content)}
          </div>
        </div>
      );
    }
    case "formula":
      return (
        <div
          style={{
            background: "linear-gradient(135deg, #F8FAFC 0%, #FDFDFB 60%)",
            border: "1px solid #E2E8F0", borderRight: "4px solid #0F766E", borderRadius: 12,
            padding: "14px 18px", margin: "0 0 10px 0",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <Chip label="معادلة" colors={["#0D9488", "#115E59"]} />
          </div>
          <code style={{ fontFamily: theme.fonts.mono, fontSize: 13, direction: "ltr", display: "block", textAlign: "center" }}>
            {n.latex?.trim()}
          </code>
          {n.caption && <div style={{ fontSize: 12.5, color: theme.colors.ink2, marginTop: 8 }}>{arabicize(n.caption)}</div>}
        </div>
      );
    case "table":
      return (
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12.5, margin: "4px 0 10px 0" }}>
          <thead>
            <tr>
              {n.headers.map((h: string, i: number) => (
                <th
                  key={i}
                  style={{
                    background: `linear-gradient(135deg, ${theme.colors.ink} 0%, #44403C 100%)`, color: "#FFFBF5",
                    textAlign: "start", padding: "9px 13px", fontFamily: theme.fonts.heading,
                    borderTopRightRadius: i === 0 ? 10 : 0, borderTopLeftRadius: i === n.headers.length - 1 ? 10 : 0,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {n.rows.map((row: string[], ri: number) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    style={{
                      color: ci === 0 ? theme.colors.ink : theme.colors.ink2, fontWeight: ci === 0 ? 700 : 400,
                      textAlign: "start", padding: "9px 13px", borderBottom: "1px solid #EEECE8",
                      background: ri % 2 === 0 ? "#FFFFFF" : "#FAF9F6", lineHeight: 1.85,
                    }}
                  >
                    {arabicize(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "list":
      return (
        <div style={{ margin: "2px 0 12px 0" }}>
          {n.items.map((item: string, i: number) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, fontSize: 13.5, lineHeight: 2 }}>
              <span style={{ fontWeight: 700, color: theme.colors.accent, minWidth: 20 }}>
                {n.ordered ? `${toAr(((n as any).start ?? 1) + i)}.` : "•"}
              </span>
              <span>{arabicize(item)}</span>
            </div>
          ))}
        </div>
      );
    case "source":
      return (
        <div style={{ fontSize: 10, color: theme.colors.muted, fontFamily: theme.fonts.mono, direction: "ltr", textAlign: "right", margin: "-2px 0 12px 0" }}>
          {n.raw?.replace(/<!--|-->/g, "").trim()}
        </div>
      );
    default:
      return null;
  }
}

export function LivePreview({ markdown, theme }: { markdown: string; theme: StudioTheme }) {
  const [ast, setAst] = React.useState<Ast | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const empty = !markdown.trim();

  React.useEffect(() => {
    if (!markdown.trim()) {
      setAst(null);
      setErr(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message ?? data?.error ?? "parse failed");
        setAst(data.ast);
        setErr(null);
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      }
    }, 350);
    return () => clearTimeout(t);
  }, [markdown]);

  const fm = ast?.frontmatter;
  const pages = fm?.sources?.[0]?.pages ?? [];
  const pagesLabel = pages.length ? `${toAr(pages[0])} – ${toAr(pages[pages.length - 1])}` : "—";
  const subjectAr = SUBJECT_AR[fm?.subject ?? ""] ?? fm?.subject ?? "—";

  // Welcoming blank canvas — a fresh studio shows an invitation, not a parser error
  if (empty) {
    return (
      <div className="p-6 overflow-auto" style={{ background: "var(--paper-2)" }}>
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{
            width: 794, margin: "0 auto", background: theme.page.background,
            padding: `${theme.page.marginTop}px ${theme.page.marginSide}px`,
            borderRadius: 6, boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
            fontFamily: theme.fonts.body, color: theme.colors.ink,
            direction: "rtl", minHeight: 620,
          }}
        >
          <Logo size={56} />
          <p className="font-serif font-semibold text-xl mt-6" style={{ color: theme.colors.ink }}>
            لوحتك جاهزة
          </p>
          <p className="text-sm mt-3 max-w-sm leading-relaxed" style={{ color: theme.colors.ink2 }}>
            اضغط «تحرير» واكتب أو الصق ملخصاً من الـ AI الخارجي — وهنا تُعرض المعاينة الحية كما سيُطبع تماماً: الغلاف، الكروت، المعادلات، والجداول.
          </p>
          <p className="font-mono text-[0.65rem] mt-6 tracking-wide-cap" style={{ color: theme.colors.muted }} dir="ltr">
            # heading · ## section · $$ math · &gt; [!NOTE]
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-auto" style={{ background: "var(--paper-2)" }}>
      <div
        style={{
          width: 794, margin: "0 auto", background: theme.page.background,
          padding: `${theme.page.marginTop}px ${theme.page.marginSide}px`,
          borderRadius: 6, boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
          fontFamily: theme.fonts.body, color: theme.colors.ink,
          direction: "rtl", minHeight: 400,
        }}
      >
        {err && (
          <div style={{ background: theme.callouts.warning.bg, color: theme.callouts.warning.text, padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 12.5 }}>
            خطأ تحليل: {err}
          </div>
        )}

        {/* Cover mirror */}
        {theme.cover.enabled && (
          <div style={{ breakAfter: "page", marginBottom: 24 }}>
            <div
              style={{
                minHeight: 700, borderRadius: 22,
                background: `linear-gradient(150deg, #292524 0%, ${theme.colors.accentDeep} 52%, ${theme.colors.accent} 100%)`,
                position: "relative", overflow: "hidden", padding: "40px 44px",
                display: "flex", flexDirection: "column", justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: theme.fonts.heading, fontSize: 15, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: `linear-gradient(135deg, #FDE68A, ${theme.colors.gold})`, transform: "rotate(45deg)" }} />
                  {theme.cover.brand}
                </div>
                <span style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.28)", color: "#fff", fontFamily: theme.fonts.heading, fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 999 }}>
                  {theme.cover.badge}
                </span>
              </div>
              <div>
                <span style={{ display: "inline-block", background: "rgba(253,230,138,0.16)", border: "1px solid rgba(253,230,138,0.4)", color: "#FDE68A", fontFamily: theme.fonts.heading, fontSize: 12.5, fontWeight: 700, padding: "5px 14px", borderRadius: 999, marginBottom: 16 }}>
                  {subjectAr}
                </span>
                <h1 style={{ fontFamily: theme.fonts.heading, fontSize: 44, fontWeight: 700, color: "#fff", lineHeight: 1.55, margin: 0 }}>
                  {fm?.title ?? "عنوان الفصل"}
                </h1>
                <div style={{ fontFamily: theme.fonts.mono, fontSize: 12, color: "rgba(255,255,255,0.62)", direction: "ltr", textAlign: "right", letterSpacing: 1.5, margin: "8px 0 18px 0" }}>
                  {fm?.sources?.[0]?.document?.toUpperCase() ?? "SOURCE"}
                </div>
                <div style={{ width: 74, height: 5, borderRadius: 999, background: `linear-gradient(90deg, #FDE68A, ${theme.colors.gold})`, marginBottom: 20 }} />
                <div style={{ fontSize: 14.5, lineHeight: 2.1, color: "rgba(255,255,255,0.88)", maxWidth: 500 }}>
                  {theme.cover.lede?.trim() || `ملخص مركّز بالعربية للفصل «${fm?.title ?? "…"}» مع الحفاظ على المصطلحات الأصلية — جاهز للمراجعة والطباعة.`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  ["المصدر", fm?.sources?.[0]?.document ?? "—"],
                  ["الصفحات", pagesLabel],
                  ["الأقسام", `${toAr(ast?.sections.length ?? 0)} أقسام`],
                ].map(([k, v], i) => (
                  <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 14, padding: "11px 15px" }}>
                    <div style={{ fontFamily: theme.fonts.heading, fontSize: 10.5, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>{k}</div>
                    <div style={{ fontFamily: theme.fonts.heading, fontSize: 12.5, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sections */}
        {ast?.sections.map((sec, idx) => (
          <section key={idx}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0 14px 0" }}>
              <span
                style={{
                  width: 34, height: 34, borderRadius: 11,
                  background: `linear-gradient(135deg, ${theme.colors.accent} 0%, ${theme.colors.accentDeep} 100%)`,
                  color: "#fff", fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                {toAr(idx + 1)}
              </span>
              <h2 style={{ fontFamily: theme.fonts.heading, fontSize: 20, fontWeight: 700, color: theme.colors.ink, margin: 0, flexShrink: 0 }}>
                {sec.heading}
              </h2>
              <span style={{ flex: 1, height: 3, borderRadius: 999, background: `linear-gradient(-90deg, ${theme.colors.accent} 0%, rgba(194,65,12,0.08) 100%)`, marginTop: 4 }} />
            </div>
            {sec.nodes.map((node: AstNode, i: number) => (
              <div key={(node as any).id ?? i} data-node-id={(node as any).id ?? undefined}>
                <PreviewNode node={node} theme={theme} />
              </div>
            ))}
          </section>
        ))}

        {!ast && <div style={{ color: theme.colors.muted, fontSize: 13 }}>…يحلل المستند</div>}
      </div>
    </div>
  );
}
