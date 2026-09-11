"use client";

/**
 * components/MarkdownEditor.tsx
 * Dark code editor + outline fold + font slider + validation checklist.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ValidationChecklist } from "./ValidationChecklist";

export interface MarkdownEditorHandle {
  /** Focus the textarea and select a character range (M4.1B). */
  selectRange: (start: number, end: number) => void;
  /** Focus and move caret to a 0-based full-document line. */
  focusLine: (line: number) => void;
}

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  textareaId?: string;
}

type OutlineItem = { level: 1 | 2 | 3; text: string; line: number };

function parseOutline(markdown: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  const lines = markdown.split("\n");
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (/^```/.test(raw.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,3})\s+(.+?)\s*$/.exec(raw);
    if (!m) continue;
    const level = m[1].length as 1 | 2 | 3;
    items.push({ level, text: m[2].replace(/[*_`]/g, "").trim(), line: i });
  }
  return items;
}

export const MarkdownEditor = React.forwardRef<
  MarkdownEditorHandle,
  MarkdownEditorProps
>(function MarkdownEditor({ value, onChange, className, textareaId }, ref) {
  const charCount = value.length;
  const lineCount = value ? value.split("\n").length : 0;
  const wordCount = value.trim() ? value.trim().split(/\s+/).filter(Boolean).length : 0;

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = React.useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = React.useState(13);
  const [wrap, setWrap] = React.useState(true);
  const [outlineOpen, setOutlineOpen] = React.useState(true);
  const [collapsed, setCollapsed] = React.useState<Record<number, boolean>>({});

  const outline = React.useMemo(() => parseOutline(value), [value]);

  const applySelection = React.useCallback(
    (start: number, end: number) => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(start, end);
      const lines = value.split("\n");
      // approximate scroll: line of start offset
      let line = 0;
      let pos = 0;
      for (let i = 0; i < lines.length; i++) {
        if (pos + lines[i].length + 1 > start) {
          line = i;
          break;
        }
        pos += lines[i].length + 1;
      }
      const lineHeight = fontSize * 1.65;
      ta.scrollTop = Math.max(0, line * lineHeight - 80);
      if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = ta.scrollTop;
    },
    [value, fontSize]
  );

  React.useImperativeHandle(
    ref,
    () => ({
      selectRange: applySelection,
      focusLine: (line: number) => {
        let pos = 0;
        const lines = value.split("\n");
        for (let i = 0; i < line && i < lines.length; i++) pos += lines[i].length + 1;
        applySelection(pos, pos);
      },
    }),
    [applySelection, value]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {}
  };

  const jumpToLine = (line: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const lines = value.split("\n");
    let pos = 0;
    for (let i = 0; i < line && i < lines.length; i++) pos += lines[i].length + 1;
    ta.focus();
    ta.setSelectionRange(pos, pos);
    const lineHeight = fontSize * 1.65;
    ta.scrollTop = Math.max(0, line * lineHeight - 80);
    if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = ta.scrollTop;
  };

  /** Whether a heading is hidden because an ancestor is folded. */
  const isHiddenByFold = (idx: number): boolean => {
    const item = outline[idx];
    if (!item) return false;
    for (let j = idx - 1; j >= 0; j--) {
      const prev = outline[j];
      if (prev.level < item.level && collapsed[j]) return true;
    }
    return false;
  };

  const toggleFold = (idx: number) => {
    setCollapsed((c) => ({ ...c, [idx]: !c[idx] }));
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

  const lines = value.split("\n");
  const lineNumbers = Array.from({ length: Math.max(lines.length, 20) }, (_, i) => i + 1);

  return (
    <div className={cn("grid gap-0 lg:grid-cols-[1fr_300px]", className)}>
      <div className="border hairline editorial-shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b hairline bg-ink text-paper flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-err/70"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-warn/70"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-ok/70"></span>
            <p className="font-mono text-[0.72rem] text-paper/70 ml-2">chapter.md</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* font size slider */}
            <label className="flex items-center gap-1.5 text-[0.68rem] text-paper/60">
              <span>حجم</span>
              <input
                type="range"
                min={11}
                max={20}
                step={1}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-20 accent-amber-400"
                aria-label="حجم الخط"
              />
              <span className="font-mono w-5">{fontSize}</span>
            </label>
            <label className="flex items-center gap-1 text-[0.68rem] text-paper/60 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={wrap}
                onChange={(e) => setWrap(e.target.checked)}
              />
              التفاف
            </label>
            <button
              type="button"
              onClick={() => setOutlineOpen((o) => !o)}
              className="font-mono text-[0.68rem] text-paper/50 hover:text-paper/90"
            >
              {outlineOpen ? "إخفاء الفهرس" : "الفهرس"}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="font-mono text-[0.68rem] text-paper/50 hover:text-paper/80"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row overflow-hidden">
          {/* Outline fold */}
          {outlineOpen && (
            <aside className="lg:w-52 border-b lg:border-b-0 lg:border-l hairline bg-paper2/80 max-h-48 lg:max-h-[520px] overflow-y-auto scrollbar-thin">
              <p className="px-3 py-1.5 text-[0.6rem] text-ink2 border-b hairline sticky top-0 bg-paper2">
                الفهرس ({outline.length})
              </p>
              {outline.length === 0 && (
                <p className="px-3 py-2 text-[0.65rem] text-ink2">لا عناوين بعد</p>
              )}
              <ul className="py-1">
                {outline.map((item, i) => {
                  if (isHiddenByFold(i)) return null;
                  const hasKids =
                    outline[i + 1] && outline[i + 1].level > item.level;
                  return (
                    <li key={`${item.line}-${i}`}>
                      <div
                        className="flex items-start gap-0.5 px-2 hover:bg-paper/80"
                        style={{ paddingInlineStart: 8 + (item.level - 1) * 10 }}
                      >
                        {hasKids ? (
                          <button
                            type="button"
                            onClick={() => toggleFold(i)}
                            className="text-ink2 text-[0.65rem] w-4 shrink-0 mt-0.5"
                            aria-label={collapsed[i] ? "فتح" : "طيّ"}
                          >
                            {collapsed[i] ? "▸" : "▾"}
                          </button>
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}
                        <button
                          type="button"
                          onClick={() => jumpToLine(item.line)}
                          className={`text-start text-[0.68rem] leading-snug py-0.5 truncate ${
                            item.level === 1
                              ? "font-bold text-ink"
                              : item.level === 2
                                ? "text-ink"
                                : "text-ink2"
                          }`}
                          title={item.text}
                        >
                          {item.level === 1 ? "#" : item.level === 2 ? "##" : "###"}{" "}
                          {item.text}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </aside>
          )}

          <div className="flex code-editor overflow-hidden flex-1">
            <div
              ref={lineNumbersRef}
              className="py-5 pl-4 pr-2 text-right select-none overflow-hidden flex-shrink-0"
              aria-hidden="true"
              style={{ fontSize, lineHeight: 1.65 }}
            >
              {lineNumbers.map((n) => (
                <div key={n} className="ln" style={{ lineHeight: 1.65 }}>
                  {String(n).padStart(2, "0")}
                </div>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              id={textareaId}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onScroll={handleScroll}
              placeholder={`---\nsubject: computer-networks\ntitle: ...\nlanguage: ar\nsources:\n  - document: Source.pdf\n    pages: [1]\n---\n\n# العنوان\n\n## قسم\n`}
              spellCheck={false}
              dir="ltr"
              className="flex-1 min-h-[520px] lg:min-h-[640px] bg-transparent p-5 font-mono text-[#E9E4D8] outline-none resize-none placeholder:text-[#5B6478]/60 text-left"
              style={{
                fontSize,
                lineHeight: 1.65,
                tabSize: 2,
                whiteSpace: wrap ? "pre-wrap" : "pre",
                overflowWrap: wrap ? "break-word" : "normal",
                overflowX: wrap ? "hidden" : "auto",
              }}
            />
          </div>
        </div>

        <div className="border-t hairline px-4 py-2 flex items-center justify-between bg-paper2">
          <p className="text-xs text-ink2">
            {charCount.toLocaleString()} chars · {wordCount.toLocaleString()} words ·{" "}
            {lineCount} lines
          </p>
          <div className="flex items-center gap-2 text-[0.68rem] text-ink2">
            <span className="font-mono">{value ? `${(value.length / 1024).toFixed(1)} KB` : "0 KB"}</span>
          </div>
        </div>
      </div>

      <ValidationChecklist markdown={value} />
    </div>
  );
});

export default MarkdownEditor;
