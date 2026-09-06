"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ValidationChecklist } from "./ValidationChecklist";

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** DOM id applied to the textarea — lets external tools (studio insert)
   *  read the caret position. */
  textareaId?: string;
}

export function MarkdownEditor({ value, onChange, className, textareaId }: MarkdownEditorProps) {
  const charCount = value.length;
  const lineCount = value ? value.split("\n").length : 0;
  const wordCount = value.trim() ? value.trim().split(/\s+/).filter(Boolean).length : 0;

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = React.useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = value.substring(0, start) + "  " + value.substring(end);
      onChange(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Generate line numbers
  const lines = value.split("\n");
  const lineNumbers = Array.from({ length: Math.max(lines.length, 20) }, (_, i) => i + 1);

  return (
    <div className={cn("grid gap-0 lg:grid-cols-[1fr_300px]", className)}>
      {/* Dark code editor */}
      <div className="border hairline editorial-shadow-lg flex flex-col">
        {/* Title bar — traffic light dots */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b hairline bg-ink text-paper">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-err/70"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-warn/70"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-ok/70"></span>
            <p className="font-mono text-[0.72rem] text-paper/70 ml-2">chapter.md</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline font-mono text-[0.68rem] text-paper/50">
              UTF-8 · MD · {lineCount} lines
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="font-mono text-[0.68rem] text-paper/50 hover:text-paper/80 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Editor body */}
        <div className="flex code-editor overflow-hidden">
          {/* Line numbers */}
          <div
            ref={lineNumbersRef}
            className="py-5 pl-4 pr-2 text-right select-none overflow-hidden flex-shrink-0"
            aria-hidden="true"
          >
            {lineNumbers.map((n) => (
              <div key={n} className="ln" style={{ lineHeight: "1.65" }}>
                {String(n).padStart(2, "0")}
              </div>
            ))}
          </div>

          {/* Textarea — markdown/frontmatter is LTR code-like content; forcing
              LTR keeps YAML keys and HTML comments readable inside the RTL UI */}
          <textarea
            ref={textareaRef}
            id={textareaId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            placeholder={`---\nsubject: computer-networks\ntheme: default\ntitle: Transport Layer\nlanguage: ar\nsources:\n  - document: Computer Networks.pdf\n    pages: [142, 143]\n---\n\n## Overview\n...`}
            spellCheck={false}
            dir="ltr"
            className="flex-1 min-h-[520px] lg:min-h-[640px] bg-transparent p-5 font-mono text-[0.82rem] leading-[1.65] text-[#E9E4D8] outline-none resize-none placeholder:text-[#5B6478]/60 text-left"
            style={{ tabSize: 2 }}
          />
        </div>

        {/* Status bar */}
        <div className="border-t hairline px-4 py-2.5 flex items-center justify-between bg-paper2">
          <p className="text-xs text-ink2">
            {charCount.toLocaleString()} chars · {wordCount.toLocaleString()} words · {lineCount} lines
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="btn-ghost !py-1.5 !text-xs"
            >
              Format
            </button>
            <span className="font-mono text-[0.68rem] text-ink2 self-center">
              {value ? `${(value.length / 1024).toFixed(1)} KB` : "0 KB"}
            </span>
          </div>
        </div>
      </div>

      {/* Validation sidebar */}
      <ValidationChecklist markdown={value} />
    </div>
  );
}

export default MarkdownEditor;
