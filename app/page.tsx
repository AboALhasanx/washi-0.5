"use client";

/**
 * app/page.tsx — washi Studio (v1.5)
 * A Canva-style three-pane studio:
 *   [tools rail]  ←  document canvas (live preview / editor / PDF)  →  [theme inspector]
 * Themes are WordPress-style: visually editable in the inspector, savable as
 * JSON, switchable — and they drive both the live preview and the real
 * takumi-pdf render.
 */

import * as React from "react";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { Logo } from "@/components/studio/Logo";
import { LivePreview } from "@/components/studio/LivePreview";
import { StudioTheme, DEFAULT_THEME, AVAILABLE_FONT_STACKS } from "@/lib/theme";
import { cn } from "@/lib/utils";

type View = "preview" | "edit" | "pdf";
type RailTab = "insert" | "outline" | "sources" | "themes";
type UiTheme = "system" | "light" | "dark";

const VIEW_TABS: Array<{ id: View; label: string }> = [
  { id: "preview", label: "معاينة حية" },
  { id: "edit", label: "تحرير" },
  { id: "pdf", label: "PDF" },
];

const COLOR_FIELDS: Array<{ key: keyof StudioTheme["colors"]; label: string }> = [
  { key: "paper", label: "الورق" },
  { key: "ink", label: "الحبر" },
  { key: "ink2", label: "حبر ثانوي" },
  { key: "muted", label: "خافت" },
  { key: "hairline", label: "خط شعري" },
  { key: "accent", label: "اللون المميز" },
  { key: "accentDeep", label: "مميز داكن" },
  { key: "accentSoft", label: "مميز ناعم" },
  { key: "surface", label: "سطح الكروت" },
  { key: "gold", label: "ذهبي" },
];

const CALLOUT_FIELDS: Array<{ key: keyof StudioTheme["callouts"]; label: string }> = [
  { key: "note", label: "ملاحظة" },
  { key: "important", label: "مهم" },
  { key: "warning", label: "تحذير" },
  { key: "example", label: "مثال" },
  { key: "tip", label: "نصيحة" },
];

const INSERT_TOOLS: Array<{ label: string; icon: string; snippet: string; hint: string }> = [
  { label: "قسم رئيسي", icon: "§", hint: "## عنوان", snippet: "\n\n## عنوان قسم جديد\n\n" },
  { label: "عنوان فرعي", icon: "≡", hint: "### عنوان", snippet: "\n\n### عنوان فرعي\n\n" },
  { label: "فقرة", icon: "¶", hint: "نص", snippet: "\n\nاكتب فقرتك هنا…\n\n" },
  { label: "تعريف", icon: "؟", hint: "[!NOTE] **مصطلح:**", snippet: "\n\n> [!NOTE]\n> **المصطلح:** اكتب التعريف هنا.\n\n" },
  { label: "مهم", icon: "★", hint: "[!IMPORTANT]", snippet: "\n\n> [!IMPORTANT]\n> نقطة مهمة لا تفوتها.\n\n" },
  { label: "تحذير", icon: "▲", hint: "[!WARNING]", snippet: "\n\n> [!WARNING]\n> خطأ شائع يجب تجنبه.\n\n" },
  { label: "مثال محلول", icon: "✓", hint: "[!EXAMPLE]", snippet: "\n\n> [!EXAMPLE]\n> **مثال:** اكتب المثال المحلول هنا.\n\n" },
  { label: "نصيحة", icon: "✦", hint: "[!TIP]", snippet: "\n\n> [!TIP]\n> نصيحة للمراجعة.\n\n" },
  { label: "معادلة", icon: "∑", hint: "$$ … $$", snippet: "\n\n$$\nE = mc^2\n$$\n\n" },
  { label: "جدول", icon: "⊞", hint: "GFM table", snippet: "\n\n| العمود أ | العمود ب |\n|---|---|\n| قيمة 1 | قيمة 2 |\n| قيمة 3 | قيمة 4 |\n\n" },
  { label: "قائمة نقطية", icon: "•", hint: "- item", snippet: "\n\n- نقطة أولى\n- نقطة ثانية\n\n" },
  { label: "قائمة رقمية", icon: "١.", hint: "1. item", snippet: "\n\n- نقطة أولى\n- نقطة ثانية\n\n".replace(/^-/gm, "1.") },
  { label: "كود", icon: "{}", hint: "```ts", snippet: "\n\n```ts\nconsole.log(\"مرحباً\");\n```\n\n" },
];

function splitOutline(md: string): Array<{ title: string; start: number; end: number }> {
  const lines = md.split("\n");
  const idx: number[] = [];
  lines.forEach((l, i) => {
    if (/^##\s+/.test(l)) idx.push(i);
  });
  const sections = idx.map((start, k) => ({
    title: lines[start].replace(/^##\s+/, "").trim(),
    start,
    end: k + 1 < idx.length ? idx[k + 1] - 1 : lines.length - 1,
  }));
  return sections;
}

export default function StudioPage() {
  /* ─── UI chrome theme ─── */
  const [uiTheme, setUiTheme] = React.useState<UiTheme>("system");
  React.useEffect(() => {
    const stored = (typeof window !== "undefined" ? (localStorage.getItem("ap-theme") as UiTheme | null) : null) ?? "system";
    setUiTheme(stored);
  }, []);
  React.useEffect(() => {
    const root = document.documentElement;
    if (uiTheme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", uiTheme);
    try { localStorage.setItem("ap-theme", uiTheme); } catch {}
  }, [uiTheme]);

  /* ─── Document state ─── */
  const [view, setView] = React.useState<View>("preview");
  const [markdown, setMarkdown] = React.useState<string>("");
  const [railTab, setRailTab] = React.useState<RailTab>("insert");

  /* ─── Studio theme state ─── */
  const [studioTheme, setStudioTheme] = React.useState<StudioTheme>(DEFAULT_THEME);
  const [themesList, setThemesList] = React.useState<StudioTheme[]>([]);
  const [activeThemeId, setActiveThemeId] = React.useState<string>("default");
  const [saveName, setSaveName] = React.useState<string>("");
  const [themesMsg, setThemesMsg] = React.useState<string | null>(null);

  const refreshThemes = React.useCallback(async () => {
    try {
      const res = await fetch("/api/themes");
      const data = await res.json();
      setThemesList(data.themes ?? []);
    } catch {}
  }, []);
  React.useEffect(() => { refreshThemes(); }, [refreshThemes]);

  const patchTheme = (patch: any) => {
    setStudioTheme((t) => {
      const next = { ...t, ...patch };
      if (patch.colors) next.colors = { ...t.colors, ...patch.colors };
      if (patch.fonts) next.fonts = { ...t.fonts, ...patch.fonts };
      if (patch.page) next.page = { ...t.page, ...patch.page };
      if (patch.cover) next.cover = { ...t.cover, ...patch.cover };
      if (patch.footer) next.footer = { ...t.footer, ...patch.footer };
      if (patch.callouts) {
        next.callouts = { ...t.callouts };
        for (const k of Object.keys(patch.callouts)) {
          next.callouts[k as keyof typeof t.callouts] = {
            ...t.callouts[k as keyof typeof t.callouts],
            ...patch.callouts[k],
          } as any;
        }
      }
      return next;
    });
  };

  const handleSaveTheme = async () => {
    const name = saveName.trim() || studioTheme.name;
    setThemesMsg(null);
    try {
      const res = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: { ...studioTheme, id: name, name } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "save failed");
      setThemesList(data.themes ?? []);
      setActiveThemeId(data.theme.id);
      setStudioTheme(data.theme);
      setThemesMsg(`حُفظ الثيم «${data.theme.name}» ✓`);
    } catch (e: any) {
      setThemesMsg(e?.message ?? String(e));
    }
  };

  const handleDeleteTheme = async (id: string) => {
    await fetch("/api/themes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    refreshThemes();
  };

  /* ─── Document meta (authored frontmatter hints) ─── */
  const [subject, setSubject] = React.useState("software-engineering");
  const [title, setTitle] = React.useState("الفصل التاسع");
  const [language, setLanguage] = React.useState<"ar" | "en">("ar");

  /* ─── PDF generation ─── */
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [generateLoading, setGenerateLoading] = React.useState(false);
  const [generateError, setGenerateError] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [pdfUrl]);

  const handleGeneratePdf = async () => {
    setGenerateError(null);
    if (!markdown.trim()) {
      setGenerateError("المستند فارغ — الصق ملخصاً أو استورد فصلاً.");
      return;
    }
    setGenerateLoading(true);
    if (pdfUrl) { URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, theme: studioTheme }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/pdf")) {
        const blob = await res.blob();
        setPdfUrl(URL.createObjectURL(blob));
        setView("pdf");
        return;
      }
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || data?.message || `فشل التوليد (${res.status})`);
    } catch (e: any) {
      setGenerateError(e?.message ?? String(e));
    } finally {
      setGenerateLoading(false);
    }
  };

  /* ─── Insert at caret ─── */
  const insertSnippet = (snippet: string) => {
    const ta = document.getElementById("washi-md") as HTMLTextAreaElement | null;
    if (!ta) {
      setMarkdown((m) => m + snippet);
      return;
    }
    const start = ta.selectionStart ?? markdown.length;
    const end = ta.selectionEnd ?? start;
    const next = markdown.slice(0, start) + snippet + markdown.slice(end);
    setMarkdown(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + snippet.length;
    });
  };

  /* ─── Outline reorder ─── */
  const outline = React.useMemo(() => (markdown ? splitOutline(markdown) : []), [markdown]);

  /* ─── Sources tab: unique provenance refs found in the manuscript ─── */
  const sources = React.useMemo(() => {
    const seen = new Map<string, { doc: string; detail: string }>();
    for (const m of markdown.matchAll(/<!--\s*source:\s*(.+?)\s*-->/g)) {
      const raw = m[1];
      const generated = /^\(generated\)$/i.test(raw);
      const doc = generated ? "(generated)" : raw.split(/\s+p\.\d+/)[0].trim();
      const detail = generated ? "kind: generated" : raw.slice(doc.length).trim() || "—";
      if (!seen.has(doc.toLowerCase())) seen.set(doc.toLowerCase(), { doc, detail });
    }
    return [...seen.values()];
  }, [markdown]);

  const moveSection = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= outline.length) return;
    const lines = markdown.split("\n");
    const a = outline[index];
    const b = outline[target];
    const aBlock = lines.slice(a.start, a.end + 1);
    const bBlock = lines.slice(b.start, b.end + 1);
    const before = lines.slice(0, Math.min(a.start, b.start));
    const after = lines.slice(Math.max(a.end, b.end) + 1);
    const reordered = dir === -1 ? [...bBlock, ...aBlock] : [...bBlock, ...aBlock];
    const next = [...before, ...reordered, ...after].join("\n");
    setMarkdown(next);
  };

  /* ─── Render ─── */
  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ background: "var(--paper-2)" }}>
      {/* ═══ Top bar ═══ */}
      <header
        className="flex items-center justify-between gap-4 px-5 h-14 border-b hairline sticky top-0 z-40"
        style={{ background: "var(--paper)" }}
      >
        <div className="flex items-center gap-3">
          <Logo size={30} />
          <div>
            <span className="font-display font-black text-lg text-ink leading-none">washi</span>
            <span className="font-mono text-[0.6rem] text-ink2 mr-2">STUDIO v1.5</span>
          </div>
          <span className="kicker hidden md:inline text-[0.6rem] text-ink2">استوديو المخطوطات</span>
        </div>

        {/* view tabs */}
        <nav className="flex items-center gap-1 bg-paper2 rounded-full p-1 border hairline">
          {VIEW_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-semibold transition-colors",
                view === t.id ? "bg-ink text-paper" : "text-ink2 hover:text-ink"
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <select
            value={uiTheme}
            onChange={(e) => setUiTheme(e.target.value as UiTheme)}
            className="border hairline rounded-lg px-2 py-1.5 text-xs text-ink bg-paper"
            title="وضع الواجهة"
          >
            <option value="system">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <a href="/projects" className="btn-primary !py-1.5 !px-4 !text-xs">المشاريع 0.5</a>
          <a href="/prompts" className="btn-ghost !py-1.5 !text-xs">Prompts</a>
          <a href="/dashboard" className="btn-ghost !py-1.5 !text-xs">لوحة التحكم</a>
          <a href="/settings" className="btn-ghost !py-1.5 !text-xs">الإعدادات</a>
          <button
            onClick={handleGeneratePdf}
            disabled={generateLoading || !markdown.trim()}
            className="btn-primary !py-2 !px-5 !text-sm"
          >
            {generateLoading ? "…يولّد" : "توليد PDF ↓"}
          </button>
        </div>
      </header>

      {/* ═══ Body: rail / canvas / inspector ═══ */}
      <div className="flex flex-1 min-h-[calc(100vh-3.5rem)]">
        {/* ── Tools rail ── */}
        <aside className="w-60 shrink-0 border-l hairline flex flex-col" style={{ background: "var(--paper)" }}>
          <div className="grid grid-cols-4 border-b hairline">
            {([
              ["insert", "إدراج"],
              ["outline", "الهيكل"],
              ["sources", "مصادر"],
              ["themes", "قوالب"],
            ] as Array<[RailTab, string]>).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setRailTab(id)}
                className={cn(
                  "py-2.5 text-[0.72rem] font-bold transition-colors",
                  railTab === id ? "text-accent border-b-2 border-accent" : "text-ink2 hover:text-ink"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-2 text-sm">
            {railTab === "insert" && (
              <div className="grid grid-cols-2 gap-2">
                {INSERT_TOOLS.map((tool) => (
                  <button
                    key={tool.label}
                    title={tool.hint}
                    onClick={() => { insertSnippet(tool.snippet); setView("edit"); }}
                    className="border hairline rounded-xl p-2.5 text-center hover:border-accent hover:bg-accentSoft/40 transition-colors"
                  >
                    <div className="text-accent font-black text-base leading-none mb-1.5">{tool.icon}</div>
                    <div className="text-[0.68rem] font-bold text-ink">{tool.label}</div>
                  </button>
                ))}
              </div>
            )}

            {railTab === "outline" && (
              <div className="space-y-1">
                {outline.length === 0 && <p className="text-xs text-ink2 p-2">لا أقسام بعد — أضف «## عنوان» من إدراج.</p>}
                {outline.map((sec, i) => (
                  <div key={i} className="flex items-center gap-1 border hairline rounded-lg px-2 py-1.5">
                    <span className="text-[0.65rem] font-mono text-ink2 w-5">{i + 1}</span>
                    <span className="flex-1 truncate text-xs font-semibold text-ink">{sec.title}</span>
                    <button onClick={() => moveSection(i, -1)} disabled={i === 0} className="text-ink2 hover:text-accent disabled:opacity-30 px-1">↑</button>
                    <button onClick={() => moveSection(i, 1)} disabled={i === outline.length - 1} className="text-ink2 hover:text-accent disabled:opacity-30 px-1">↓</button>
                  </div>
                ))}
              </div>
            )}

            {railTab === "sources" && (
              <div className="space-y-1.5">
                {sources.length === 0 && (
                  <p className="text-xs text-ink2 p-2">
                    لا مصادر بعد — أضف تعليق «source:» قبل الأقسام ليظهر هنا.
                  </p>
                )}
                {sources.map((s, i) => (
                  <div key={i} className="border hairline rounded-lg px-2.5 py-1.5">
                    <p className="text-xs font-semibold text-ink truncate" dir="auto" title={s.doc}>
                      {s.doc}
                    </p>
                    <p className="text-[0.6rem] font-mono text-ink2" dir="ltr">
                      {s.detail}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {railTab === "themes" && (
              <div className="space-y-2">
                {themesList.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setStudioTheme(t); setActiveThemeId(t.id); }}
                    className={cn(
                      "w-full text-right border rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors",
                      activeThemeId === t.id ? "border-accent bg-accentSoft/40" : "hairline hover:border-accent"
                    )}
                  >
                    <span className="flex gap-0.5">
                      <span className="w-3.5 h-3.5 rounded-full border hairline" style={{ background: t.colors.accent }} />
                      <span className="w-3.5 h-3.5 rounded-full border hairline" style={{ background: t.colors.paper }} />
                      <span className="w-3.5 h-3.5 rounded-full border hairline" style={{ background: t.colors.gold }} />
                    </span>
                    <span className="flex-1 text-xs font-bold text-ink truncate">{t.name}</span>
                    {activeThemeId === t.id && <span className="text-accent text-xs">✓</span>}
                    {t.id !== "default" && (
                      <span
                        onClick={(e) => { e.stopPropagation(); handleDeleteTheme(t.id); }}
                        className="text-ink2 hover:text-err text-xs px-1"
                        title="حذف"
                      >
                        ✕
                      </span>
                    )}
                  </button>
                ))}
                <div className="border hairline rounded-xl p-3 space-y-2">
                  <input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder={studioTheme.name}
                    className="w-full border hairline rounded-lg px-2.5 py-1.5 text-xs bg-paper text-ink"
                  />
                  <button onClick={handleSaveTheme} className="btn-primary w-full !py-2 !text-xs">حفظ الثيم الحالي</button>
                  {themesMsg && <p className="text-[0.68rem] text-ok">{themesMsg}</p>}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Canvas ── */}
        <main className="flex-1 min-w-0 flex flex-col">
          {view === "preview" && <LivePreview markdown={markdown} theme={studioTheme} />}

          {view === "edit" && (
            <div className="p-5 overflow-auto">
              <MarkdownEditor value={markdown} onChange={setMarkdown} textareaId="washi-md" />
            </div>
          )}

          {view === "pdf" && (
            <div className="flex-1 flex flex-col overflow-auto">
              {pdfUrl ? (
                <>
                  <div className="flex items-center justify-between px-5 py-3 border-b hairline">
                    <span className="text-xs text-ink2 font-mono">Rendered via takumi-pdf · theme: {studioTheme.name}</span>
                    <a href={pdfUrl} download={`${studioTheme.name}.pdf`} className="btn-ghost !py-1.5 !text-xs">تنزيل PDF</a>
                  </div>
                  <iframe src={pdfUrl} className="flex-1 min-h-[600px] w-full" title="PDF preview" />
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-10">
                  <Logo size={44} />
                  <p className="font-serif font-semibold text-lg text-ink">لم يولّد PDF بعد</p>
                  <p className="text-sm text-ink2 max-w-md">
                    اضغط «توليد PDF» بالشريط العلوي — يُرندر المستند بثيمك الحالي عبر takumi-pdf.
                  </p>
                </div>
              )}
              {generateError && <p className="text-err text-xs px-5 pb-4">{generateError}</p>}
            </div>
          )}
        </main>

        {/* ── Inspector ── */}
        <aside className="w-72 shrink-0 border-r hairline overflow-auto" style={{ background: "var(--paper)" }}>
          <div className="p-4 space-y-5 text-sm">
            <div>
              <p className="kicker text-[0.6rem] text-ink2 mb-1">المفتش</p>
              <p className="font-display font-black text-ink">ثيم: {studioTheme.name}</p>
              <p className="text-[0.68rem] text-ink2 mt-1 leading-relaxed">
                كل تغيير ينعكس فوراً بالمعاينة الحية وعند توليد الـ PDF — واحفظه كقالب من تبويب «قوالب».
              </p>
            </div>

            {/* Colors */}
            <section>
              <p className="text-[0.68rem] font-bold text-ink mb-2">الألوان</p>
              <div className="grid grid-cols-2 gap-2">
                {COLOR_FIELDS.map((f) => (
                  <label key={f.key} className="flex items-center gap-2 border hairline rounded-lg px-2 py-1.5">
                    <input
                      type="color"
                      value={studioTheme.colors[f.key]}
                      onChange={(e) => patchTheme({ colors: { [f.key]: e.target.value } })}
                      className="w-5 h-5 rounded cursor-pointer bg-transparent"
                    />
                    <span className="text-[0.65rem] text-ink2 truncate">{f.label}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Callout styles */}
            <section>
              <p className="text-[0.68rem] font-bold text-ink mb-2">الكروت</p>
              <div className="space-y-2">
                {CALLOUT_FIELDS.map((f) => {
                  const c = studioTheme.callouts[f.key];
                  return (
                    <div key={f.key} className="border hairline rounded-lg px-2.5 py-2">
                      <p className="text-[0.65rem] font-bold text-ink2 mb-1.5">{f.label}</p>
                      <div className="flex gap-1.5">
                        {(["bg", "chip"] as const).map((k) =>
                          k === "bg" ? (
                            <input
                              key="bg"
                              type="color"
                              value={c.bg}
                              title="الخلفية"
                              onChange={(e) => patchTheme({ callouts: { [f.key]: { bg: e.target.value } } })}
                              className="w-6 h-6 rounded cursor-pointer bg-transparent"
                            />
                          ) : (
                            <React.Fragment key="chips">
                              <input
                                type="color"
                                value={c.chip[0]}
                                title="الشريط"
                                onChange={(e) => patchTheme({ callouts: { [f.key]: { chip: [e.target.value, c.chip[1]] } } })}
                                className="w-6 h-6 rounded cursor-pointer bg-transparent"
                              />
                              <input
                                type="color"
                                value={c.chip[1]}
                                title="تدرج الشارة"
                                onChange={(e) => patchTheme({ callouts: { [f.key]: { chip: [c.chip[0], e.target.value] } } })}
                                className="w-6 h-6 rounded cursor-pointer bg-transparent"
                              />
                            </React.Fragment>
                          )
                        )}
                        <input
                          type="color"
                          value={c.text}
                          title="لون النص"
                          onChange={(e) => patchTheme({ callouts: { [f.key]: { text: e.target.value } } })}
                          className="w-6 h-6 rounded cursor-pointer bg-transparent"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Fonts */}
            <section>
              <p className="text-[0.68rem] font-bold text-ink mb-2">الخطوط</p>
              <div className="space-y-2">
                <label className="block">
                  <span className="text-[0.65rem] text-ink2">المتن</span>
                  <select
                    value={studioTheme.fonts.body}
                    onChange={(e) => patchTheme({ fonts: { body: e.target.value } })}
                    className="w-full border hairline rounded-lg px-2 py-1.5 text-xs bg-paper text-ink"
                  >
                    {AVAILABLE_FONT_STACKS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[0.65rem] text-ink2">العناوين</span>
                  <select
                    value={studioTheme.fonts.heading}
                    onChange={(e) => patchTheme({ fonts: { heading: e.target.value } })}
                    className="w-full border hairline rounded-lg px-2 py-1.5 text-xs bg-paper text-ink"
                  >
                    {AVAILABLE_FONT_STACKS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[0.65rem] text-ink2">حجم المتن: {studioTheme.fonts.bodySize}px</span>
                  <input
                    type="range" min={11.5} max={16.5} step={0.5}
                    value={studioTheme.fonts.bodySize}
                    onChange={(e) => patchTheme({ fonts: { bodySize: Number(e.target.value) } })}
                    className="w-full accent-accent"
                  />
                </label>
                <label className="block">
                  <span className="text-[0.65rem] text-ink2">تباعد الأسطر: {studioTheme.fonts.lineHeight}</span>
                  <input
                    type="range" min={1.6} max={2.6} step={0.05}
                    value={studioTheme.fonts.lineHeight}
                    onChange={(e) => patchTheme({ fonts: { lineHeight: Number(e.target.value) } })}
                    className="w-full accent-accent"
                  />
                </label>
              </div>
            </section>

            {/* Page */}
            <section>
              <p className="text-[0.68rem] font-bold text-ink mb-2">الصفحة</p>
              <div className="space-y-2">
                <label className="flex items-center justify-between gap-2">
                  <span className="text-[0.65rem] text-ink2">المقاس</span>
                  <select
                    value={studioTheme.page.size}
                    onChange={(e) => patchTheme({ page: { size: e.target.value as "a4" | "letter" } })}
                    className="border hairline rounded-lg px-2 py-1 text-xs bg-paper text-ink"
                  >
                    <option value="a4">A4</option>
                    <option value="letter">Letter</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[0.65rem] text-ink2">هامش علوي: {studioTheme.page.marginTop}px</span>
                  <input
                    type="range" min={36} max={90} step={2}
                    value={studioTheme.page.marginTop}
                    onChange={(e) => patchTheme({ page: { marginTop: Number(e.target.value) } })}
                    className="w-full accent-accent"
                  />
                </label>
                <label className="block">
                  <span className="text-[0.65rem] text-ink2">هامش جانبي: {studioTheme.page.marginSide}px</span>
                  <input
                    type="range" min={32} max={90} step={2}
                    value={studioTheme.page.marginSide}
                    onChange={(e) => patchTheme({ page: { marginSide: Number(e.target.value) } })}
                    className="w-full accent-accent"
                  />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-[0.65rem] text-ink2">خلفية الورق</span>
                  <input
                    type="color"
                    value={studioTheme.page.background}
                    onChange={(e) => patchTheme({ page: { background: e.target.value } })}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent"
                  />
                </label>
              </div>
            </section>

            {/* Cover + footer */}
            <section>
              <p className="text-[0.68rem] font-bold text-ink mb-2">الغلاف</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={studioTheme.cover.enabled}
                    onChange={(e) => patchTheme({ cover: { enabled: e.target.checked } })}
                  />
                  <span className="text-[0.65rem] text-ink2">تشغيل صفحة الغلاف</span>
                </label>
                <input
                  value={studioTheme.cover.brand}
                  onChange={(e) => patchTheme({ cover: { brand: e.target.value } })}
                  placeholder="اسم البراند"
                  className="w-full border hairline rounded-lg px-2.5 py-1.5 text-xs bg-paper text-ink"
                />
                <input
                  value={studioTheme.cover.badge}
                  onChange={(e) => patchTheme({ cover: { badge: e.target.value } })}
                  placeholder="شارة الغلاف"
                  className="w-full border hairline rounded-lg px-2.5 py-1.5 text-xs bg-paper text-ink"
                />
                <textarea
                  value={studioTheme.cover.lede}
                  onChange={(e) => patchTheme({ cover: { lede: e.target.value } })}
                  placeholder="فقرة تعريف الغلاف (اتركها فارغة للتلقائي)"
                  rows={3}
                  className="w-full border hairline rounded-lg px-2.5 py-1.5 text-xs bg-paper text-ink"
                />
              </div>
            </section>

            <section>
              <p className="text-[0.68rem] font-bold text-ink mb-2">الفوتر</p>
              <div className="space-y-2">
                <input
                  value={studioTheme.footer.brand}
                  onChange={(e) => patchTheme({ footer: { brand: e.target.value } })}
                  className="w-full border hairline rounded-lg px-2.5 py-1.5 text-xs bg-paper text-ink"
                />
                <input
                  value={studioTheme.footer.tagline}
                  onChange={(e) => patchTheme({ footer: { tagline: e.target.value } })}
                  className="w-full border hairline rounded-lg px-2.5 py-1.5 text-xs bg-paper text-ink"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={studioTheme.footer.showPageNumbers}
                    onChange={(e) => patchTheme({ footer: { showPageNumbers: e.target.checked } })}
                  />
                  <span className="text-[0.65rem] text-ink2">أرقام الصفحات</span>
                </label>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
