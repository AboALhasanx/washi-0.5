"use client";

/**
 * app/prompts/page.tsx — Washi 0.5 Prompt Library.
 * Washi does not generate content: copy a prompt into an external AI tool,
 * bring the resulting Markdown back as a project.
 * Categories: Global / Subject / Chapter / Formatting rules.
 */

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/studio/Logo";

interface PromptVersion {
  body: string;
  at: string;
  note?: string;
}

interface Prompt {
  id: number;
  title: string;
  category: "global" | "subject" | "chapter" | "formatting";
  subject?: string;
  body: string;
  versions: PromptVersion[];
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES: Array<{ id: Prompt["category"]; label: string; hint: string }> = [
  { id: "global", label: "قواعد عامة", hint: "Global Rules" },
  { id: "subject", label: "قواعد المادة", hint: "Subject Rules" },
  { id: "chapter", label: "قواعد الفصل", hint: "Chapter Rules" },
  { id: "formatting", label: "قواعد التنسيق", hint: "Formatting Rules" },
];

const EMPTY_BODY = `أنت مساعد أكاديمي. حوّل المحتوى التالي إلى Markdown منظم وفق قواعد Washi:

1. ابدأ بـ frontmatter يحوي: subject, theme (default), title, language (ar), sources[].
2. عنوان h1 واحد للفصل، ثم أقسام h2: نظرة عامة، المفاهيم الأساسية، التعاريف، المعادلات، أمثلة محلولة، نقاط مهمة، أسئلة مراجعة.
3. التعاريف داخل blockquote بصيغة: > [!NOTE] **المصطلح:** التعريف.
4. المعادلات LaTeX داخل $$...$$ مع سطر شرح عربي بعدها.
5. أضف <!-- source: الملف.pdf p.ص --> قبل كل مقطع لتتبع المصدر.
6. لا تختلق معلومات — ممنوع الهلوسة.`;

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
};

export default function PromptsPage() {
  const [prompts, setPrompts] = React.useState<Prompt[]>([]);
  const [selected, setSelected] = React.useState<Prompt | null>(null);
  const [editingBody, setEditingBody] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newCategory, setNewCategory] = React.useState<Prompt["category"]>("formatting");
  const [notice, setNotice] = React.useState<string | null>(null);
  const [showVersions, setShowVersions] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/prompts");
    const json = await res.json();
    setPrompts(json.prompts ?? []);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const flash = (t: string) => {
    setNotice(t);
    setTimeout(() => setNotice(null), 3000);
  };

  const open = (p: Prompt) => {
    setSelected(p);
    setEditingBody(p.body);
    setShowVersions(false);
  };

  const create = async () => {
    const res = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle || "Prompt جديد", category: newCategory, body: EMPTY_BODY }),
    });
    const json = await res.json();
    if (res.ok) {
      await load();
      open(json.prompt);
      setCreating(false);
      setNewTitle("");
      flash("تم إنشاء prompt");
    }
  };

  const saveEdit = async () => {
    if (!selected) return;
    const res = await fetch("/api/prompts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, body: editingBody }),
    });
    const json = await res.json();
    if (res.ok) {
      await load();
      open(json.prompt);
      flash("تم الحفظ — نسخة جديدة موثقة");
    }
  };

  const duplicate = async (p: Prompt) => {
    await fetch("/api/prompts?action=duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id }),
    });
    await load();
    flash("تم التكرار");
  };

  const remove = async (p: Prompt) => {
    await fetch(`/api/prompts?id=${p.id}`, { method: "DELETE" });
    if (selected?.id === p.id) setSelected(null);
    await load();
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash("نُسخ — الصقه في الـ AI الخارجي");
    } catch {}
  };

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: "var(--paper-2)" }}>
      <header className="flex items-center justify-between px-5 h-14 border-b hairline sticky top-0 z-40" style={{ background: "var(--paper)" }}>
        <div className="flex items-center gap-3">
          <Logo size={28} />
          <span className="font-display font-black text-lg text-ink">مكتبة Prompts</span>
          <span className="font-mono text-[0.6rem] text-ink2">Washi لا يولّد المحتوى — يسلّمه للـ AI الخارجي</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCreating(true)} className="btn-primary !py-1.5 !px-4 !text-xs">+ Prompt</button>
          <Link href="/projects" className="btn-ghost !py-1.5 !text-xs">← المشاريع</Link>
        </div>
      </header>

      {notice && (
        <div className="max-w-6xl mx-auto mt-2 px-5">
          <div className="rounded-xl px-4 py-2 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">{notice}</div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-5 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5">
        <aside className="space-y-2">
          {CATEGORIES.map((cat) => {
            const items = prompts.filter((p) => p.category === cat.id);
            return (
              <div key={cat.id} className="border hairline rounded-2xl bg-paper overflow-hidden">
                <div className="px-3.5 py-2.5 border-b hairline">
                  <p className="text-xs font-bold text-ink">{cat.label}</p>
                  <p className="font-mono text-[0.55rem] text-ink2">{cat.hint}</p>
                </div>
                {items.length === 0 ? (
                  <p className="px-3.5 py-2 text-[0.62rem] text-ink2">فارغ</p>
                ) : (
                  <ul>
                    {items.map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() => open(p)}
                          className={`w-full text-start px-3.5 py-2 text-xs hover:bg-paper-2 ${selected?.id === p.id ? "bg-paper-2 font-bold" : "text-ink2"}`}
                        >
                          {p.title}
                          <span className="font-mono text-[0.55rem] text-ink2 block">#{p.id} · {p.versions.length} نسخ</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </aside>

        <section className="space-y-3">
          {creating && (
            <div className="border hairline rounded-2xl bg-paper p-4 space-y-3">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="عنوان الـ prompt"
                className="w-full border hairline rounded-xl px-3 py-2 text-sm bg-paper-2 outline-none"
              />
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setNewCategory(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs border hairline ${newCategory === c.id ? "bg-ink text-paper" : "text-ink2"}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={create} className="btn-primary !py-2 !px-5 !text-xs">إنشاء</button>
                <button onClick={() => setCreating(false)} className="btn-ghost !py-2 !px-4 !text-xs">إلغاء</button>
              </div>
            </div>
          )}

          {!selected && !creating && (
            <div className="border hairline border-dashed rounded-2xl bg-paper p-12 text-center">
              <p className="font-serif font-semibold text-ink">اختر prompt من القائمة</p>
              <p className="text-xs text-ink2 mt-1 leading-relaxed max-w-md mx-auto">
                المسار: انسخ الـ prompt → الصقه في <bdi>ChatGPT / Claude / Gemini / Kimi</bdi> مع المحتوى الخام →
                أعِد بالـ Markdown → أنشئ مشروعاً من صفحة المشاريع.
              </p>
            </div>
          )}

          {selected && (
            <div className="border hairline rounded-2xl bg-paper overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b hairline bg-ink text-paper flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-paper">{selected.title}</span>
                  <span className="font-mono text-[0.6rem] text-paper/50">
                    {CATEGORIES.find((c) => c.id === selected.category)?.hint} · #{selected.id}
                  </span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <button onClick={() => copy(selected.body)} className="toolbar-btn !text-paper/80">Copy Prompt</button>
                  <button onClick={saveEdit} className="toolbar-btn !text-paper/80">حفظ</button>
                  <button onClick={() => duplicate(selected)} className="toolbar-btn !text-paper/80">تكرار</button>
                  <button onClick={() => setShowVersions((s) => !s)} className="toolbar-btn !text-paper/80">
                    نسخ ({selected.versions.length})
                  </button>
                  <button onClick={() => remove(selected)} className="toolbar-btn !text-paper/80">حذف</button>
                </div>
              </div>

              {showVersions && (
                <div className="border-b hairline bg-paper-2 p-3 max-h-48 overflow-y-auto scrollbar-thin">
                  {selected.versions.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => setEditingBody(v.body)}
                      className="block w-full text-start px-2 py-1.5 text-[0.65rem] hover:bg-paper rounded"
                    >
                      <span className="font-mono text-ink2">v{i + 1}</span> · {fmtDate(v.at)} · {v.note}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                value={editingBody}
                onChange={(e) => setEditingBody(e.target.value)}
                dir="auto"
                rows={18}
                className="w-full p-4 font-mono text-[0.75rem] leading-relaxed bg-paper-2 outline-none resize-y"
                spellCheck={false}
              />
              <div className="px-4 py-2.5 border-t hairline text-[0.62rem] text-ink2">
                آخر تحديث: {fmtDate(selected.updatedAt)} — التعديل يحفظ نسخة قابلة للاستعادة (versioning).
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
