"use client";

/**
 * app/prompts/page.tsx — Prompt Studio (wizard).
 *
 * Practical Networks-first flow — NOT a chat:
 *   1) Source (paste or upload + title/document/pages)
 *   2) Presets (library checkboxes; Networks defaults pre-selected)
 *   3) Package (one .md handoff file — copy or download)
 *
 * Washi still does not call an LLM. The package is what you paste into
 * ChatGPT/Claude; the scaffold is a content.md starter.
 */

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/studio/Logo";
import {
  assemblePromptPackage,
  buildContentScaffold,
  packageSlug,
  NETWORKS_DEFAULT_PRESET_MATCH,
} from "@/lib/prompt-package";

interface Prompt {
  id: number;
  title: string;
  category: "global" | "subject" | "chapter" | "formatting";
  subject?: string;
  body: string;
  tags?: string[];
  versions: { body: string; at: string; note?: string }[];
}

type Step = 1 | 2 | 3;

const STEP_LABELS = ["المصدر", "القوالب", "الحزمة"];

export default function PromptsPage() {
  const [step, setStep] = React.useState<Step>(1);
  const [prompts, setPrompts] = React.useState<Prompt[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [notice, setNotice] = React.useState<string | null>(null);
  const [showLibrary, setShowLibrary] = React.useState(false);

  // Step 1 — source
  const [title, setTitle] = React.useState("");
  const [documentName, setDocumentName] = React.useState("");
  const [pages, setPages] = React.useState("");
  const [sourceText, setSourceText] = React.useState("");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const flash = (t: string) => {
    setNotice(t);
    setTimeout(() => setNotice(null), 3500);
  };

  const load = React.useCallback(async () => {
    const res = await fetch("/api/prompts");
    const json = await res.json();
    const list: Prompt[] = json.prompts ?? [];
    setPrompts(list);
    // Pre-select Networks defaults once
    setSelectedIds((prev) => {
      if (prev.size > 0) return prev;
      const next = new Set<number>();
      for (const p of list) {
        const hit = NETWORKS_DEFAULT_PRESET_MATCH.some((m) => p.title.includes(m));
        if (hit || p.category === "global") next.add(p.id);
      }
      return next.size ? next : new Set(list.slice(0, 3).map((p) => p.id));
    });
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const meta = {
    title: title || "فصل شبكات — عنوان مؤقت",
    document: documentName || "Source.pdf",
    pages: pages || "1",
    subject: "computer-networks",
    language: "ar" as const,
  };

  const selectedPrompts = prompts.filter((p) => selectedIds.has(p.id));

  const packageMd = React.useMemo(
    () =>
      assemblePromptPackage({
        meta,
        prompts: selectedPrompts.map((p) => ({ title: p.title, body: p.body })),
        sourceText,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [title, documentName, pages, sourceText, selectedIds, prompts]
  );

  const scaffoldMd = React.useMemo(() => buildContentScaffold(meta), [
    title,
    documentName,
    pages,
  ]);

  const onFile = async (file: File) => {
    const text = await file.text();
    setSourceText(text);
    setFileName(file.name);
    if (!documentName) setDocumentName(file.name.replace(/\.(md|txt)$/i, ".pdf"));
    flash(`رُفع ${file.name} (${text.length} حرف)`);
  };

  const download = (text: string, name: string) => {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(label);
    } catch {
      flash("تعذر النسخ — استعمل التحميل");
    }
  };

  const toggle = (id: number) => {
    setSelectedIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const canNextFrom1 = sourceText.trim().length > 0 || fileName !== null;
  const canNextFrom2 = selectedIds.size > 0;

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: "var(--paper-2)" }}>
      <header
        className="flex items-center justify-between px-5 h-14 border-b hairline sticky top-0 z-40"
        style={{ background: "var(--paper)" }}
      >
        <div className="flex items-center gap-3">
          <Logo size={28} />
          <span className="font-display font-black text-lg text-ink">Prompt Studio</span>
          <span className="font-mono text-[0.6rem] text-ink2 hidden sm:inline">
            مسار الشبكات — حزمة Markdown واحدة
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLibrary((s) => !s)}
            className="btn-ghost !py-1.5 !text-xs"
            type="button"
          >
            {showLibrary ? "إخفاء المكتبة" : "تحرير المكتبة"}
          </button>
          <Link href="/projects" className="btn-ghost !py-1.5 !text-xs">
            ← المشاريع
          </Link>
        </div>
      </header>

      {notice && (
        <div className="max-w-4xl mx-auto mt-2 px-5">
          <div className="rounded-xl px-4 py-2 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
            {notice}
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto p-5 space-y-4">
        {/* Steps bar */}
        <ol className="flex items-center gap-2 text-xs">
          {STEP_LABELS.map((label, i) => {
            const n = (i + 1) as Step;
            const active = step === n;
            const done = step > n;
            return (
              <li key={label} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (n === 1 || (n === 2 && canNextFrom1) || (n === 3 && canNextFrom1 && canNextFrom2)) {
                      setStep(n);
                    }
                  }}
                  className={`rounded-full px-3 py-1.5 border hairline ${
                    active
                      ? "bg-ink text-paper font-bold"
                      : done
                        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                        : "bg-paper text-ink2"
                  }`}
                >
                  {n}. {label}
                </button>
                {i < 2 && <span className="text-ink2">←</span>}
              </li>
            );
          })}
        </ol>

        {/* ── Step 1 ── */}
        {step === 1 && (
          <section className="border hairline rounded-2xl bg-paper p-5 space-y-4">
            <div>
              <h1 className="font-display font-black text-ink text-lg">١ — المصدر</h1>
              <p className="text-xs text-ink2 mt-1">
                ألصق نص الفصل أو ارفع <bdi>.md</bdi>/<bdi>.txt</bdi>. المادة ثابتة:{" "}
                <bdi>computer-networks</bdi>.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <label className="block text-xs text-ink2">
                عنوان الفصل
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: مقدمة إلى شبكات الحاسوب"
                  className="mt-1 w-full border hairline rounded-xl px-3 py-2 text-sm bg-paper-2 outline-none text-ink"
                />
              </label>
              <label className="block text-xs text-ink2">
                اسم المستند (PDF)
                <input
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Computer Networks.pdf"
                  className="mt-1 w-full border hairline rounded-xl px-3 py-2 text-sm bg-paper-2 outline-none text-ink font-mono"
                  dir="ltr"
                />
              </label>
              <label className="block text-xs text-ink2">
                الصفحات
                <input
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  placeholder="1,2,3"
                  className="mt-1 w-full border hairline rounded-xl px-3 py-2 text-sm bg-paper-2 outline-none text-ink font-mono"
                  dir="ltr"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-primary !py-2 !px-4 !text-xs"
                onClick={() => fileRef.current?.click()}
              >
                رفع ملف
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".md,.txt,.markdown,text/plain,text/markdown"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                  e.target.value = "";
                }}
              />
              {fileName && (
                <span className="font-mono text-[0.65rem] text-ink2" dir="ltr">
                  {fileName}
                </span>
              )}
              {sourceText && (
                <button
                  type="button"
                  className="btn-ghost !py-1.5 !text-xs"
                  onClick={() => {
                    setSourceText("");
                    setFileName(null);
                  }}
                >
                  مسح النص
                </button>
              )}
            </div>

            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              dir="auto"
              rows={14}
              placeholder="ألصق هنا نص المصدر من المحاضرة / الـPDF…"
              className="w-full border hairline rounded-xl p-3 font-mono text-[0.75rem] leading-relaxed bg-paper-2 outline-none resize-y"
              spellCheck={false}
            />
            <p className="text-[0.65rem] text-ink2 font-mono" dir="ltr">
              {sourceText.length} chars
            </p>

            <div className="flex justify-start">
              <button
                type="button"
                disabled={!canNextFrom1}
                onClick={() => setStep(2)}
                className="btn-primary !py-2 !px-6 !text-sm disabled:opacity-40"
              >
                التالي — القوالب ←
              </button>
            </div>
          </section>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <section className="border hairline rounded-2xl bg-paper p-5 space-y-4">
            <div>
              <h1 className="font-display font-black text-ink text-lg">٢ — القوالب</h1>
              <p className="text-xs text-ink2 mt-1">
                اختر presets من المكتبة (مو محادثة). المقترح للشبكات مفعّل مسبقاً.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-[0.65rem]">
              <button
                type="button"
                className="btn-ghost !py-1 !px-3"
                onClick={() => {
                  const next = new Set<number>();
                  for (const p of prompts) {
                    if (
                      NETWORKS_DEFAULT_PRESET_MATCH.some((m) => p.title.includes(m)) ||
                      p.category === "global"
                    )
                      next.add(p.id);
                  }
                  setSelectedIds(next);
                }}
              >
                تفعيل مقترح الشبكات
              </button>
              <button
                type="button"
                className="btn-ghost !py-1 !px-3"
                onClick={() => setSelectedIds(new Set())}
              >
                مسح التحديد
              </button>
              <button
                type="button"
                className="btn-ghost !py-1 !px-3"
                onClick={() => setSelectedIds(new Set(prompts.map((p) => p.id)))}
              >
                الكل
              </button>
            </div>

            <ul className="space-y-2">
              {prompts.map((p) => {
                const on = selectedIds.has(p.id);
                return (
                  <li key={p.id}>
                    <label
                      className={`flex items-start gap-3 border hairline rounded-xl px-3 py-2.5 cursor-pointer ${
                        on ? "bg-paper-2" : "bg-paper"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(p.id)}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="text-sm text-ink font-semibold block">{p.title}</span>
                        <span className="text-[0.62rem] text-ink2">
                          {p.category}
                          {p.subject ? ` · ${p.subject}` : ""} · {p.body.length} حرف
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            <div className="flex justify-between">
              <button type="button" className="btn-ghost !py-2 !text-sm" onClick={() => setStep(1)}>
                → رجوع
              </button>
              <button
                type="button"
                disabled={!canNextFrom2}
                onClick={() => setStep(3)}
                className="btn-primary !py-2 !px-6 !text-sm disabled:opacity-40"
              >
                التالي — الحزمة ←
              </button>
            </div>
          </section>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <section className="border hairline rounded-2xl bg-paper overflow-hidden">
            <div className="px-5 py-4 border-b hairline bg-ink text-paper">
              <h1 className="font-display font-black text-lg">٣ — الحزمة</h1>
              <p className="text-[0.7rem] text-paper/70 mt-1">
                ملف Markdown واحد. انسخه أو حمّله — ثم الصقه في الـAI الخارجي. النتيجة تُحفظ
                كمشروع واشي.
              </p>
            </div>

            <div className="px-5 py-3 border-b hairline flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary !py-2 !px-4 !text-xs"
                onClick={() => copy(packageMd, "نُسخة الحزمة كاملة")}
              >
                نسخ الحزمة
              </button>
              <button
                type="button"
                className="btn-ghost !py-2 !text-xs"
                onClick={() => download(packageMd, `${packageSlug(title)}-prompt-package.md`)}
              >
                تحميل حزمة الـprompt
              </button>
              <button
                type="button"
                className="btn-ghost !py-2 !text-xs"
                onClick={() => copy(scaffoldMd, "نُسخ الهيكل content.md")}
              >
                نسخ هيكل content.md
              </button>
              <button
                type="button"
                className="btn-ghost !py-2 !text-xs"
                onClick={() => download(scaffoldMd, "content.md")}
              >
                تحميل content.md
              </button>
              <span className="text-[0.62rem] text-ink2 self-center">
                {selectedPrompts.length} قالب · {sourceText.length} حرف مصدر
              </span>
            </div>

            <textarea
              readOnly
              value={packageMd}
              dir="auto"
              rows={22}
              className="w-full p-4 font-mono text-[0.72rem] leading-relaxed bg-paper-2 outline-none resize-y"
              spellCheck={false}
            />

            <div className="px-5 py-3 border-t hairline flex justify-between items-center">
              <button type="button" className="btn-ghost !py-2 !text-sm" onClick={() => setStep(2)}>
                → رجوع للقوالب
              </button>
              <Link href="/projects" className="btn-primary !py-2 !px-5 !text-xs">
                فتح المشاريع لإنشاء المشروع ←
              </Link>
            </div>
          </section>
        )}

        {/* Optional library editor */}
        {showLibrary && (
          <LibraryPanel
            prompts={prompts}
            onChanged={load}
          />
        )}
      </main>
    </div>
  );
}

function LibraryPanel({
  prompts,
  onChanged,
}: {
  prompts: Prompt[];
  onChanged: () => void;
}) {
  const [openId, setOpenId] = React.useState<number | null>(null);
  const [body, setBody] = React.useState("");

  const open = (p: Prompt) => {
    setOpenId(p.id);
    setBody(p.body);
  };

  const save = async () => {
    if (openId == null) return;
    await fetch("/api/prompts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: openId, body }),
    });
    onChanged();
  };

  return (
    <section className="border hairline rounded-2xl bg-paper overflow-hidden">
      <div className="px-4 py-2.5 border-b hairline text-xs font-bold text-ink">
        مكتبة القوالب (متقدمة)
      </div>
      <ul className="max-h-64 overflow-y-auto">
        {prompts.map((p) => (
          <li key={p.id} className="border-b hairline last:border-0">
            <button
              type="button"
              onClick={() => open(p)}
              className="w-full text-start px-4 py-2 text-xs hover:bg-paper-2"
            >
              #{p.id} {p.title}
            </button>
            {openId === p.id && (
              <div className="px-4 pb-3 space-y-2">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  dir="auto"
                  className="w-full border hairline rounded-xl p-2 font-mono text-[0.7rem] bg-paper-2"
                />
                <button type="button" className="btn-primary !py-1.5 !text-xs" onClick={save}>
                  حفظ
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
