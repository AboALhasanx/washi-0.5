"use client";

/**
 * app/trace/[id]/page.tsx — AST tracing / platform-consumption simulation.
 *
 * لا توجد منصة تعليمية حقيقية بعد — هذه الشاشة تحاكي ما ستفعله المنصة:
 * "اعرض هذا التعريف" / "اربط هذا السؤال بهذا المفهوم" / "هذه بطاقة فلاش".
 * الـ AST والـ provenance (المخفي، Admin/Debug فقط) يُعرَضان هنا للفحص.
 */

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Logo } from "@/components/studio/Logo";

interface ProvRef {
  document: string;
  pages?: number[];
  paragraphs?: number[];
  regions?: string[];
}

interface AstBlock {
  id: string;
  type: string;
  provenance?: ProvRef[];
  [k: string]: unknown;
}

interface DocumentAst {
  schema: string;
  generatedAt: string;
  frontmatter: any;
  sections: Array<{ id: string; name: string; heading: string; provenance?: ProvRef[]; nodes: AstBlock[] }>;
  stats: Record<string, number>;
}

interface AppContent {
  schema: string;
  title: string;
  subject: string;
  language: string;
  sections: Array<{ id: string; name: string; heading: string; blocks: Array<{ id: string; type: string }> }>;
  concepts: Array<{ id: string; term: string; definition: string; blockId: string; sectionId: string }>;
  questionCandidates: Array<{ id: string; text: string; sectionId: string; suggestedConceptIds: string[] }>;
  flashcards: Array<{ id: string; front: string; back: string; conceptId: string }>;
  stats: Record<string, number>;
}

const TYPE_LABEL: Record<string, string> = {
  heading: "عنوان",
  paragraph: "فقرة",
  definition: "تعريف",
  callout: "تنبيه",
  formula: "معادلة",
  table: "جدول",
  figure: "صورة",
  code: "كود",
  list: "قائمة",
  source: "مصدر",
};

export default function TracePage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const id = params?.id;
  const pubV = search?.get("v");

  const [data, setData] = React.useState<{ source: string; manifest: any; documentAst: DocumentAst; appContent: AppContent } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showProvenance, setShowProvenance] = React.useState(true);
  const [flipped, setFlipped] = React.useState<Record<string, boolean>>({});
  const [linked, setLinked] = React.useState<Record<string, string | null>>({});

  React.useEffect(() => {
    (async () => {
      try {
        const qs = pubV ? `?v=${pubV}` : "";
        const res = await fetch(`/api/projects/${id}/trace${qs}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "فشل التتبع");
        setData(json);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    })();
  }, [id, pubV]);

  if (error) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center" style={{ background: "var(--paper-2)" }}>
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center" style={{ background: "var(--paper-2)" }}>
        <p className="text-sm text-ink2">جارٍ التتبع…</p>
      </div>
    );
  }

  const { documentAst: ast, appContent } = data;

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: "var(--paper-2)" }}>
      <header className="flex items-center justify-between px-5 h-14 border-b hairline sticky top-0 z-40" style={{ background: "var(--paper)" }}>
        <div className="flex items-center gap-3">
          <Logo size={28} />
          <span className="font-display font-black text-lg text-ink">شاشة تتبع المنصة</span>
          <span className="font-mono text-[0.62rem] text-ink2">{data.source}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-ink2 cursor-pointer select-none">
            <input type="checkbox" checked={showProvenance} onChange={(e) => setShowProvenance(e.target.checked)} />
            Admin/Debug — provenance
          </label>
          <Link href={`/projects/${id}`} className="btn-ghost !py-1.5 !text-xs">← المشروع</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-5 space-y-6">
        {/* stats */}
        <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {([
            ["أقسام", ast.stats.sections],
            ["بلوكات", ast.stats.blocks],
            ["تعريفات", ast.stats.definitions],
            ["معادلات", ast.stats.formulas],
            ["مفاهيم للمنصة", appContent.stats.concepts],
            ["أسئلة مرشحة", appContent.stats.questionCandidates],
          ] as Array<[string, number]>).map(([label, value]) => (
            <div key={label} className="border hairline rounded-2xl p-4 bg-paper">
              <p className="kicker text-[0.58rem] text-ink2 mb-1.5">{label}</p>
              <p className="font-display font-black text-2xl text-ink leading-none">{value}</p>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* AST tree */}
          <section className="border hairline rounded-2xl bg-paper overflow-hidden">
            <div className="px-4 py-2.5 border-b hairline bg-ink text-paper flex items-center justify-between">
              <span className="font-mono text-[0.72rem] text-paper/60">document.ast — {ast.schema}</span>
              <span className="font-mono text-[0.62rem] text-paper/40">{ast.generatedAt.slice(0, 19)}</span>
            </div>
            <div className="p-4 space-y-4 max-h-[640px] overflow-y-auto scrollbar-thin">
              {ast.sections.map((sec) => (
                <div key={sec.id}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-[0.62rem] px-1.5 py-0.5 rounded bg-paper-2 text-ink2">{sec.id}</span>
                    <p className="text-sm font-bold text-ink">{sec.heading}</p>
                    {showProvenance && sec.provenance?.length ? (
                      <span className="font-mono text-[0.58rem] text-amber-700">⟵ provenance ×{sec.provenance.length}</span>
                    ) : null}
                  </div>
                  <ul className="space-y-1 pr-4">
                    {sec.nodes.map((n) => (
                      <li key={n.id} className="text-xs flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[0.58rem] px-1.5 py-0.5 rounded bg-paper-2 text-ink2">{n.id}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[0.58rem] font-bold bg-accentSoft text-accentDeep">{TYPE_LABEL[n.type] ?? n.type}</span>
                        <span className="text-ink2 truncate max-w-[280px]">
                          {String(n.term ?? n.text ?? n.caption ?? n.latex ?? n.raw ?? "")?.slice(0, 60)}
                        </span>
                        {showProvenance && n.provenance?.length ? (
                          <span className="font-mono text-[0.55rem] text-amber-700" dir="ltr" title="hidden provenance">
                            ⌖ {n.provenance.map((p) => `${p.document}${p.pages ? ` p.${p.pages.join(",")}` : ""}`).join(" | ")}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-5">
            {/* platform concepts / definitions */}
            <section className="border hairline rounded-2xl bg-paper overflow-hidden">
              <div className="px-4 py-2.5 border-b hairline bg-ink text-paper">
                <span className="font-mono text-[0.72rem] text-paper/60">محاكاة المنصة — «اعرض هذا التعريف» ({appContent.schema})</span>
              </div>
              <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin">
                {appContent.concepts.length === 0 && <p className="text-xs text-ink2">لا تعريفات في المستند.</p>}
                {appContent.concepts.map((c) => (
                  <div key={c.id} className="border hairline rounded-xl p-3 bg-paper-2">
                    <p className="text-sm font-bold text-ink">{c.term}</p>
                    <p className="text-xs text-ink2 mt-1 leading-relaxed">{c.definition}</p>
                    <p className="font-mono text-[0.55rem] text-ink2 mt-2">concept {c.id} ← block {c.blockId}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* flashcards */}
            <section className="border hairline rounded-2xl bg-paper overflow-hidden">
              <div className="px-4 py-2.5 border-b hairline bg-ink text-paper">
                <span className="font-mono text-[0.72rem] text-paper/60">محاكاة المنصة — بطاقات فلاش (اضغط للقلب)</span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto scrollbar-thin">
                {appContent.flashcards.length === 0 && <p className="text-xs text-ink2">لا بطاقات (تُشتق من التعاريف).</p>}
                {appContent.flashcards.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFlipped((s) => ({ ...s, [f.id]: !s[f.id] }))}
                    className="border hairline rounded-xl p-3 text-start bg-paper-2 hover:border-ink transition-colors"
                  >
                    {flipped[f.id] ? (
                      <p className="text-xs text-ink2 leading-relaxed">{f.back}</p>
                    ) : (
                      <p className="text-sm font-bold text-ink">{f.front}</p>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* questions → concepts linking */}
            <section className="border hairline rounded-2xl bg-paper overflow-hidden">
              <div className="px-4 py-2.5 border-b hairline bg-ink text-paper">
                <span className="font-mono text-[0.72rem] text-paper/60">محاكاة المنصة — «اربط السؤال بالمفهوم»</span>
              </div>
              <div className="p-4 space-y-2 max-h-[240px] overflow-y-auto scrollbar-thin">
                {appContent.questionCandidates.length === 0 && (
                  <p className="text-xs text-ink2">لا أسئلة مرشحة — تُستخرج من قوائم قسم «أسئلة مراجعة».</p>
                )}
                {appContent.questionCandidates.map((q) => (
                  <div key={q.id} className="flex items-center gap-2 flex-wrap text-xs border hairline rounded-xl p-2.5 bg-paper-2">
                    <span className="text-ink flex-1 min-w-[200px]">{q.text}</span>
                    <select
                      value={linked[q.id] ?? ""}
                      onChange={(e) => setLinked((s) => ({ ...s, [q.id]: e.target.value || null }))}
                      className="border hairline rounded-lg px-2 py-1 text-[0.68rem] bg-paper outline-none"
                    >
                      <option value="">— اربط بمفهوم —</option>
                      {appContent.concepts.map((c) => (
                        <option key={c.id} value={c.id}>{c.term}</option>
                      ))}
                    </select>
                    {linked[q.id] && (
                      <span className="text-[0.58rem] font-mono text-emerald-700">✓ {q.id} ← {linked[q.id]}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
