"use client";

import * as React from "react";
import { UploadDropzone } from "@/components/UploadDropzone";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { PdfPreview } from "@/components/PdfPreview";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4;
type Theme = "system" | "light" | "dark";

const STEPS: { n: Step; label: string; short: string }[] = [
  { n: 1, label: "Upload",    short: "Upload"  },
  { n: 2, label: "Summarize", short: "Params"  },
  { n: 3, label: "Edit",      short: "Edit"    },
  { n: 4, label: "PDF",       short: "PDF"     },
];

export default function WizardPage() {
  /* ─── Theme ─── */
  const [theme, setTheme] = React.useState<Theme>("system");

  React.useEffect(() => {
    const stored = (typeof window !== "undefined"
      ? (localStorage.getItem("ap-theme") as Theme | null)
      : null) ?? "system";
    setTheme(stored);
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
    try { localStorage.setItem("ap-theme", theme); } catch {}
  }, [theme]);

  /* ─── Step 1: extraction ─── */
  const [extractedText, setExtractedText] = React.useState<string>("");
  const [numPages, setNumPages] = React.useState<number>(0);
  const [extractedFileName, setExtractedFileName] = React.useState<string>("");

  /* ─── Step 2: params + summarization ─── */
  const [subject, setSubject] = React.useState<string>("computer-networks");
  const [title, setTitle] = React.useState<string>("Transport Layer");
  const [language, setLanguage] = React.useState<"ar" | "en">("ar");
  const [sourceDocument, setSourceDocument] = React.useState<string>("");
  const [sourcePages, setSourcePages] = React.useState<string>("142, 143");
  const [summarizeLoading, setSummarizeLoading] = React.useState(false);
  const [summarizeError, setSummarizeError] = React.useState<string | null>(null);

  /* ─── Step 3: editor ─── */
  const [markdown, setMarkdown] = React.useState<string>("");
  const [editorCollapsed, setEditorCollapsed] = React.useState(false);

  /* ─── Step 4: PDF generation ─── */
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = React.useState<Blob | null>(null);
  const [ast, setAst] = React.useState<unknown | null>(null);
  const [generateLoading, setGenerateLoading] = React.useState(false);
  const [generateError, setGenerateError] = React.useState<string | null>(null);
  const [generateNote, setGenerateNote] = React.useState<string | null>(null);

  const [activeStep, setActiveStep] = React.useState<Step>(1);

  /* ─── Effects ─── */
  React.useEffect(() => {
    if (extractedFileName && !sourceDocument) setSourceDocument(extractedFileName);
  }, [extractedFileName, sourceDocument]);

  React.useEffect(() => {
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [pdfUrl]);

  /* ─── Scroll to step on click ─── */
  const goToStep = (n: Step) => {
    setActiveStep(n);
    const el = document.getElementById(`step${n}`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  /* ─── Handlers ─── */
  const handleExtract = (data: { text: string; numPages: number; fileName: string }) => {
    setExtractedText(data.text);
    setNumPages(data.numPages);
    setExtractedFileName(data.fileName);
    setSourceDocument(data.fileName);
    setActiveStep(2);
    setSummarizeError(null);
  };

  const handleSummarize = async () => {
    setSummarizeError(null);
    if (!extractedText.trim()) {
      setSummarizeError("Extract a PDF chapter first (Step 1).");
      return;
    }
    if (!subject.trim() || !title.trim() || !sourceDocument.trim()) {
      setSummarizeError("Subject, title and sourceDocument are required.");
      return;
    }
    setSummarizeLoading(true);
    try {
      let sp: string | number[] | undefined = undefined;
      const raw = sourcePages.trim();
      if (raw) {
        const nums = raw
          .replace(/^\[|\]$/g, "")
          .split(/[\s,;\-]+/)
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !Number.isNaN(n) && n > 0);
        if (nums.length > 0) {
          sp = nums.length === 1 ? nums : nums;
          sp = raw;
        } else {
          sp = raw;
        }
      }
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterText: extractedText,
          subject: subject.trim(),
          title: title.trim(),
          language,
          sourceDocument: sourceDocument.trim(),
          sourcePages: sp,
          theme: "default",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.message || `Summarize failed (${res.status})`;
        const issues = data?.issues ? ` — ${JSON.stringify(data.issues)}` : "";
        throw new Error(msg + issues);
      }
      if (typeof data.markdown !== "string" || !data.markdown.trim()) {
        throw new Error("Summarize returned empty markdown");
      }
      setMarkdown(data.markdown);
      setActiveStep(3);
    } catch (e: any) {
      setSummarizeError(e?.message ?? String(e));
    } finally {
      setSummarizeLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    setGenerateError(null);
    setGenerateNote(null);
    if (!markdown.trim()) {
      setGenerateError("Markdown is empty — generate summary or paste markdown in editor.");
      return;
    }
    setGenerateLoading(true);
    if (pdfUrl) { URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }
    setPdfBlob(null);
    setAst(null);
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/pdf")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setPdfBlob(blob);
        const note = res.headers.get("x-ast-note");
        if (note) setGenerateNote(note);
        setActiveStep(4);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.message || `Generate failed (${res.status})`;
        const issues = data?.issues ? ` — ${JSON.stringify(data.issues).slice(0, 800)}` : "";
        throw new Error(msg + issues);
      }
      if (data.ast) {
        setAst(data.ast);
        if (data.note) setGenerateNote(data.note);
        setActiveStep(4);
      } else {
        setAst(data);
        setGenerateNote(data.note ?? null);
        setActiveStep(4);
      }
    } catch (e: any) {
      setGenerateError(e?.message ?? String(e));
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleCopyExtracted = async () => {
    try { await navigator.clipboard.writeText(extractedText); } catch {}
  };

  const getRailState = (n: Step): "done" | "active" | "pending" => {
    if (activeStep > n) return "done";
    if (activeStep === n) return "active";
    return "pending";
  };

  // Prefer the frontmatter title of the actual markdown over the Step-2
  // placeholder, so downloaded files carry the chapter's real name.
  const fmTitle = markdown
    .match(/^---\n([\s\S]*?)\n---/m)?.[1]
    ?.match(/^title:\s*(.+)$/m)?.[1]
    ?.trim()
    ?.replace(/^["']|["']$/g, "");
  const downloadName = (fmTitle || title || "chapter").replace(/[^\p{L}\p{N}\s_-]/gu, "_").trim() || "washi";

  return (
    <>
      <div className="grain" aria-hidden="true" />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-ink focus:text-paper focus:px-3 focus:py-2 text-sm"
      >
        Skip to content
      </a>

      {/* ════════════ MASTHEAD ════════════ */}
      <header className="border-b hairline border-b-[1.5px] sticky top-0 z-40 backdrop-blur-[2px]" style={{ backgroundColor: "color-mix(in srgb, var(--paper) 92%, transparent)" }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-4 flex items-center justify-between gap-4">
          <h1
            className="font-display font-black leading-none tracking-tightest"
            style={{ fontSize: "clamp(1.5rem, 2.4vw, 1.9rem)" }}
          >
            Washi
          </h1>
          <nav className="flex items-center gap-2 no-print" aria-label="Document actions">
            <ThemeToggle theme={theme} onChange={setTheme} />
            <a className="btn-ghost no-print" href="#main">Start</a>
          </nav>
        </div>
      </header>

      {/* ════════════ SHELL: RAIL + MAIN ════════════ */}
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 flex gap-10 lg:gap-14 py-10">

        {/* ─── STICKY PIPELINE RAIL (desktop) ─── */}
        <aside className="hidden lg:block w-[180px] shrink-0" aria-label="Pipeline progress">
          <div className="sticky top-[96px]">
            <ol className="space-y-5">
              {STEPS.map((s) => {
                const state = getRailState(s.n);
                return (
                  <li key={s.n} className="rail-node" data-state={state}>
                    <button
                      onClick={() => goToStep(s.n)}
                      className="flex gap-3 text-left w-full"
                    >
                      <div className="rail-dot" aria-hidden="true">
                        {state === "done" ? "✓" : `0${s.n}`}
                      </div>
                      <div className="pt-1">
                        <p
                          className={cn(
                            "font-serif font-semibold text-[0.95rem] leading-tight",
                            state === "active" ? "text-accent"
                              : state === "done" ? "text-ink"
                              : "text-ink-2"
                          )}
                        >
                          {s.label}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        {/* ─── MOBILE RAIL (bottom fixed) ─── */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-ink text-paper no-print">
          <div className="flex">
            {STEPS.map((s) => {
              const state = getRailState(s.n);
              return (
                <button
                  key={s.n}
                  onClick={() => goToStep(s.n)}
                  className={cn(
                    "flex-1 py-3 text-center border-r border-white/10 transition-colors",
                    state === "active" ? "bg-accent" : "opacity-60"
                  )}
                >
                  <span className="block font-mono text-[0.65rem]">0{s.n}</span>
                  <span className="block text-[0.68rem] mt-0.5">{s.short}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ════════════ MAIN ════════════ */}
        <main id="main" className="flex-1 min-w-0 space-y-16 pb-24">

          {/* ════════ STEP 1: UPLOAD + EXTRACT ════════ */}
          <section id="step1" aria-labelledby="step1-h" className="space-y-6">
            <div>
              <p className="kicker mb-2">01</p>
              <h2 id="step1-h" className="text-editorial-display tracking-tightest">
                Upload
              </h2>
            </div>
            <div className="rule"></div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <UploadDropzone onExtract={handleExtract} />
              </div>

              <div className="flex flex-col border hairline editorial-shadow">
                <div className="flex items-center justify-between px-4 py-2.5 border-b hairline bg-paper-2">
                  <p className="kicker !text-[0.62rem]">Extracted Text</p>
                  <div className="flex items-center gap-3">
                    {extractedText && (
                      <span className="num-badge">
                        {extractedText.length.toLocaleString()} chars
                      </span>
                    )}
                    {numPages > 0 && <span className="num-badge">{numPages} pages</span>}
                    <button
                      onClick={handleCopyExtracted}
                      disabled={!extractedText}
                      className="toolbar-btn !text-xs"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                {extractedText ? (
                  <div className="p-5 overflow-y-auto scrollbar-thin flex-1 max-h-[300px] font-serif text-[0.93rem] leading-relaxed text-ink-2">
                    <pre className="whitespace-pre-wrap break-words">
                      {extractedText.slice(0, 12000)}
                      {extractedText.length > 12000
                        ? "\n… (truncated preview, full text sent to summarizer)"
                        : ""}
                    </pre>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-8 text-center min-h-[300px]">
                    <p className="text-sm text-ink-2">
                      No text yet. Upload a PDF to see extracted plain text here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => goToStep(2)}
                disabled={!extractedText}
                className="btn-primary"
              >
                Continue →
              </button>
            </div>
          </section>

          {/* ════════ STEP 2: PARAMS + SUMMARIZE ════════ */}
          <section id="step2" aria-labelledby="step2-h" className="space-y-6">
            <div>
              <p className="kicker mb-2">02</p>
              <h2 id="step2-h" className="text-editorial-display tracking-tightest">
                Summarize
              </h2>
            </div>
            <div className="rule"></div>

            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10">
              <div className="space-y-5">
                <div>
                  <label className="kicker !text-[0.65rem] block mb-1.5">Subject Slug *</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="computer-networks"
                    className="field"
                  />
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  <div>
                    <label className="kicker !text-[0.65rem] block mb-1.5">Chapter Title *</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Transport Layer"
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="kicker !text-[0.65rem] block mb-1.5">Language *</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as "ar" | "en")}
                      className="field"
                    >
                      <option value="ar">Arabic</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  <div>
                    <label className="kicker !text-[0.65rem] block mb-1.5">Source Document *</label>
                    <input
                      value={sourceDocument}
                      onChange={(e) => setSourceDocument(e.target.value)}
                      placeholder="Computer Networks.pdf"
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="kicker !text-[0.65rem] block mb-1.5">Source Pages</label>
                    <input
                      value={sourcePages}
                      onChange={(e) => setSourcePages(e.target.value)}
                      placeholder="142, 143"
                      className="field font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t hairline mt-1">
                  <p className="text-xs text-ink-2 pt-3">
                    {summarizeLoading ? "Running…" : "Ready to run"}
                  </p>
                  <button
                    type="button"
                    onClick={handleSummarize}
                    disabled={summarizeLoading || !extractedText}
                    className="btn-primary mt-3"
                  >
                    {summarizeLoading ? "Summarizing…" : "Run Summarize →"}
                  </button>
                </div>

                {summarizeError && (
                  <div className="border border-err/30 bg-err/5 px-3 py-2 text-sm text-err">
                    {summarizeError}
                  </div>
                )}
              </div>

              <div className="border hairline editorial-shadow flex flex-col">
                <div className="px-4 py-2.5 border-b hairline bg-paper-2 flex items-center justify-between">
                  <p className="kicker !text-[0.62rem]">Structure Contract</p>
                  <span className="num-badge">strict</span>
                </div>
                <div className="p-5 space-y-4 flex-1">
                  <div>
                    <p className="kicker !text-[0.62rem] mb-2">Frontmatter (5)</p>
                    <ol className="space-y-1 font-mono text-[0.78rem] text-ink-2">
                      <li>01 · title</li>
                      <li>02 · author</li>
                      <li>03 · abstract</li>
                      <li>04 · keywords</li>
                      <li>05 · citation</li>
                    </ol>
                  </div>
                  <div className="rule"></div>
                  <div>
                    <p className="kicker !text-[0.62rem] mb-2">Sections (7)</p>
                    <ol className="space-y-1 font-mono text-[0.78rem] text-ink-2">
                      <li>01 · Overview</li>
                      <li>02 · Core Concepts</li>
                      <li>03 · Definitions</li>
                      <li>04 · Formulas</li>
                      <li>05 · Worked Examples</li>
                      <li>06 · Key Points</li>
                      <li>07 · Review</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ════════ STEP 3: EDIT MARKDOWN ════════ */}
          <section id="step3" aria-labelledby="step3-h" className="space-y-6">
            <div>
              <p className="kicker mb-2">03</p>
              <h2 id="step3-h" className="text-editorial-display tracking-tightest">
                Edit
              </h2>
            </div>
            <div className="rule"></div>

            {!markdown && !editorCollapsed ? (
              <div className="dropzone p-10 flex flex-col items-center justify-center text-center min-h-[180px]">
                <p className="font-serif font-semibold text-lg text-ink">No markdown yet</p>
                <p className="text-sm text-ink-2 mt-1.5 max-w-md">
                  Complete Step 02 or paste your own markdown. The editor validates live.
                </p>
                <button
                  onClick={() =>
                    setMarkdown(`---\nsubject: ${subject || "computer-networks"}\ntheme: default\ntitle: ${title || "Chapter Title"}\nlanguage: ${language}\nsources:\n  - document: ${sourceDocument || "Source.pdf"}\n    pages: [142, 143]\n---\n\n## Overview\n\n… Overview — 1–2 paragraphs, why it matters.\n\n<!-- source: ${sourceDocument || "Source.pdf"} p.142 -->\n\n## Core Concepts\n\n### Key Concept\n\n…\n\n## Definitions\n\n> [!NOTE]\n> **Term:** Definition here.\n\n## Formulas\n\n$$\nThroughput = \\frac{Window\\ Size}{RTT}\n$$\n\n## Worked Examples\n\n> [!EXAMPLE]\n> **Example:** Calculate throughput if Window=64KB and RTT=50ms\n\n## Key Points\n\n> [!IMPORTANT]\n> Summary of the most important takeaways.\n\n> [!WARNING]\n> Common pitfall to avoid.\n\n## Review\n\n1. Question one?\n`)
                  }
                  className="btn-ghost mt-4"
                >
                  Load template
                </button>
              </div>
            ) : null}

            {editorCollapsed ? (
              <div className="border hairline px-4 py-3 text-center text-xs text-ink-2">
                Editor collapsed — {markdown.length.toLocaleString()} chars
              </div>
            ) : (
              <MarkdownEditor value={markdown} onChange={setMarkdown} />
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditorCollapsed((v) => !v)}
                className="btn-ghost"
              >
                {editorCollapsed ? "Expand" : "Collapse"}
              </button>
              <button
                onClick={() => goToStep(4)}
                disabled={!markdown.trim()}
                className="btn-ghost"
              >
                Next →
              </button>
              <button
                onClick={handleGeneratePdf}
                disabled={generateLoading || !markdown.trim()}
                className="btn-primary"
              >
                {generateLoading ? "Generating…" : "Generate PDF ↓"}
              </button>
            </div>
          </section>

          {/* ════════ STEP 4: GENERATE PDF ════════ */}
          <section id="step4" aria-labelledby="step4-h" className="space-y-6">
            <div>
              <p className="kicker mb-2">04</p>
              <h2 id="step4-h" className="text-editorial-display tracking-tightest">
                PDF
              </h2>
            </div>
            <div className="rule"></div>

            {generateError && (
              <div className="border border-err/30 bg-err/5 px-3 py-2 text-sm text-err">
                {generateError}
              </div>
            )}
            {generateNote && (
              <div className="border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn">
                {generateNote}
              </div>
            )}

            <PdfPreview
              pdfUrl={pdfUrl}
              pdfBlob={pdfBlob}
              ast={ast}
              markdown={markdown}
              title={title}
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleGeneratePdf}
                disabled={generateLoading || !markdown.trim()}
                className="btn-ghost"
              >
                Regenerate
              </button>
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  download={`${downloadName}.pdf`}
                  className="btn-primary"
                >
                  Download
                </a>
              )}
            </div>
          </section>

        </main>
      </div>
    </>
  );
}

/* ─── Theme toggle ─── */
function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const opts: { v: Theme; label: string; icon: React.ReactNode }[] = [
    { v: "light", label: "Light",  icon: <SunIcon /> },
    { v: "dark",  label: "Dark",   icon: <MoonIcon /> },
    { v: "system",label: "Auto",   icon: <AutoIcon /> },
  ];
  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex border hairline"
      style={{ borderRadius: 2 }}
    >
      {opts.map((o, i) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          aria-label={`${o.label} theme`}
          aria-pressed={theme === o.v}
          className={cn(
            "px-2.5 py-1.5 inline-flex items-center justify-center transition-colors",
            i > 0 ? "border-l hairline" : "",
            theme === o.v ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2"
          )}
          title={o.label}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function AutoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="1" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}
