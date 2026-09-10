"use client";

/**
 * app/prompts/page.tsx — Prompt Studio (standalone master prompt).
 *
 * One long complete prompt. Copy it, paste into ChatGPT/Claude,
 * then paste your source text in the same chat. No upload. No paste field.
 */

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/studio/Logo";
import { assemblePromptPackage, packageSlug } from "@/lib/prompt-package";

export default function PromptsPage() {
  const [title, setTitle] = React.useState("");
  const [documentName, setDocumentName] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);

  const flash = (t: string) => {
    setNotice(t);
    setTimeout(() => setNotice(null), 3500);
  };

  const masterPrompt = React.useMemo(
    () =>
      assemblePromptPackage({
        meta: {
          title: title.trim() || undefined,
          document: documentName.trim() || undefined,
          subject: "computer-networks",
          language: "ar",
        },
      }),
    [title, documentName]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(masterPrompt);
      flash("نُسخ الـprompt الشامل — الصقه في الـAI ثم ألصق نص المصدر بعده");
    } catch {
      flash("تعذر النسخ — استعمل زر التحميل");
    }
  };

  const download = () => {
    const blob = new Blob([masterPrompt], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${packageSlug(title || "washi-master-prompt")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    flash("حُمّل ملف الـprompt");
  };

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: "var(--paper-2)" }}>
      <header
        className="flex items-center justify-between px-5 h-12 border-b hairline sticky top-0 z-40 backdrop-blur-md"
        style={{ background: "color-mix(in srgb, var(--paper) 88%, transparent)" }}
      >
        <div className="flex items-center gap-2.5">
          <Logo size={22} />
          <span className="font-semibold text-[0.9rem] text-ink tracking-tight">Prompt Studio</span>
          <span className="text-[0.7rem] text-ink-3 hidden sm:inline">— برومبت واشي الشامل</span>
        </div>
        <Link href="/projects" className="btn-ghost !py-1.5 !px-2.5 !text-[0.75rem]">
          المشاريع
        </Link>
      </header>

      {notice && (
        <div className="max-w-4xl mx-auto mt-2 px-5">
          <div className="rounded-xl px-4 py-2 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
            {notice}
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto p-5 space-y-4">
        <section className="rounded-xl border hairline bg-paper overflow-hidden">
          <div className="px-5 py-4 border-b hairline">
            <h1 className="text-[1.05rem] font-semibold text-ink tracking-tight">
              برومبت إنتاج فصل واشي
            </h1>
            <p className="text-[0.8rem] text-ink-2 mt-1.5 leading-relaxed max-w-2xl">
              انسخ الـprompt، ألصقه في ChatGPT أو Claude، ثم ألصق نص المحاضرة بعده.
              الخرج: <span className="font-mono text-[0.75rem]">content.md</span> جاهز لمشروع واشي.
            </p>
          </div>

          <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-[0.7rem] font-medium text-ink-2">
              عنوان الفصل (اختياري)
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="{{عنوان الفصل}}"
                className="mt-1.5 field"
              />
            </label>
            <label className="block text-[0.7rem] font-medium text-ink-2">
              اسم المستند (اختياري)
              <input
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="{{اسم الملف.pdf}}"
                className="mt-1.5 field font-mono"
                dir="ltr"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-primary" onClick={copy}>
              نسخ الـprompt الشامل
            </button>
            <button type="button" className="btn-ghost" onClick={download}>
              تحميل .md
            </button>
            <span className="text-[0.7rem] text-ink-3 self-center font-mono tabular" dir="ltr">
              {masterPrompt.length.toLocaleString()} chars
            </span>
          </div>

          <div className="rounded-lg border hairline bg-paper-2/60 p-3.5 text-[0.78rem] text-ink-2 leading-relaxed">
            <span className="font-medium text-ink">الخطوات:</span>{" "}
            انسخ الـprompt → افتح ChatGPT/Claude → ألصقه → ألصق نص المحاضرة → انسخ{" "}
            <span className="font-mono text-[0.72rem]">content.md</span> →{" "}
            <Link href="/projects" className="text-ink underline underline-offset-2">مشروع جديد</Link>
          </div>

          <textarea
            readOnly
            value={masterPrompt}
            dir="auto"
            rows={22}
            className="w-full p-4 font-mono text-[0.75rem] leading-[1.7] border-t hairline bg-ink text-[#E9E4D8] outline-none resize-y"
            spellCheck={false}
          />
          </div>
        </section>
      </main>
    </div>
  );
}
