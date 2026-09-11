"use client";

/**
 * app/projects/[id]/page.tsx — Washi 0.5 project workspace.
 * The author edits the document project (content.md + template.json);
 * the PDF is a direct result of the current project state.
 *
 * Preview modes (both through the same Takumi render path):
 * - "live"  → HTML mirror (instant, approximate)
 * - "pdf"   → the exact PDF bytes in the native browser viewer (method a)
 * - "pages" → client-side pdf.js page canvases (method b)
 */

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Logo } from "@/components/studio/Logo";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { LivePreview } from "@/components/studio/LivePreview";
import { PdfPagesCanvas } from "@/components/PdfPagesCanvas";import type { StudioTheme } from "@/lib/theme";
import { splitOutline, reorderMarkdownSections } from "@/lib/outline";

interface ProjectMeta {
  id: string;
  title: string;
  subject: string;
  language: "ar" | "en";
  status: string;
  updatedAt: string;
  currentVersion: number;
  publicationCount: number;
  lastValidation?: { at: string; ok: boolean; errors: number; warnings: number };
}

interface SnapshotInfo {
  version: number;
  at: string;
  bytes: number;
}

interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  line?: number;
}

interface Publication {
  version: number;
  publishedAt: string;
  title: string;
}

type Tab = "editor" | "template" | "preview" | "history";
type PreviewMode = "live" | "pdf" | "pages";

export default function ProjectWorkspace() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [meta, setMeta] = React.useState<ProjectMeta | null>(null);
  const [content, setContent] = React.useState("");
  const [savedContent, setSavedContent] = React.useState("");
  const [template, setTemplate] = React.useState<StudioTheme | null>(null);
  const [templateJson, setTemplateJson] = React.useState("");
  const [tab, setTab] = React.useState<Tab>("editor");
  const [previewMode, setPreviewMode] = React.useState<PreviewMode>("pdf");
  const [pdfBlob, setPdfBlob] = React.useState<Blob | null>(null);
  const [pageImages, setPageImages] = React.useState<string[]>([]);
  const [rendering, setRendering] = React.useState(false);
  const [renderMs, setRenderMs] = React.useState<number | null>(null);
  const [livePreview, setLivePreview] = React.useState(true);
  const [previewZoom, setPreviewZoom] = React.useState(100);
  const [liveMarkdown, setLiveMarkdown] = React.useState("");
  const [themesList, setThemesList] = React.useState<Array<StudioTheme>>([]);
  const [assets, setAssets] = React.useState<string[]>([]);
  const assetInputRef = React.useRef<HTMLInputElement>(null);
  const [snapshots, setSnapshots] = React.useState<SnapshotInfo[]>([]);
  const [validation, setValidation] = React.useState<{ ok: boolean; errors: number; warnings: number; issues: ValidationIssue[] } | null>(null);
  const [publications, setPublications] = React.useState<Publication[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const dirty = content !== savedContent;

  const loadAll = React.useCallback(async () => {
    if (!id) return;
    const [pRes, sRes, vRes, tRes, aRes] = await Promise.all([
      fetch(`/api/projects/${id}`),
      fetch(`/api/projects/${id}/snapshots`),
      fetch(`/api/projects/${id}/publish`),
      fetch(`/api/themes`),
      fetch(`/api/projects/${id}/assets`),
    ]);
    const project = await pRes.json();
    if (pRes.ok) {
      setMeta(project.metadata);
      setContent(project.content);
      setSavedContent(project.content);
      setTemplate(project.template);
      setTemplateJson(JSON.stringify(project.template, null, 2));
    }
    if (sRes.ok) setSnapshots((await sRes.json()).snapshots ?? []);
    if (vRes.ok) setPublications((await vRes.json()).publications ?? []);
    if (tRes.ok) setThemesList((await tRes.json()).themes ?? []);
    if (aRes.ok) setAssets((await aRes.json()).assets ?? []);
  }, [id]);

  // Live preview (§16): editable "Live Preview: ON/OFF". When ON the preview
  // follows the editor (debounced inside LivePreview); when OFF it freezes.
  React.useEffect(() => {
    if (livePreview) setLiveMarkdown(content);
  }, [content, livePreview]);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  const flash = (kind: "ok" | "err", text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const save = async (withSnapshot: boolean) => {
    setBusy("save");
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, template, snapshotVersion: withSnapshot }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? json.error);
      setMeta(json.project);
      setSavedContent(content);
      const sRes = await fetch(`/api/projects/${id}/snapshots`);
      if (sRes.ok) setSnapshots((await sRes.json()).snapshots ?? []);
      flash("ok", withSnapshot ? `تم الحفظ — نسخة v${json.project.currentVersion}` : "تم الحفظ");
    } catch (e: any) {
      flash("err", e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  const applyTemplateJson = () => {
    try {
      const parsed = JSON.parse(templateJson);
      setTemplate(parsed);
      flash("ok", "تم تطبيق القالب — اضغط حفظ لتفعيله");
    } catch (e: any) {
      flash("err", "JSON غير صالح: " + (e?.message ?? ""));
    }
  };

  /* ─── Template library (§14): selection / save / duplication ─── */
  const applyThemeFromLibrary = (t: StudioTheme) => {
    setTemplate(t);
    setTemplateJson(JSON.stringify(t, null, 2));
    flash("ok", `طُبّق قالب «${t.name}» — اضغط حفظ لتثبيته في المشروع`);
  };

  const saveThemeToLibrary = async () => {
    if (!template) return;
    const name = window.prompt("اسم القالب في المكتبة:", template.name || "قالب");
    if (!name) return;
    const res = await fetch("/api/themes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: { ...template, id: name, name } }),
    });
    const json = await res.json();
    if (res.ok) {
      setThemesList(json.themes ?? []);
      flash("ok", "حُفظ القالب في المكتبة");
    } else flash("err", json.error ?? "فشل الحفظ");
  };

  const duplicateThemeToLibrary = async () => {
    if (!template) return;
    // A duplicate must never clobber an existing library theme (§27):
    // uniquify the id/name against the current library before saving.
    const baseName = `${template.name || "قالب"} (نسخة)`;
    let name = baseName;
    let n = 2;
    while (themesList.some((t) => t.id === name.toLowerCase().trim() || t.name === name)) {
      name = `${baseName} ${n++}`;
    }
    const res = await fetch("/api/themes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: { ...template, id: name, name } }),
    });
    const json = await res.json();
    if (res.ok) {
      setThemesList(json.themes ?? []);
      flash("ok", `تم تكرار القالب باسم «${name}»`);
    } else flash("err", json.error ?? "فشل التكرار");
  };

  /* ─── Assets (§36): upload + insert stable reference ─── */
  const uploadAsset = async (file: File) => {
    setBusy("asset");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/projects/${id}/assets`, { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "فشل الرفع");
      const aRes = await fetch(`/api/projects/${id}/assets`);
      if (aRes.ok) setAssets((await aRes.json()).assets ?? []);
      flash("ok", `رُفع ${json.saved} — استخدمه في Markdown: ![وصف](${json.saved})`);
    } catch (e: any) {
      flash("err", e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  const insertAssetRef = (filename: string) => {
    setContent((c) => `${c}\n\n![${filename.replace(/\.[^.]+$/, "")}](assets/${filename})\n`);
    flash("ok", `أُدرج مرجع ${filename} — عدّل الوصف والحجم في المحرر`);
  };

  const runValidate = async () => {
    if (dirty) await save(false);
    setBusy("validate");
    try {
      const res = await fetch(`/api/projects/${id}/validate`);
      const json = await res.json();
      if (res.ok) {
        setValidation(json);
        flash(json.ok ? "ok" : "err", json.ok ? `صالح هيكلياً (${json.warnings} تحذير)` : `${json.errors} خطأ هيكلي`);
      } else throw new Error(json.error);
    } catch (e: any) {
      flash("err", e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  const renderPdf = async () => {
    if (dirty) await save(false);
    setRendering(true);
    try {
      const payload = JSON.stringify({ markdown: content, theme: template });
      // Both preview methods come from the same Takumi render path:
      // (a) exact PDF bytes → native browser viewer
      // (b) server-rasterized page images (pdfjs6) → canvas pages
      const [pdfRes, pagesRes] = await Promise.all([
        fetch("/api/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        }),
        fetch("/api/preview-pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        }),
      ]);
      if (!pdfRes.ok) {
        const json = await pdfRes.json().catch(() => ({}));
        throw new Error(json.message ?? json.error ?? "فشل الرندر");
      }
      setPdfBlob(await pdfRes.blob());
      setRenderMs(Number(pdfRes.headers.get("X-Render-Ms") ?? "0") || null);
      if (pagesRes.ok) {
        const pj = await pagesRes.json();
        setPageImages(pj.pages ?? []);
      }
      setTab("preview");
      flash("ok", "تم الرندر عبر Takumi — الطريقتان جاهزتان");
    } catch (e: any) {
      flash("err", e?.message ?? String(e));
    } finally {
      setRendering(false);
    }
  };

  const restore = async (version: number) => {
    setBusy(`restore-${version}`);
    try {
      const res = await fetch(`/api/projects/${id}/snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? json.error);
      await loadAll();
      flash("ok", `تمت الاستعادة من v${version} — أُنشئت v${json.project.currentVersion}`);
    } catch (e: any) {
      flash("err", e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    if (dirty) await save(false);
    setBusy("publish");
    try {
      const vRes = await fetch(`/api/projects/${id}/validate`);
      const v = await vRes.json();
      setValidation(v);
      if (!v.ok) {
        flash("err", `النشر مرفوض — ${v.errors} خطأ هيكلي (Publish = Freeze)`);
        return;
      }
      const res = await fetch(`/api/projects/${id}/publish`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "فشل النشر");
      await loadAll();
      flash("ok", `نُشرت الحزمة v${json.version} — غير قابلة للتعديل`);
      const pRes = await fetch(`/api/projects/${id}/publish`);
      if (pRes.ok) setPublications((await pRes.json()).publications ?? []);
    } catch (e: any) {
      flash("err", e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  const statusLabel: Record<string, string> = { draft: "مسودة", review: "مراجعة", published: "منشور" };

  if (!meta) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center" style={{ background: "var(--paper-2)" }}>
        <p className="text-sm text-ink2">جارٍ تحميل المشروع…</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: "var(--paper-2)" }}>
      <header className="flex items-center justify-between px-5 h-12 border-b hairline sticky top-0 z-40 backdrop-blur-md" style={{ background: "color-mix(in srgb, var(--paper) 88%, transparent)" }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <Logo size={22} />
          <span className="font-semibold text-[0.9rem] text-ink truncate tracking-tight">{meta.title}</span>
          <span className={`text-[0.65rem] px-1.5 py-0.5 rounded-md font-medium ${meta.status === "published" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
            {statusLabel[meta.status] ?? meta.status}
          </span>
          <span className="font-mono text-[0.65rem] text-ink-3 tabular">v{meta.currentVersion}</span>
        </div>
        <nav className="flex items-center gap-1.5">
          <span className={`text-[0.7rem] font-medium ${dirty ? "text-amber-600" : "text-emerald-600"}`}>{dirty ? "غير محفوظ" : "محفوظ"}</span>
          <button onClick={() => save(false)} disabled={!dirty || busy === "save"} className="btn-ghost !py-1.5 !px-2.5 !text-[0.75rem]">حفظ</button>
          <button onClick={() => save(true)} disabled={!dirty || busy === "save"} className="btn-primary !py-1.5 !px-3 !text-[0.75rem]">حفظ + نسخة</button>
          <Link href="/projects" className="btn-ghost !py-1.5 !px-2.5 !text-[0.75rem]">المشاريع</Link>
        </nav>
      </header>

      <nav className="flex items-end gap-0.5 px-5 pt-2 max-w-7xl mx-auto border-b hairline">
        {([
          ["editor", "المحرر"],
          ["template", "القالب"],
          ["preview", "المعاينة"],
          ["history", "النسخ والنشر"],
        ] as Array<[Tab, string]>).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-[0.8rem] font-medium rounded-t-md -mb-px border-b-2 transition-colors ${
              tab === t
                ? "border-ink text-ink"
                : "border-transparent text-ink-3 hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <Link href={`/trace/${id}`} className="btn-ghost !py-1 !px-2.5 !text-[0.7rem] mb-1.5">تتبع المنصة ↗</Link>
      </nav>

      {notice && (
        <div className={`max-w-7xl mx-auto mt-2 px-5`} aria-live="polite">
          <div className={`rounded-xl px-4 py-2.5 text-xs ${notice.kind === "ok" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {notice.text}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-5">
        {tab === "editor" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <section className="border hairline rounded-2xl bg-paper overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b hairline bg-ink text-paper">
                <span className="font-mono text-[0.72rem] text-paper/60">content.md — مصدر المحتوى</span>
                <div className="flex gap-2">
                  <button onClick={runValidate} disabled={busy === "validate"} className="toolbar-btn !text-paper/80">
                    {busy === "validate" ? "تحقق…" : "تحقق هيكلي"}
                  </button>
                  <button onClick={renderPdf} disabled={rendering} className="toolbar-btn !text-paper/80">
                    {rendering ? "رندر…" : "رندر PDF"}
                  </button>
                </div>
              </div>
              <MarkdownEditor value={content} onChange={setContent} className="border-0" />
            </section>

            <section className="space-y-4">
              {/* M4.1 — section outline + reorder (markdown remains authority) */}
              <div className="border hairline rounded-xl bg-paper p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[0.7rem] font-semibold text-ink">أقسام المستند</p>
                  <span className="text-[0.65rem] text-ink-3 tabular">
                    {splitOutline(content).length} قسم
                  </span>
                </div>
                {splitOutline(content).length === 0 ? (
                  <p className="text-xs text-ink-3">لا أقسام ## بعد</p>
                ) : (
                  <ul className="space-y-1">
                    {splitOutline(content).map((sec, i, arr) => (
                      <li
                        key={`${sec.start}-${sec.title}`}
                        className="flex items-center gap-2 text-xs rounded-md px-2 py-1.5 hover:bg-paper-2"
                      >
                        <span className="flex-1 truncate text-ink" title={sec.title}>
                          {sec.title || "—"}
                        </span>
                        <button
                          type="button"
                          className="btn-ghost !py-0.5 !px-1.5 !text-[0.65rem]"
                          disabled={i === 0}
                          onClick={() => setContent((c) => reorderMarkdownSections(c, i, i - 1))}
                          aria-label={`نقل ${sec.title} لأعلى`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn-ghost !py-0.5 !px-1.5 !text-[0.65rem]"
                          disabled={i === arr.length - 1}
                          onClick={() => setContent((c) => reorderMarkdownSections(c, i, i + 1))}
                          aria-label={`نقل ${sec.title} لأسفل`}
                        >
                          ↓
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {validation && (
                <div className="border hairline rounded-2xl bg-paper p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="kicker text-[0.6rem] text-ink2">التحقق الهيكلي</p>
                    <span className={`text-xs font-bold ${validation.ok ? "text-emerald-700" : "text-red-700"}`}>
                      {validation.ok ? "✓ صالح" : `✗ ${validation.errors} خطأ`}
                      {validation.warnings > 0 && ` · ${validation.warnings} تحذير`}
                    </span>
                  </div>
                  {validation.issues.length === 0 ? (
                    <p className="text-xs text-ink2">لا ملاحظات — المستند سليم هيكلياً.</p>
                  ) : (
                    <ul className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                      {validation.issues.map((iss, i) => (
                        <li key={i} className="text-xs flex gap-2">
                          <span className={iss.severity === "error" ? "text-red-700 font-bold" : "text-amber-600 font-bold"}>{iss.severity === "error" ? "✗" : "!"}</span>
                          <span className="text-ink2">{iss.message}</span>
                          {iss.line && <span className="font-mono text-[0.6rem] text-ink2">سطر {iss.line}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Assets (§36): first-class files, stable references */}
              <div className="border hairline rounded-2xl bg-paper p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="kicker text-[0.6rem] text-ink2">أصول المشروع</p>
                  <div>
                    <input
                      ref={assetInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadAsset(f);
                        e.target.value = "";
                      }}
                    />
                    <button onClick={() => assetInputRef.current?.click()} disabled={busy === "asset"} className="btn-ghost !py-1 !text-[0.65rem]">
                      {busy === "asset" ? "…" : "+ رفع صورة"}
                    </button>
                  </div>
                </div>
                {assets.length === 0 ? (
                  <p className="text-xs text-ink2">لا أصول بعد — ارفع صورة وأدرج مرجعها في Markdown.</p>
                ) : (
                  <ul className="space-y-1">
                    {assets.map((a) => (
                      <li key={a} className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono text-[0.65rem] text-ink2 truncate">{a}</span>
                        <button onClick={() => insertAssetRef(a)} className="btn-ghost !py-0.5 !px-2 !text-[0.6rem]">إدراج</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border hairline rounded-2xl bg-paper overflow-hidden">
                <div className="px-4 py-2.5 border-b hairline bg-ink text-paper flex items-center justify-between flex-wrap gap-2">
                  <span className="font-mono text-[0.72rem] text-paper/60">معاينة حية (HTML — تقريبية وفورية)</span>
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-1.5 text-[0.68rem] text-paper/70">
                      <span>تكبير</span>
                      <input
                        type="range"
                        min={70}
                        max={140}
                        step={5}
                        value={previewZoom}
                        onChange={(e) => setPreviewZoom(Number(e.target.value))}
                        className="w-20 accent-amber-400"
                        aria-label="تكبير المعاينة"
                      />
                      <span className="font-mono w-8">{previewZoom}%</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[0.68rem] text-paper/80 cursor-pointer select-none">
                      <input type="checkbox" checked={livePreview} onChange={(e) => setLivePreview(e.target.checked)} />
                      Live Preview: {livePreview ? "ON" : "OFF"}
                    </label>
                  </div>
                </div>
                <div className="max-h-[560px] overflow-auto scrollbar-thin p-4">
                  <div style={{ zoom: previewZoom / 100 }}>
                    <LivePreview markdown={liveMarkdown} theme={template!} />
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {tab === "template" && template && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <section className="border hairline rounded-2xl bg-paper overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b hairline bg-ink text-paper">
                <span className="font-mono text-[0.72rem] text-paper/60">template.json — لغة العرض (اللون ليس محتوى)</span>
                <button onClick={applyTemplateJson} className="toolbar-btn !text-paper/80">تطبيق</button>
              </div>
              <textarea
                value={templateJson}
                onChange={(e) => setTemplateJson(e.target.value)}
                dir="ltr"
                className="w-full h-[420px] p-4 font-mono text-[0.72rem] leading-relaxed bg-paper-2 outline-none"
                spellCheck={false}
              />
            </section>
            <section className="space-y-4">
              <div className="border hairline rounded-2xl bg-paper overflow-hidden">
                <div className="px-4 py-2.5 border-b hairline bg-ink text-paper">
                  <span className="font-mono text-[0.72rem] text-paper/60">مكتبة القوالب — تطبيق فوري</span>
                </div>
                <ul className="divide-y hairline max-h-56 overflow-y-auto scrollbar-thin">
                  {themesList.length === 0 && <li className="px-4 py-3 text-xs text-ink2">المكتبة فارغة — احفظ القالب الحالي فيها.</li>}
                  {themesList.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => applyThemeFromLibrary(t)}
                        className={`w-full text-start px-4 py-2.5 text-xs hover:bg-paper-2 flex items-center gap-2 ${template.id === t.id ? "bg-paper-2 font-bold" : "text-ink2"}`}
                      >
                        <span className="w-3 h-3 rounded-full border hairline" style={{ background: t.colors.accent }} />
                        <span className="flex-1 truncate">{t.name}</span>
                        {template.id === t.id && <span className="text-accent">✓ مطبق</span>}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2 px-4 py-3 border-t hairline">
                  <button onClick={saveThemeToLibrary} className="btn-ghost !py-1.5 !text-xs">حفظ الحالي في المكتبة</button>
                  <button onClick={duplicateThemeToLibrary} className="btn-ghost !py-1.5 !text-xs">تكرار</button>
                </div>
              </div>

              <div className="border hairline rounded-2xl bg-paper p-5 space-y-4">
                <p className="kicker text-[0.6rem] text-ink2">مفاتيح سريعة</p>
              {([
                ["colors.paper", "لون الورق"],
                ["colors.ink", "لون النص"],
                ["colors.accent", "لون التمييز"],
                ["page.background", "خلفية الصفحة"],
                ["cover.brand", "اسم الغلاف"],
                ["cover.badge", "شارة الغلاف"],
              ] as Array<[string, string]>).map(([path, label]) => {
                const [a, b] = path.split(".");
                const value = (template as any)?.[a]?.[b] ?? "";
                const isColor = /color/i.test(label) || /^#/.test(String(value));
                return (
                  <div key={path} className="flex items-center justify-between gap-3">
                    <label className="text-xs text-ink2">{label}</label>
                    {isColor ? (
                      <input
                        type="color"
                        value={String(value)}
                        onChange={(e) => {
                          const next = { ...template, [a]: { ...(template as any)[a], [b]: e.target.value } } as any;
                          setTemplate(next);
                          setTemplateJson(JSON.stringify(next, null, 2));
                        }}
                        className="w-12 h-8 rounded border hairline cursor-pointer"
                      />
                    ) : (
                      <input
                        value={String(value)}
                        onChange={(e) => {
                          const next = { ...template, [a]: { ...(template as any)[a], [b]: e.target.value } } as any;
                          setTemplate(next);
                          setTemplateJson(JSON.stringify(next, null, 2));
                        }}
                        className="border hairline rounded-lg px-3 py-1.5 text-xs bg-paper-2 outline-none w-56"
                      />
                    )}
                  </div>
                );
              })}
              <p className="text-[0.68rem] text-ink2 leading-relaxed border-t hairline pt-3">
                تعديل القالب لا يكتب في content.md أبداً — تغيير اللون ليس تغيير محتوى.
                اضغط «حفظ + snapshot» في الأعلى لتثبيت نسخة من القالب مع المحتوى.
              </p>
              </div>
            </section>
          </div>
        )}

        {tab === "preview" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {([
                ["pdf", "PDF مباشر (عارض المتصفح)"],
                ["pages", "صفحات pdf.js (canvas)"],
                ["live", "HTML حي"],
              ] as Array<[PreviewMode, string]>).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setPreviewMode(m)}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl border hairline ${previewMode === m ? "bg-ink text-paper" : "bg-paper text-ink2"}`}
                >
                  {label}
                </button>
              ))}
              <div className="flex-1" />
              <button onClick={renderPdf} disabled={rendering} className="btn-primary !py-2 !px-5 !text-xs">
                {rendering ? "جارٍ الرندر…" : "رندر PDF"}
              </button>
              {renderMs != null && renderMs > 0 && (
                <span className="text-xs text-ink2 font-mono">{renderMs}ms عبر takumi</span>
              )}
            </div>

            {previewMode === "pdf" && (
              <div className="border hairline rounded-2xl bg-paper overflow-hidden">
                <div className="px-4 py-2.5 border-b hairline bg-ink text-paper">
                  <span className="font-mono text-[0.72rem] text-paper/60">الطريقة (أ) — ملف PDF النهائي نفسه في عارض المتصفح</span>
                </div>
                {pdfBlob ? (
                  <object
                    data={URL.createObjectURL(pdfBlob)}
                    type="application/pdf"
                    className="w-full h-[760px]"
                  >
                    <iframe src={URL.createObjectURL(pdfBlob)} title="PDF" className="w-full h-[760px]" />
                  </object>
                ) : (
                  <div className="p-12 text-center text-sm text-ink2">اضغط «رندر PDF» أولاً.</div>
                )}
              </div>
            )}

            {previewMode === "pages" && (
              <div className="border hairline rounded-2xl bg-paper overflow-hidden">
                <PdfPagesCanvas pageImages={pageImages} busy={rendering} />
              </div>
            )}

            {previewMode === "live" && (
              <div className="border hairline rounded-2xl bg-paper p-5 max-h-[760px] overflow-y-auto scrollbar-thin">
                <LivePreview markdown={content} theme={template!} />
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <section className="border hairline rounded-2xl bg-paper overflow-hidden">
              <div className="px-5 py-4 border-b hairline">
                <p className="font-bold text-ink">Snapshot History</p>
                <p className="text-xs text-ink2 mt-1">كل حفظ مهم يثبت نسخة — الاستعادة تنشئ نسخة جديدة، لا شيء يُمسح.</p>
              </div>
              {snapshots.length === 0 ? (
                <p className="p-8 text-center text-xs text-ink2">لا snapshots بعد.</p>
              ) : (
                <ul className="divide-y hairline">
                  {snapshots.map((s) => (
                    <li key={s.version} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="font-mono text-sm font-bold text-ink">v{s.version}</p>
                        <p className="text-[0.65rem] text-ink2">
                          {new Date(s.at).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" })} · {(s.bytes / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        onClick={() => restore(s.version)}
                        disabled={busy === `restore-${s.version}`}
                        className="btn-ghost !py-1.5 !text-xs"
                      >
                        {busy === `restore-${s.version}` ? "…" : "استعادة"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-4">
              <div className="border hairline rounded-2xl bg-paper p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-ink">Publish = Freeze</p>
                    <p className="text-xs text-ink2 mt-1">النشر يجمّد مسودة مراجَعة في حزمة غير قابلة للتعديل.</p>
                  </div>
                  <button onClick={publish} disabled={busy === "publish"} className="btn-primary !py-2 !px-5 !text-xs">
                    {busy === "publish" ? "جارٍ النشر…" : "نشر الحزمة"}
                  </button>
                </div>
                <p className="text-[0.65rem] text-ink2 mt-3 leading-relaxed">
                  الحزمة: content.md · document.ast · app-content.json · document.pdf · assets/ · metadata/
                </p>
              </div>

              <div className="border hairline rounded-2xl bg-paper overflow-hidden">
                <div className="px-5 py-3.5 border-b hairline">
                  <p className="font-bold text-ink text-sm">المنشورات ({publications.length})</p>
                </div>
                {publications.length === 0 ? (
                  <p className="p-8 text-center text-xs text-ink2">لا منشورات بعد.</p>
                ) : (
                  <ul className="divide-y hairline">
                    {publications.map((p) => (
                      <li key={p.version} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="font-mono text-sm font-bold text-ink">publication v{p.version}</p>
                          <p className="text-[0.65rem] text-ink2">{new Date(p.publishedAt).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" })}</p>
                        </div>
                        <Link href={`/trace/${id}?v=${p.version}`} className="btn-ghost !py-1.5 !text-xs">فحص الحزمة</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
