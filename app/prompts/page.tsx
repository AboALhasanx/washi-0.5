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
        className="flex items-center justify-between px-5 h-14 border-b hairline sticky top-0 z-40"
        style={{ background: "var(--paper)" }}
      >
        <div className="flex items-center gap-3">
          <Logo size={28} />
          <span className="font-display font-black text-lg text-ink">Prompt Studio</span>
          <span className="font-mono text-[0.6rem] text-ink2 hidden sm:inline">
            برومبت شامل واحد — انسخه وروح للـAI
          </span>
        </div>
        <Link href="/projects" className="btn-ghost !py-1.5 !text-xs">
          ← المشاريع
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
        <section className="border hairline rounded-2xl bg-paper p-5 space-y-4">
          <div>
            <h1 className="font-display font-black text-ink text-lg">
              الـprompt الشامل لإنتاج فصل واشي
            </h1>
            <p className="text-xs text-ink2 mt-2 leading-relaxed">
              برومبت واحد طويل يغطي العقد والتتبع والهيكل والتعريفات والأسئلة والبطاقات
              وخصوصية الشبكات. <b>ما نرفع ملفات هنا.</b> تنسخ الـprompt، تفتح ChatGPT
              أو Claude، تلزقه، بعدين تلزق <b>نص الـPDF/المحاضرة</b> بنفس المحادثة.
              الـAI يطلع لك <bdi>content.md</bdi> تدخله واشي كمشروع.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-xs text-ink2">
              عنوان الفصل (اختياري — يُحقن بالـprompt)
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="اتركه فارغاً لاستخدام {{عنوان الفصل}}"
                className="mt-1 w-full border hairline rounded-xl px-3 py-2 text-sm bg-paper-2 outline-none text-ink"
              />
            </label>
            <label className="block text-xs text-ink2">
              اسم المستند (اختياري)
              <input
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="اتركه فارغاً لاستخدام {{اسم الملف.pdf}}"
                className="mt-1 w-full border hairline rounded-xl px-3 py-2 text-sm bg-paper-2 outline-none text-ink font-mono"
                dir="ltr"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary !py-2 !px-5 !text-sm" onClick={copy}>
              نسخ الـprompt الشامل
            </button>
            <button type="button" className="btn-ghost !py-2 !text-sm" onClick={download}>
              تحميل .md
            </button>
            <span className="text-[0.65rem] text-ink2 self-center font-mono" dir="ltr">
              {masterPrompt.length} chars
            </span>
          </div>

          <div className="rounded-xl border hairline bg-paper-2 p-3 text-[0.7rem] text-ink2 leading-relaxed">
            <b className="text-ink">الخطوات:</b>
            <ol className="list-decimal ps-5 mt-1 space-y-0.5">
              <li>انسخ الـprompt</li>
              <li>افتح ChatGPT / Claude / Gemini</li>
              <li>الصق الـprompt</li>
              <li>الصق نص المحاضرة / الـPDF بعده مباشرة</li>
              <li>انسخ خرج الـAI (content.md)</li>
              <li>من <Link href="/projects" className="underline">المشاريع</Link> — مشروع جديد بهذا الملف</li>
            </ol>
          </div>

          <textarea
            readOnly
            value={masterPrompt}
            dir="auto"
            rows={22}
            className="w-full p-4 font-mono text-[0.72rem] leading-relaxed border hairline rounded-xl bg-paper outline-none resize-y"
            spellCheck={false}
          />
        </section>
      </main>
    </div>
  );
}
