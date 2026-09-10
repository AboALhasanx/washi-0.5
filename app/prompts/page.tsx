"use client";

/**
 * app/prompts/page.tsx — Prompt Studio (complete merge).
 *
 * Two steps only:
 *   1) Source (paste or upload + title/document/pages)
 *   2) ONE complete merged prompt (all sections always) — copy / download
 *
 * No chat. No fragment-by-checkbox. No LLM inside Washi.
 */

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/studio/Logo";
import {
  assemblePromptPackage,
  buildContentScaffold,
  packageSlug,
} from "@/lib/prompt-package";

interface Prompt {
  id: number;
  title: string;
  category: string;
  body: string;
}

export default function PromptsPage() {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [prompts, setPrompts] = React.useState<Prompt[]>([]);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [showLibrary, setShowLibrary] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [documentName, setDocumentName] = React.useState("");
  const [sourceText, setSourceText] = React.useState("");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const flash = (t: string) => {
    setNotice(t);
    setTimeout(() => setNotice(null), 3500);
  };

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/prompts");
        const json = await res.json();
        setPrompts(json.prompts ?? []);
      } catch {
        /* library optional for merge */
      }
    })();
  }, []);

  const meta = {
    title: title || "فصل شبكات — عنوان مؤقت",
    document: documentName || "Source.pdf",
    subject: "computer-networks",
    language: "ar" as const,
  };

  // Full document by default — no page picker.
  const packageMd = React.useMemo(
    () => assemblePromptPackage({ meta, prompts: [], sourceText }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [title, documentName, sourceText]
  );

  const scaffoldMd = React.useMemo(() => buildContentScaffold(meta), [
    title,
    documentName,
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

  const canNext = sourceText.trim().length > 0;

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
            دمج كامل — prompt واحد لكل الأقسام
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLibrary((s) => !s)}
            className="btn-ghost !py-1.5 !text-xs"
            type="button"
          >
            {showLibrary ? "إخفاء المكتبة" : "المكتبة"}
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
        <ol className="flex items-center gap-2 text-xs">
          {(["المصدر", "الـprompt الكامل"] as const).map((label, i) => {
            const n = (i + 1) as 1 | 2;
            const active = step === n;
            return (
              <li key={label} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (n === 1 || canNext) setStep(n);
                  }}
                  className={`rounded-full px-3 py-1.5 border hairline ${
                    active ? "bg-ink text-paper font-bold" : "bg-paper text-ink2"
                  }`}
                >
                  {n}. {label}
                </button>
                {i === 0 && <span className="text-ink2">←</span>}
              </li>
            );
          })}
        </ol>

        {step === 1 && (
          <section className="border hairline rounded-2xl bg-paper p-5 space-y-4">
            <div>
              <h1 className="font-display font-black text-ink text-lg">١ — المصدر</h1>
              <p className="text-xs text-ink2 mt-1">
                ألصق النص أو ارفع ملفاً. المادة: <bdi>computer-networks</bdi>. النتيجة
                اللاحقة prompt <b>مدمج كامل</b> بكل الأقسام — مو نسخ متعددة.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block text-xs text-ink2">
                عنوان الفصل
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مقدمة إلى شبكات الحاسوب"
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
            </div>
            <p className="text-[0.65rem] text-ink2">
              المصدر <b>كامل</b> — بلا تحديد صفحات. ألصق/ارفع كل نص الفصل.
            </p>

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
              rows={16}
              placeholder="ألصق هنا نص المصدر من المحاضرة / الـPDF…"
              className="w-full border hairline rounded-xl p-3 font-mono text-[0.75rem] leading-relaxed bg-paper-2 outline-none resize-y"
              spellCheck={false}
            />
            <p className="text-[0.65rem] text-ink2 font-mono" dir="ltr">
              {sourceText.length} chars
            </p>

            <button
              type="button"
              disabled={!canNext}
              onClick={() => setStep(2)}
              className="btn-primary !py-2 !px-6 !text-sm disabled:opacity-40"
            >
              ولّد الـprompt الكامل ←
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="border hairline rounded-2xl bg-paper overflow-hidden">
            <div className="px-5 py-4 border-b hairline bg-ink text-paper">
              <h1 className="font-display font-black text-lg">٢ — الـprompt الكامل المدمج</h1>
              <p className="text-[0.7rem] text-paper/70 mt-1">
                ملف واحد يحوي كل الأقسام: العقد · التتبع · الهيكل · التعريفات · الأسئلة ·
                البطاقات · التدقيق · خصوصية الشبكات · المصدر. انسخه أو حمّله مرة واحدة.
              </p>
            </div>

            <div className="px-5 py-3 border-b hairline flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary !py-2 !px-4 !text-xs"
                onClick={() => copy(packageMd, "نُسخ الـprompt الكامل")}
              >
                نسخ الـprompt الكامل
              </button>
              <button
                type="button"
                className="btn-ghost !py-2 !text-xs"
                onClick={() =>
                  download(packageMd, `${packageSlug(title)}-complete-prompt.md`)
                }
              >
                تحميل prompt كامل
              </button>
              <button
                type="button"
                className="btn-ghost !py-2 !text-xs"
                onClick={() => copy(scaffoldMd, "نُسخ الهيكل content.md")}
              >
                نسخ content.md
              </button>
              <button
                type="button"
                className="btn-ghost !py-2 !text-xs"
                onClick={() => download(scaffoldMd, "content.md")}
              >
                تحميل content.md
              </button>
              <span className="text-[0.62rem] text-ink2 self-center" dir="ltr">
                {packageMd.length} chars
              </span>
            </div>

            <textarea
              readOnly
              value={packageMd}
              dir="auto"
              rows={24}
              className="w-full p-4 font-mono text-[0.72rem] leading-relaxed bg-paper-2 outline-none resize-y"
              spellCheck={false}
            />

            <div className="px-5 py-3 border-t hairline flex justify-between items-center">
              <button type="button" className="btn-ghost !py-2 !text-sm" onClick={() => setStep(1)}>
                → تعديل المصدر
              </button>
              <Link href="/projects" className="btn-primary !py-2 !px-5 !text-xs">
                المشاريع ←
              </Link>
            </div>
          </section>
        )}

        {showLibrary && (
          <section className="border hairline rounded-2xl bg-paper overflow-hidden">
            <div className="px-4 py-2.5 border-b hairline text-xs font-bold text-ink">
              مكتبة المرجع (لا تُلصق في الخرج — الدمج مدمج بالكود)
            </div>
            <ul className="max-h-48 overflow-y-auto text-xs">
              {prompts.map((p) => (
                <li key={p.id} className="px-4 py-1.5 border-b hairline last:border-0 text-ink2">
                  #{p.id} {p.title}
                </li>
              ))}
              {prompts.length === 0 && (
                <li className="px-4 py-2 text-ink2">—</li>
              )}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
