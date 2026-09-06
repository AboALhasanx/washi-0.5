"use client";

/**
 * app/projects/page.tsx — Washi 0.5 document projects.
 * Create a project by pasting Markdown from an external AI (or importing a
 * sample). The project = content.md + metadata.json + template.json + assets/.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/studio/Logo";

interface ProjectMeta {
  id: string;
  title: string;
  subject: string;
  language: "ar" | "en";
  status: "draft" | "review" | "published";
  updatedAt: string;
  currentVersion: number;
  publicationCount: number;
  lastValidation?: { at: string; ok: boolean; errors: number; warnings: number };
}

// The comprehensive sample chapter lives in public/samples/ — a real
// repository artifact covering the full component vocabulary (definitions,
// callout variants, block/inline math, tables, code, worked examples).
const SAMPLE_URL = "/samples/computer-networks-ch1.md";

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
};

const statusLabel: Record<string, string> = {
  draft: "مسودة",
  review: "مراجعة بشرية",
  published: "منشور",
};

export default function ProjectsPage() {
  const [projects, setProjects] = React.useState<ProjectMeta[]>([]);
  const [markdown, setMarkdown] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const router = useRouter();

  const load = React.useCallback(async () => {
    const res = await fetch("/api/projects");
    const json = await res.json();
    setProjects(json.projects ?? []);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, title }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? json.error ?? "خطأ");
      // Land the author directly in the new workspace — creating a project
      // is only ever the first step of an authoring session.
      router.push(`/projects/${json.project.id}`);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: "var(--paper-2)" }}>
      <header className="flex items-center justify-between px-5 h-14 border-b hairline sticky top-0 z-40" style={{ background: "var(--paper)" }}>
        <div className="flex items-center gap-3">
          <Logo size={28} />
          <span className="font-display font-black text-lg text-ink">مشاريع Washi 0.5</span>
          <span className="font-mono text-[0.6rem] text-ink2">Educational Content Publisher</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/" className="btn-ghost !py-1.5 !text-xs">الستوديو</Link>
          <Link href="/dashboard" className="btn-ghost !py-1.5 !text-xs">لوحة التحكم</Link>
          <Link href="/prompts" className="btn-ghost !py-1.5 !text-xs">مكتبة Prompts</Link>
          <button onClick={() => setShowCreate((s) => !s)} className="btn-primary !py-1.5 !px-4 !text-xs">
            + مشروع جديد
          </button>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {showCreate && (
          <section className="border hairline rounded-2xl p-5 bg-paper space-y-3">
            <p className="kicker text-[0.6rem] text-ink2">استيراد من AI خارجي</p>
            <p className="text-xs text-ink2">
              الصق الـ Markdown الناتج عن الـ AI الخارجي (ChatGPT / Claude / Gemini / Kimi).
              الواجهة الأمامية والـ subject والـ language تُقرأ من الـ frontmatter، والعنوان يدوياً اختياري.
            </p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان المشروع (اختياري — يُشتق من frontmatter)"
              className="w-full border hairline rounded-xl px-4 py-2.5 text-sm bg-paper-2 outline-none focus:border-ink"
            />
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              rows={12}
              placeholder="---\nsubject: ...\ntitle: ...\n---\n\n# الفصل ..."
              className="w-full border hairline rounded-xl px-4 py-3 font-mono text-[0.78rem] leading-relaxed bg-paper-2 outline-none focus:border-ink"
              dir="auto"
            />
            <div className="flex items-center gap-2">
              <button onClick={create} disabled={busy || !markdown.trim()} className="btn-primary !py-2 !px-5 !text-xs">
                {busy ? "جارٍ الإنشاء…" : "إنشاء المشروع"}
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(SAMPLE_URL);
                    if (!res.ok) throw new Error(`فشل جلب النموذج (${res.status})`);
                    setMarkdown(await res.text());
                  } catch (e: any) {
                    setError(e?.message ?? String(e));
                  }
                }}
                className="btn-ghost !py-2 !px-4 !text-xs"
              >
                إدراج النموذج الشامل (فصل كامل)
              </button>
              {error && <span className="text-xs text-red-700">{error}</span>}
            </div>
          </section>
        )}

        {projects.length === 0 ? (
          <div className="border hairline border-dashed rounded-2xl bg-paper p-12 text-center">
            <p className="font-serif font-semibold text-lg text-ink mb-1">لا مشاريع بعد</p>
            <p className="text-sm text-ink2 mb-4">أنشئ مشروعاً من Markdown جاهز لتبدأ دورة التأليف.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary !py-2 !px-5 !text-xs">
              + مشروع جديد
            </button>
          </div>
        ) : (
          <section className="border hairline rounded-2xl bg-paper overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b hairline">
              <p className="font-bold text-ink">المشاريع</p>
              <span className="text-xs text-ink2 font-mono">{projects.length}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink2 text-xs border-b hairline">
                  <th className="text-start px-5 py-2.5 font-medium">العنوان</th>
                  <th className="text-start px-3 py-2.5 font-medium">المادة</th>
                  <th className="text-start px-3 py-2.5 font-medium">الحالة</th>
                  <th className="text-start px-3 py-2.5 font-medium">النسخة</th>
                  <th className="text-start px-3 py-2.5 font-medium">المنشورات</th>
                  <th className="text-start px-3 py-2.5 font-medium">آخر تحديث</th>
                  <th className="text-start px-5 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-b hairline last:border-0">
                    <td className="px-5 py-3 font-semibold text-ink max-w-[240px] truncate">{p.title}</td>
                    <td className="px-3 py-3 text-ink2 text-xs font-mono">{p.subject}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {statusLabel[p.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink2 text-xs font-mono">v{p.currentVersion}</td>
                    <td className="px-3 py-3 text-ink2 text-xs font-mono">{p.publicationCount}</td>
                    <td className="px-3 py-3 text-ink2 text-xs">{fmtDate(p.updatedAt)}</td>
                    <td className="px-5 py-3">
                      <Link href={`/projects/${p.id}`} className="btn-primary !py-1.5 !px-4 !text-xs">فتح</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}
