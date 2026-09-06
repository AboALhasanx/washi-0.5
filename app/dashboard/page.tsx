/**
 * app/dashboard/page.tsx — Studio dashboard (server component).
 * Reads build history + saved themes from .washi/ (lib/theme-server).
 */

import Link from "next/link";
import { loadBuilds, listThemes, loadSettings } from "@/lib/theme-server";
import { Logo } from "@/components/studio/Logo";

export const dynamic = "force-dynamic";

const fmtKB = (b: number) => `${(b / 1024).toFixed(0)} KB`;
const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" }); }
  catch { return iso; }
};

export default function DashboardPage() {
  const builds = loadBuilds();
  const themes = listThemes();
  const settings = loadSettings();

  const totalBytes = builds.reduce((s, b) => s + b.bytes, 0);
  const avgMs = builds.length ? Math.round(builds.reduce((s, b) => s + b.ms, 0) / builds.length) : 0;

  const cards: Array<{ label: string; value: string; hint: string }> = [
    { label: "مستندات مولّدة", value: String(builds.length), hint: "آخر ١٠٠ عملية بناء" },
    { label: "متوسط زمن الرندر", value: avgMs ? `${avgMs} ms` : "—", hint: "قوة محرك takumi" },
    { label: "حجم المخرجات", value: totalBytes ? fmtKB(totalBytes) : "—", hint: "إجمالي الـ PDF المولّد" },
    { label: "الثيمات المحفوظة", value: String(themes.length), hint: "قوالب قابلة للتبديل" },
  ];

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: "var(--paper-2)" }}>
      <header className="flex items-center justify-between px-5 h-14 border-b hairline sticky top-0 z-40" style={{ background: "var(--paper)" }}>
        <div className="flex items-center gap-3">
          <Logo size={28} />
          <span className="font-display font-black text-lg text-ink">لوحة التحكم</span>
          <span className="font-mono text-[0.6rem] text-ink2">v1.5</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/" className="btn-ghost !py-1.5 !text-xs">← الستوديو</Link>
          <Link href="/settings" className="btn-ghost !py-1.5 !text-xs">الإعدادات</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        {/* cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="border hairline rounded-2xl p-5 bg-paper">
              <p className="kicker text-[0.6rem] text-ink2 mb-2">{c.label}</p>
              <p className="font-display font-black text-3xl text-ink leading-none">{c.value}</p>
              <p className="text-[0.65rem] text-ink2 mt-2">{c.hint}</p>
            </div>
          ))}
        </section>

        {/* engine status */}
        <section className="border hairline rounded-2xl p-5 bg-paper">
          <p className="kicker text-[0.6rem] text-ink2 mb-3">حالة المحرك</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-ink2 text-xs">المحرك</p>
              <p className="font-bold text-ink">takumi-pdf 0.14.1</p>
            </div>
            <div>
              <p className="text-ink2 text-xs">الرياضيات</p>
              <p className="font-bold text-ink">MathJax → SVG (متجهة)</p>
            </div>
            <div>
              <p className="text-ink2 text-xs">مزوّد التلخيص</p>
              <p className="font-bold text-ink">{settings.provider} · {settings.model}</p>
            </div>
            <div>
              <p className="text-ink2 text-xs">المقاس الافتراضي</p>
              <p className="font-bold text-ink">A4 · RTL</p>
            </div>
          </div>
        </section>

        {/* recent builds */}
        <section className="border hairline rounded-2xl bg-paper overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b hairline">
            <p className="font-bold text-ink">آخر البناءات</p>
            <Link href="/" className="btn-primary !py-1.5 !px-4 !text-xs">توليد جديد</Link>
          </div>
          {builds.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-serif font-semibold text-ink mb-1">لا بناءات بعد</p>
              <p className="text-xs text-ink2">أول توليد PDF من الستوديو سيظهر هنا مع زمن الرندر والحجم.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink2 text-xs border-b hairline">
                  <th className="text-start px-5 py-2.5 font-medium">المستند</th>
                  <th className="text-start px-3 py-2.5 font-medium">الثيم</th>
                  <th className="text-start px-3 py-2.5 font-medium">الزمن</th>
                  <th className="text-start px-3 py-2.5 font-medium">الحجم</th>
                  <th className="text-start px-5 py-2.5 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {builds.slice(0, 12).map((b, i) => (
                  <tr key={i} className="border-b hairline last:border-0">
                    <td className="px-5 py-2.5 font-semibold text-ink max-w-[260px] truncate">{b.title}</td>
                    <td className="px-3 py-2.5 text-ink2 text-xs font-mono">{b.themeId}</td>
                    <td className="px-3 py-2.5 text-ink2 text-xs font-mono">{b.ms} ms</td>
                    <td className="px-3 py-2.5 text-ink2 text-xs font-mono">{fmtKB(b.bytes)}</td>
                    <td className="px-5 py-2.5 text-ink2 text-xs">{fmtDate(b.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
