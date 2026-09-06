"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ExtractResult {
  text: string;
  numPages: number;
  fileName: string;
}

export interface UploadDropzoneProps {
  onExtract: (data: ExtractResult) => void;
  onError?: (message: string) => void;
  className?: string;
}

export function UploadDropzone({ onExtract, onError, className }: UploadDropzoneProps) {
  const [dragOver, setDragOver] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [firstPage, setFirstPage] = React.useState<string>("");
  const [lastPage, setLastPage] = React.useState<string>("");

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const reportError = (msg: string) => {
    setError(msg);
    onError?.(msg);
  };

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      reportError("Please upload a PDF file (.pdf)");
      return;
    }
    setError(null);
    setFileName(file.name);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const fp = firstPage.trim();
      const lp = lastPage.trim();
      if (fp) form.append("firstPage", fp);
      if (lp) form.append("lastPage", lp);

      const res = await fetch("/api/extract", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.message || `Extract failed (${res.status})`;
        throw new Error(msg);
      }
      if (typeof data.text !== "string") {
        throw new Error("Invalid extract response: missing text");
      }
      onExtract({
        text: data.text,
        numPages: typeof data.numPages === "number" ? data.numPages : 0,
        fileName: file.name,
      });
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      reportError(msg);
    } finally {
      setLoading(false);
    }
  }

  const onDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [firstPage, lastPage]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Dropzone area */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        data-active={dragOver ? "true" : undefined}
        role="button"
        tabIndex={0}
        aria-label="Upload chapter PDF"
        className={cn(
          "dropzone p-10 flex flex-col items-center justify-center text-center min-h-[340px] cursor-pointer",
          loading && "opacity-60 pointer-events-none"
        )}
      >
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1E3A5F"
          strokeWidth="1.4"
          className="mb-4"
        >
          <path
            d="M12 3v12m0-12 4 4m-4-4-4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="font-serif font-semibold text-lg">
          Drop chapter PDF here
        </p>
        <p className="text-sm text-ink2 mt-1.5">
          or{" "}
          <span
            className="underline decoration-accent decoration-2 underline-offset-2 text-accent font-medium cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            browse files
          </span>
        </p>
        <p className="kicker mt-6 !text-[0.62rem] text-ink2/60">
          Plain-text PDF · max 40MB
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={onInputChange}
          disabled={loading}
        />
      </div>

      {/* PDF chip — shown after extraction */}
      {fileName && (
        <div className="flex items-center justify-between border hairline px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 border hairline flex items-center justify-center flex-shrink-0 font-mono text-[0.65rem]">
              PDF
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              {loading && (
                <p className="text-xs text-accent animate-pulse">Extracting text…</p>
              )}
            </div>
          </div>
          {!loading && (
            <span className="kicker !text-ok !text-[0.62rem]">Extracted</span>
          )}
        </div>
      )}

      {/* Page range inputs */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="kicker !text-[0.62rem] !text-ink2">First page (optional)</span>
          <input
            type="number"
            min={1}
            placeholder="e.g. 142"
            value={firstPage}
            onChange={(e) => setFirstPage(e.target.value)}
            className="field"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="kicker !text-[0.62rem] !text-ink2">Last page (optional)</span>
          <input
            type="number"
            min={1}
            placeholder="e.g. 148"
            value={lastPage}
            onChange={(e) => setLastPage(e.target.value)}
            className="field"
          />
        </label>
      </div>
      <p className="text-[11px] text-ink2">
        Leave blank to extract all pages. If set, validates via{" "}
        <code className="font-mono text-[11px] bg-paper2 px-1 py-0.5">
          firstPage &le; lastPage
        </code>
        .
      </p>

      {/* Error */}
      {error && (
        <div className="border border-err/30 bg-err/5 px-3 py-2 text-sm text-err">
          {error}
        </div>
      )}
    </div>
  );
}

export default UploadDropzone;
