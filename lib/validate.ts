/**
 * lib/validate.ts
 * Washi 0.5 structural validation.
 *
 * Washi confirms a document is syntactically/structurally valid; it never
 * claims the educational content is scientifically correct (that is the
 * human reviewer's responsibility, per WASHI_0.5_CODEX_BOOTSTRAP.md).
 *
 * Detects:
 * - malformed Markdown / schema violations (via the deterministic parser)
 * - unclosed ::: custom blocks and unknown component names
 * - unbalanced math delimiters ($$)
 * - missing asset files referenced by figures
 * - structural emptiness (no sections / empty sections)
 */

import fs from "node:fs";
import path from "node:path";
import { ZodError } from "zod";
import { parseMarkdown } from "./markdown-parser";
import type { ChapterAST } from "./schemas";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  /** line hint in content.md when known */
  line?: number;
}

export interface ValidationResult {
  ok: boolean; // no errors (warnings allowed)
  errors: number;
  warnings: number;
  issues: ValidationIssue[];
  ast?: ChapterAST;
}

const KNOWN_CUSTOM_BLOCKS = ["formula", "definition", "callout", "note", "warning", "example", "important"];

/** Regex-free custom-block scanner over raw markdown lines. */
function scanCustomBlocks(md: string, issues: ValidationIssue[]) {
  const lines = md.split(/\r?\n/);
  const stack: Array<{ name: string; line: number }> = [];
  lines.forEach((raw, i) => {
    const line = raw.trim();
    const open = line.match(/^:::([A-Za-z][A-Za-z0-9-]*)?\s*$/);
    const close = /^:::\s*$/.test(line);
    if (open) {
      const name = (open[1] ?? "").toLowerCase();
      if (name && !KNOWN_CUSTOM_BLOCKS.includes(name)) {
        issues.push({
          severity: "error",
          code: "unknown-component",
          message: `مكوّن غير معروف :::${name} — المفردات المسموحة: ${KNOWN_CUSTOM_BLOCKS.join(", ")}`,
          line: i + 1,
        });
      }
      stack.push({ name, line: i + 1 });
    } else if (close) {
      if (stack.length === 0) {
        issues.push({
          severity: "error",
          code: "unopened-block",
          message: "إغلاق ::: بدون فتح",
          line: i + 1,
        });
      } else {
        stack.pop();
      }
    }
  });
  for (const unclosed of stack) {
    issues.push({
      severity: "error",
      code: "unclosed-block",
      message: unclosed.name
        ? `بلوك :::${unclosed.name} غير مغلق`
        : "بلوك ::: غير مغلق",
      line: unclosed.line,
    });
  }
}

function scanMathDelimiters(md: string, issues: ValidationIssue[]) {
  // $$ ... $$ must be balanced (even count of $$ tokens outside code fences)
  const lines = md.split(/\r?\n/);
  let inFence = false;
  let dollarCount = 0;
  let firstDollarLine: number | null = null;
  lines.forEach((raw, i) => {
    if (/^\s*```/.test(raw)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const matches = raw.match(/\$\$/g);
    if (matches) {
      dollarCount += matches.length;
      if (firstDollarLine === null) firstDollarLine = i + 1;
    }
  });
  if (dollarCount % 2 !== 0) {
    issues.push({
      severity: "error",
      code: "unbalanced-math",
      message: "محددات المعادلات $$ غير متوازنة — هناك $$ بدون إغلاق",
      line: firstDollarLine ?? undefined,
    });
  }
}

function scanStructure(ast: ChapterAST, issues: ValidationIssue[]) {
  if (!ast.sections || ast.sections.length === 0) {
    issues.push({
      severity: "error",
      code: "no-sections",
      message: "لا توجد أقسام — المستند فارغ أو بلا عناوين ##",
    });
    return;
  }
  for (const sec of ast.sections) {
    const contentNodes = sec.nodes.filter((n) => n.type !== "source");
    if (contentNodes.length === 0) {
      // "Untitled" sections holding only source comments are a parser
      // artifact (source comment before the first h2) — not a user problem.
      if (sec.heading === "Untitled") continue;
      issues.push({
        severity: "warning",
        code: "empty-section",
        message: `القسم «${sec.heading}» لا يحتوي محتوى`,
      });
    }
  }
  // Definition/callout sanity: empty term or definition
  for (const n of ast.nodes ?? []) {
    if (n.type === "definition") {
      if (!String((n as any).term).trim() || !String((n as any).definition).trim()) {
        issues.push({
          severity: "warning",
          code: "incomplete-definition",
          message: `تعريف ناقص (term/definition فارغ): «${String((n as any).term || "—")}»`,
        });
      }
    }
  }
}

function scanAssets(ast: ChapterAST, assetsDir: string | undefined, issues: ValidationIssue[]) {
  if (!assetsDir) return;
  for (const n of ast.nodes ?? []) {
    if (n.type === "figure") {
      const src = String((n as any).src ?? "");
      if (!src || src === "figures/placeholder.png") {
        issues.push({
          severity: "warning",
          code: "placeholder-asset",
          message: `صورة placeholder بدون ملف فعلي: «${String((n as any).alt ?? "")}»`,
        });
        continue;
      }
      const candidate = path.join(assetsDir, src.replace(/^assets[\\/]/, ""));
      if (!fs.existsSync(candidate)) {
        issues.push({
          severity: "error",
          code: "missing-asset",
          message: `ملف صورة مفقود: ${src}`,
        });
      }
    }
  }
}

export interface ValidateOptions {
  /** project assets/ directory to resolve figure src against */
  assetsDir?: string;
}

/** Full structural validation: parse + static scans + asset resolution. */
export function validateMarkdown(md: string, opts: ValidateOptions = {}): ValidationResult {
  const issues: ValidationIssue[] = [];

  let ast: ChapterAST | undefined;
  try {
    ast = parseMarkdown(md).ast;
  } catch (e: any) {
    if (e instanceof ZodError) {
      for (const issue of e.issues) {
        issues.push({
          severity: "error",
          code: "schema",
          message: `[${issue.path.join(".") || "frontmatter"}] ${issue.message}`,
        });
      }
    } else {
      issues.push({
        severity: "error",
        code: "parse-failed",
        message: e?.message ?? String(e),
      });
    }
    return {
      ok: false,
      errors: issues.length,
      warnings: issues.filter((i) => i.severity === "warning").length,
      issues,
    };
  }

  scanCustomBlocks(md, issues);
  scanMathDelimiters(md, issues);
  scanStructure(ast, issues);
  scanAssets(ast, opts.assetsDir, issues);

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.length - errors;
  return { ok: errors === 0, errors, warnings, issues, ast };
}
