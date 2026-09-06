"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PdfPreviewProps {
  pdfUrl?: string | null;
  pdfBlob?: Blob | null;
  ast?: unknown | null;
  markdown?: string;
  title?: string;
  className?: string;
  onDownload?: () => void;
}

export function PdfPreview({ pdfUrl, pdfBlob, ast, markdown, title, className, onDownload }: PdfPreviewProps) {
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setObjectUrl(null);
  }, [pdfBlob]);

  const effectiveUrl = objectUrl ?? pdfUrl ?? null;

  const handleCopyAst = async () => {
    if (!ast) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(ast, null, 2));
    } catch {}
  };

  const handleCopyMarkdown = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {}
  };

  if (effectiveUrl) {
    const downloadName = title
      ? `${title.replace(/[^a-z0-9\u0600-\u06FF_-]/gi, "_")}.pdf`
      : "chapter.pdf";

    return (
      <div className={cn("border hairline editorial-shadow-lg", className)}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b hairline bg-ink text-paper flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <span className="font-mono text-[0.72rem] px-2 text-paper/60">PDF Preview</span>
            {title && (
              <span className="hidden font-mono text-[0.68rem] text-paper/40 sm:inline">— {title}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <a
              href={effectiveUrl}
              download={downloadName}
              className="toolbar-btn !text-paper/80"
            >
              Download
            </a>
            <a
              href={effectiveUrl}
              target="_blank"
              rel="noreferrer"
              className="toolbar-btn !text-paper/80"
            >
              Open
            </a>
          </div>
        </div>

        {/* Preview frame */}
        <div className="bg-paper2 p-6 sm:p-12 flex justify-center overflow-y-auto scrollbar-thin max-h-[640px]">
          <div className="page-sheet w-full max-w-[560px] overflow-hidden">
            <object
              data={effectiveUrl}
              type="application/pdf"
              className="w-full h-[720px]"
            >
              <iframe
                src={effectiveUrl}
                title="PDF preview"
                className="w-full h-[720px]"
              />
            </object>
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t hairline bg-paper2 flex-wrap gap-2">
          <p className="text-xs text-ink2">
            Rendered via takumi-pdf · pdfcn layout
          </p>
          <div className="flex gap-2">
            <a
              href={effectiveUrl}
              download={downloadName}
              className="btn-primary !py-1.5 !text-xs"
            >
              Download PDF
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (ast) {
    return (
      <div className={cn("border hairline editorial-shadow-lg", className)}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b hairline bg-ink text-paper">
          <span className="font-mono text-[0.72rem] text-paper/60">AST Preview</span>
          <button
            onClick={handleCopyAst}
            className="toolbar-btn !text-paper/80"
          >
            Copy JSON
          </button>
        </div>

        <div className="bg-paper2 p-6 sm:p-12 flex justify-center overflow-y-auto scrollbar-thin max-h-[640px]">
          <div className="page-sheet w-full p-8">
            <p className="mb-4 text-sm text-ink2 font-serif italic">
              PDF not rendered (takumi not installed or AST fallback). Showing parsed ChapterAST.
            </p>
            <pre className="max-h-[600px] overflow-auto bg-ink text-[#E9E4D8] p-4 font-mono text-[0.72rem] leading-relaxed">
              {JSON.stringify(ast, null, 2)}
            </pre>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t hairline bg-paper2">
          <p className="text-xs text-ink2">AST fallback · install takumi for vector PDF</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("border hairline border-dashed bg-paper2 px-6 py-16 text-center", className)}>
      <svg
        width="34"
        height="34"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#3A4356"
        strokeWidth="1.4"
        className="mx-auto mb-4"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
      <p className="mt-2 font-serif font-semibold text-lg text-ink">
        Generate PDF to preview
      </p>
      <p className="mt-1 max-w-md mx-auto text-sm text-ink2 leading-relaxed">
        Edit your markdown in Step 3, then click <strong>Generate PDF</strong>. If{" "}
        <code className="font-mono text-xs bg-paper px-1 py-0.5">takumi</code> is
        available you will get a vector PDF.
      </p>
      {markdown && (
        <button
          onClick={handleCopyMarkdown}
          className="btn-ghost mt-4 !text-xs"
        >
          Copy markdown
        </button>
      )}
    </div>
  );
}

export default PdfPreview;
