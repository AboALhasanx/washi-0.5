"use client";

/**
 * app/settings/page.tsx — Studio settings, persisted server-side via
 * /api/settings (stored in .washi/settings.json).
 */

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/studio/Logo";
import { AVAILABLE_FONT_STACKS } from "@/lib/theme";

interface Settings {
  defaultLanguage: "ar" | "en";
  defaultSubject: string;
  editorFontSize: number;
  autoPreview: boolean;
  provider: string;
  model: string;
  uiTheme: "system" | "light" | "dark";
}

export default function SettingsPage() {
  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings))
      .catch((e) => setError(String(e)));
  }, []);

  const patch = (p: Partial<Settings>) => setSettings((s) => (s ? { ...s, ...p } : s));

  const handleSave = async () => {
    if (!settings) return;
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "save failed");
      setSettings(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: "var(--paper-2)" }}>
      <header className="flex items-center justify-between px-5 h-14 border-b hairline sticky top-0 z-40" style={{ background: "var(--paper)" }}>
        <div className="flex items-center gap-3">
          <Logo size={28} />
          <span className="font-display font-black text-lg text-ink">الإعدادات</span>
          <span className="font-mono text-[0.6rem] text-ink2">v1.5</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/" className="btn-ghost !py-1.5 !text-xs">← الستوديو</Link>
          <Link href="/dashboard" className="btn-ghost !py-1.5 !text-xs">لوحة التحكم</Link>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        {!settings ? (
          <p className="text-sm text-ink2 p-6">…تحمّل الإعدادات</p>
        ) : (
          <>
            <section className="border hairline rounded-2xl p-5 bg-paper space-y-4">
              <p className="kicker text-[0.6rem] text-ink2">الافتراضيات</p>
              <label className="block">
                <span className="text-xs text-ink2">لغة المستند الافتراضية</span>
                <select
                  value={settings.defaultLanguage}
                  onChange={(e) => patch({ defaultLanguage: e.target.value as "ar" | "en" })}
                  className="w-full border hairline rounded-lg px-3 py-2 text-sm bg-paper text-ink mt-1"
                >
                  <option value="ar">العربية (RTL)</option>
                  <option value="en">English (LTR)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-ink2">المادة الافتراضية (subject slug)</span>
                <input
                  value={settings.defaultSubject}
                  onChange={(e) => patch({ defaultSubject: e.target.value })}
                  className="w-full border hairline rounded-lg px-3 py-2 text-sm bg-paper text-ink mt-1 font-mono"
                />
              </label>
            </section>

            <section className="border hairline rounded-2xl p-5 bg-paper space-y-4">
              <p className="kicker text-[0.6rem] text-ink2">المحرر</p>
              <label className="block">
                <span className="text-xs text-ink2">حجم خط المحرر: {settings.editorFontSize}px</span>
                <input
                  type="range" min={11} max={18} step={1}
                  value={settings.editorFontSize}
                  onChange={(e) => patch({ editorFontSize: Number(e.target.value) })}
                  className="w-full accent-accent"
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.autoPreview}
                  onChange={(e) => patch({ autoPreview: e.target.checked })}
                />
                <span className="text-xs text-ink2">معاينة حية تلقائية (بدونها اضغط تحديث يدوياً)</span>
              </label>
            </section>

            <section className="border hairline rounded-2xl p-5 bg-paper space-y-4">
              <p className="kicker text-[0.6rem] text-ink2">سير عمل الـ AI</p>
              <p className="text-[0.72rem] text-ink2 leading-relaxed">
                في Washi 0.5 الـ AI خارجي بالتصميم: جهّز الـ prompt من
                <a href="/prompts" className="text-accent font-semibold mx-1">مكتبة الـ Prompts</a>
                وشغّله في ChatGPT / Claude / Gemini / Kimi، ثم أعِد بالـ Markdown وأنشئ مشروعاً من صفحة
                <a href="/projects" className="text-accent font-semibold mx-1">المشاريع</a>.
                لا يوجد تكامل مزوّد داخل Washi — وهذا مقصود.
              </p>
            </section>

            <section className="border hairline rounded-2xl p-5 bg-paper">
              <p className="kicker text-[0.6rem] text-ink2 mb-3">حول washi</p>
              <div className="flex items-center gap-3 mb-3">
                <Logo size={40} />
                <div>
                  <p className="font-display font-black text-ink">washi studio</p>
                  <p className="text-[0.68rem] text-ink2 font-mono">v1.5.0 · takumi-pdf 0.14.1 · MathJax SVG math</p>
                </div>
              </div>
              <p className="text-[0.68rem] text-ink2 leading-relaxed">
                محلي بالكامل: لا شيء يغادر جهازك. الخطوط OFL ملتزمة محلياً، والثيمات والسجلات تُخزّن في <code className="font-mono">.washi/</code>.
              </p>
            </section>

            <div className="flex items-center gap-3">
              <button onClick={handleSave} className="btn-primary !py-2.5 !px-6">حفظ الإعدادات</button>
              {saved && <span className="text-ok text-xs font-bold">حُفظ ✓</span>}
              {error && <span className="text-err text-xs">{error}</span>}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
