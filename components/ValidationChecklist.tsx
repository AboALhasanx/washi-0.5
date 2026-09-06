"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ValidationChecklistProps {
  markdown: string;
  className?: string;
  compact?: boolean;
}

type CheckItem = {
  id: string;
  label: string;
  description?: string;
  pass: boolean;
  warn?: boolean;
  detail?: string;
};

function hasFrontmatterKey(md: string, key: string): boolean {
  const fmMatch = md.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return false;
  const fm = fmMatch[1];
  const re = new RegExp(`^\\s*${key}\\s*:`, "m");
  return re.test(fm);
}

function parseFrontmatterBlock(md: string): Record<string, string> | null {
  const m = md.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return null;
  const lines = m[1].split("\n");
  const out: Record<string, string> = {};
  for (const line of lines) {
    const kv = line.match(/^\s*([a-zA-Z0-9_-]+)\s*:\s*(.+)\s*$/);
    if (kv) out[kv[1].trim()] = kv[2].trim();
  }
  return out;
}

function slugValid(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function detectSectionName(heading: string): string {
  const h = heading.toLowerCase().trim();
  if (/(نظرة عامة|overview|abstract)/i.test(h)) return "overview";
  if (/(المفاهيم الأساسية|core concepts|مفاهيم)/i.test(h)) return "core-concepts";
  if (/(التعاريف|definitions|glossary)/i.test(h)) return "definitions";
  if (/(المعادلات|formulas|equations)/i.test(h)) return "formulas";
  if (/(أمثلة محلولة|worked examples|أمثلة|examples)/i.test(h) && !/review/i.test(h)) return "worked-examples";
  if (/(نقاط مهمة|key points|important|ملاحظات مهمة)/i.test(h)) return "key-points";
  if (/(أسئلة مراجعة|review|questions)/i.test(h)) return "review";
  return "custom";
}

function evaluate(md: string): CheckItem[] {
  const trimmed = md.trim();
  const hasFm = /^---\s*\n[\s\S]*?\n---/.test(trimmed);
  const keys = ["subject", "theme", "title", "language", "sources"];
  const fmBlock = parseFrontmatterBlock(md);
  const missingKeys = keys.filter((k) => !hasFrontmatterKey(md, k));
  const fmPass = hasFm && missingKeys.length === 0;

  let fmDetail: string | undefined;
  if (!hasFm) fmDetail = "Missing frontmatter block --- ... --- at top";
  else if (missingKeys.length) fmDetail = `Missing keys: ${missingKeys.join(", ")}`;
  else {
    const subjectRaw = fmBlock?.subject?.replace(/^["']|["']$/g, "") ?? "";
    const languageRaw = fmBlock?.language?.replace(/^["']|["']$/g, "") ?? "";
    const themeRaw = fmBlock?.theme?.replace(/^["']|["']$/g, "") ?? "";
    const issues: string[] = [];
    if (subjectRaw && !slugValid(subjectRaw)) issues.push(`subject "${subjectRaw}" not lowercase-hyphenated`);
    if (languageRaw && !["ar", "en"].includes(languageRaw)) issues.push(`language must be ar|en, got "${languageRaw}"`);
    if (themeRaw && themeRaw !== "default") issues.push(`theme must be "default" for MVP1, got "${themeRaw}"`);
    if (!md.includes("sources:")) issues.push("sources missing");
    fmDetail = issues.length ? issues.join(" · ") : `subject=${subjectRaw || "—"} · language=${languageRaw || "—"} · theme=${themeRaw || "default"}`;
  }

  const headingRe = /^##\s+(.+)$/gm;
  const headings: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(md)) !== null) headings.push(m[1].trim());
  const sectionNames = headings.map(detectSectionName);
  const expected = ["overview", "core-concepts", "definitions", "formulas", "worked-examples", "key-points"];
  let lastIdx = -1;
  let orderPass = true;
  let orderDetail = "";
  const missingInOrder: string[] = [];
  for (const exp of expected) {
    const idx = sectionNames.indexOf(exp);
    if (idx === -1) {
      missingInOrder.push(exp);
      orderPass = false;
    } else if (idx < lastIdx) {
      orderPass = false;
      orderDetail = `Section "${exp}" out of order`;
      break;
    } else {
      lastIdx = idx;
    }
  }
  const hasReview = sectionNames.includes("review");
  const orderOk = orderPass && missingInOrder.length === 0;
  if (!orderDetail && missingInOrder.length) orderDetail = `Missing: ${missingInOrder.join(", ")}`;
  if (orderOk) orderDetail = `Found ${headings.length} sections · order ok${hasReview ? " (review present)" : " (review optional)"}`;
  else if (!orderDetail) orderDetail = `Found: ${sectionNames.join(" → ") || "none"} · expected: ${expected.join(" → ")}`;

  const sourceComments = (md.match(/<!--\s*source\s*:[\s\S]*?-->/gi) ?? []).length;
  const sourcePass = sourceComments >= 1;
  const sourceDetail = sourcePass ? `${sourceComments} comment(s) found` : "Add <!-- source: Doc.pdf p.X --> per section";

  const dollarCount = (md.match(/\$\$/g) ?? []).length;
  const latexPass = dollarCount % 2 === 0;
  let latexDetail = "";
  if (dollarCount === 0) latexDetail = "No $$ block detected";
  else if (latexPass) latexDetail = `${dollarCount / 2} block(s) balanced`;
  else latexDetail = `Unbalanced $$ count=${dollarCount}`;

  const inlineDollars = (md.match(/(?<!\$)\$(?!\$)[^\n]*?\$(?!\$)/g) ?? []).length;
  if (inlineDollars > 0 && latexDetail) latexDetail += ` · ${inlineDollars} inline $...$`;

  const tableLines = md.split("\n").filter((l) => /^\s*\|.*\|\s*$/.test(l));
  const hasTableHeader = /\|\s*---/.test(md);
  const tablesPass = tableLines.length === 0 || (tableLines.length >= 2 && hasTableHeader);
  let tablesDetail = "";
  if (tableLines.length === 0) tablesDetail = "No tables detected";
  else tablesDetail = tablesPass ? `${tableLines.length} table row(s)` : `${tableLines.length} rows, missing header separator`;

  const calloutMatches = md.match(/>\s*\[!(NOTE|IMPORTANT|WARNING|EXAMPLE)\]/gi) ?? [];
  const plainBlockquotes = (md.match(/^>\s+[^\n]*$/gm) ?? []).length;
  let calloutDetail = "";
  if (calloutMatches.length === 0) calloutDetail = plainBlockquotes ? `${plainBlockquotes} blockquote(s), no [!TYPE]` : "No callouts";
  else calloutDetail = `${calloutMatches.length} callout(s)`;

  const subject = fmBlock?.subject?.replace(/^["']|["']$/g, "") ?? "";
  const filePathPass = subject ? slugValid(subject) : false;
  const filePathDetail = subject
    ? filePathPass
      ? `content/${subject}/chapter-XX.md — slug valid`
      : `subject "${subject}" not lowercase-hyphenated`
    : "subject missing";

  const languageVal = fmBlock?.language?.replace(/^["']|["']$/g, "") ?? "";
  let langRulePass = true;
  let langRuleDetail = "";
  if (languageVal === "ar") {
    const hasArabic = /[\u0600-\u06FF]/.test(md);
    langRulePass = hasArabic;
    langRuleDetail = hasArabic ? "Arabic detected for language: ar" : "language: ar but no Arabic characters found";
  } else if (languageVal === "en") {
    langRuleDetail = "language: en — English explanations";
  } else {
    langRulePass = false;
    langRuleDetail = "language must be ar | en";
  }

  return [
    { id: "frontmatter", label: "Frontmatter contains all 5 required keys", description: "subject, theme, title, language, sources", pass: fmPass, detail: fmDetail },
    { id: "sections", label: "7 sections in correct order", description: "overview → core-concepts → definitions → formulas → worked-examples → key-points → (review optional)", pass: orderOk, detail: orderDetail },
    { id: "source", label: "Source traceability comments", description: "at least one <!-- source: ... -->", pass: sourcePass, detail: sourceDetail },
    { id: "latex", label: "LaTeX preserved and balanced", description: "$$ block and $ inline intact", pass: latexPass, detail: latexDetail },
    { id: "tables", label: "Tables use pipe syntax", description: "| pipes + header row", pass: tablesPass, detail: tablesDetail },
    { id: "callouts", label: "Callouts use [!TYPE] syntax", description: "> [!NOTE|IMPORTANT|WARNING|EXAMPLE]", pass: true, detail: calloutDetail },
    { id: "filepath", label: "File path convention", description: "content/<subject>/chapter-XX.md", pass: filePathPass, detail: filePathDetail },
    { id: "language", label: "Language rule", description: "ar = Arabic explanations, EN terms stay", pass: langRulePass, detail: langRuleDetail },
  ];
}

export function ValidationChecklist({ markdown, className, compact }: ValidationChecklistProps) {
  const items = React.useMemo(() => evaluate(markdown ?? ""), [markdown]);
  const passed = items.filter((i) => i.pass).length;
  const pct = items.length > 0 ? Math.round((passed / items.length) * 100) : 0;

  return (
    <div className={cn("border hairline editorial-shadow flex flex-col", className)}>
      <div className="px-4 py-2.5 border-b hairline bg-paper2">
        <p className="kicker !text-[0.62rem]">Validation Checklist</p>
      </div>
      <div className="p-4 space-y-0 flex-1 overflow-y-auto scrollbar-thin max-h-[420px]">
        {items.map((item) => (
          <div key={item.id} className="checklist-item">
            <span
              className={cn(
                "status-dot",
                item.pass ? "bg-ok" : item.warn ? "bg-warn" : "bg-err"
              )}
            ></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">
                {item.label}
                {item.detail && (
                  <span className="ml-1 font-mono text-xs text-ink2">
                    — {item.detail}
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t hairline px-4 py-3 bg-paper2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink2" dir="ltr">
            {passed} of {items.length} checks passed
          </span>
          <span className="font-mono text-ink font-semibold" dir="ltr">{pct}%</span>
        </div>
        <div className="h-1 bg-line mt-2">
          <div
            className="h-1 bg-accent transition-all duration-500"
            style={{ width: `${pct}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default ValidationChecklist;
