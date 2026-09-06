---
title: Washi — MVP1
status: active
created: 2026-08-23
updated: 2026-08-23
tech: [Next.js, TypeScript, Tailwind, pdfcn, takumi-pdf, pdf-parse, pdfjs-dist]
tags: [academic, pdf, summarization, obsidian, mvp1]
related: [projects/clinic-smart, wiki/shared]
---

# Washi — MVP1

> **One chapter of plain-text PDF → editable structured Markdown → beautiful academic PDF**

Past this entire file as context to any AI (Perplexity Space, Claude Project, ChatGPT, opencode go) — it is the 60-second orientation.

## Goal (MVP1 Only)

Build a **local-first, personal tool** for a CS MSc student. Take one chapter from a **plain-text PDF** (no OCR yet), summarize it via a **strict per-chapter system prompt** (works with any LLM: Perplexity, Claude, GPT, opencode), edit the Markdown manually, then map it to a **finite vocabulary of `pdfcn` components** and render a **correctly paginated vector PDF** via `takumi-pdf` with **one default theme**.

Everything beyond MVP1 — RAG, multi-subject themes, student personalization, AI tutor, quiz generation, OCR — is **out of scope** and must stay deferred.

## Why This Order

```
SOURCE MATERIAL
    ↓
MARKDOWN (human-editable source of truth, future RAG ingestible)
    ↓
COMPONENTS (deterministic, finite vocabulary)
    ↓
TAKUMI-PDF (layout + pagination — physical truth)
```

- LLM = semantic intelligence only
- RAG = not built for MVP1 (Markdown is saved cleanly for future RAG)
- Design system = visual consistency
- `pdfcn` = reusable PDF components (registry, not normal npm — code copied into project via `npx shadcn add @pdfcn/...`, owned & editable, Node 20+ required)
- `takumi-pdf` = layout / pagination / vector output

## Pipeline (Exact 6 Steps)

```
1. Input:  one chapter, plain-text PDF
2. Extract: pdf-parse / pdfjs-dist → raw text
3. Summarize: raw text + [[prompts/01-chapter-summarizer-prompt]] → structured Markdown
4. Edit:   manual review in textarea / Obsidian
5. Map:    Markdown → components via [[specs/pdfcn-components-catalog]] (rule-based, NOT second AI for MVP1)
6. Render: components + ONE theme → pdfcn → takumi-pdf → final PDF
```

See [[architecture]] for diagram and lifecycle.

## Stack Confirmed

- **Framework:** Next.js App Router + TypeScript + Tailwind — `pdfcn` requires `components.json` project
- **PDF components:** `pdfcn` https://github.com/shadcn-labs/pdfcn — `npx shadcn add @pdfcn/<component>`
- **Renderer:** `takumi-pdf` https://takumi.kane.tw/docs/pdf/pagination
- **Extraction:** `pdf-parse` or `pdfjs-dist` — text PDFs only, scanned deferred
- **LLM:** any (Perplexity/Claude/GPT/opencode go) + strict prompt per chapter
- **Hosting:** none — local `npm run dev` only, even manual data passing is acceptable for MVP1

## Quick Start (When App Exists)

```bash
npx create-next-app@latest washi --typescript --tailwind --app
cd washi
npx shadcn@latest init
# pdfcn primitives (corrected 2026-08-23 — see specs/pdfcn-components-catalog): no academic names
npx shadcn add @pdfcn/card @pdfcn/alert @pdfcn/heading @pdfcn/table @pdfcn/data-table @pdfcn/keep-together @pdfcn/pdf-image @pdfcn/section @pdfcn/page-break @pdfcn/list @pdfcn/text

# scripts/extract-pdf.js uses pdf-parse
node scripts/extract-pdf.js --input ./input/ch-04.pdf --output ./content/ch-04.raw.txt
# paste raw text + [[prompts/01-chapter-summarizer-prompt]] into Perplexity → get Markdown → save to content/ch-04.md
npm run dev # upload Markdown → Generate PDF
```

See [[planning]] for sprint breakdown and [[tasks]] for actionable checklist.

## Success Criteria (MVP1)

Given one plain-text PDF chapter, the pipeline reliably produces:
- clean, source-grounded Markdown (no hallucination, LaTeX preserved, `<!-- source: p.X -->` cites) that user lightly edits
- then one click produces a polished PDF with **no overlapping cards, no orphaned headings, no component cut across boundary** — via `takumi-pdf` native pagination + `KeepTogether` (break-inside:avoid) on components per corrected [[specs/pdfcn-components-catalog]] + [[specs/pagination-rules]]

## Vault Integration

- Lives at `projects/academic-publisher/` — registered in [[00-META/ACTIVE-PROJECTS]]
- Every file has YAML frontmatter per [[00-META/AGENT-RULES]]
- Session log → `raw/YYYY-MM-DD-academic-publisher.md` → update [[00-META/HANDOFF]]
- Master prompt source: `C:\Users\gokoq\Downloads\academic-publisher-master-prompt.md`

## Links

- Migration spec: `C:\Users\gokoq\Downloads\academic_ai_summary_platform_migration.md`
- pdfcn: https://github.com/shadcn-labs/pdfcn
- Takumi pagination: https://takumi.kane.tw/docs/pdf/pagination
- Prior overflow study (reference only, do not rebuild): https://github.com/AboALhasanx/New-project/tree/master/sdre-publisher
