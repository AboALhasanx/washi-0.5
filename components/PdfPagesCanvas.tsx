"use client";

/**
 * components/PdfPagesCanvas.tsx
 * Preview method (b): server-rasterized page images of the exact final PDF
 * bytes (rendered by takumi, rasterized by pdfjs6 + napi canvas on the
 * server — see app/api/preview-pages/route.ts).
 *
 * Preview method (a) — the native browser PDF viewer — lives in the
 * workspace page as the "pdf" mode (object/iframe of the same bytes).
 */

import * as React from "react";

export function PdfPagesCanvas({
  pageImages,
  busy,
  className,
}: {
  pageImages: string[];
  busy?: boolean;
  className?: string;
}) {
  const [zoom, setZoom] = React.useState(100);

  if (!pageImages || pageImages.length === 0) {
    return (
      <div className="border hairline border-dashed bg-paper2 px-6 py-16 text-center">
        <p className="font-serif font-semibold text-ink">
          {busy ? "جارٍ الرندر والترسيم…" : "لا صفحات بعد"}
        </p>
        <p className="text-xs text-ink2 mt-1">اضغط «رندر PDF» لعرض الصفحات هنا.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b hairline bg-ink text-paper">
        <span className="font-mono text-[0.72rem] text-paper/60">
          صفحات PDF المرسّمة — {pageImages.length} صفحة (pdfjs6 + takumi)
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom((z) => Math.max(40, z - 15))} className="toolbar-btn !text-paper/80">−</button>
          <span className="font-mono text-[0.68rem] text-paper/60">{zoom}%</span>
          <button onClick={() => setZoom((z) => Math.min(200, z + 15))} className="toolbar-btn !text-paper/80">+</button>
        </div>
      </div>
      <div className="bg-paper2 p-6 sm:p-10 flex flex-col items-center gap-6 overflow-y-auto scrollbar-thin max-h-[720px]">
        {pageImages.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt={`صفحة ${i + 1}`}
            className="page-sheet"
            style={{ width: `${zoom}%`, height: "auto" }}
          />
        ))}
      </div>
    </div>
  );
}

export default PdfPagesCanvas;
