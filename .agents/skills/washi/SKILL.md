---
name: washi
description: "Author, validate, publish and audit Arabic/RTL educational chapter packages with the Washi pipeline (local-first). Use when the user asks to create study material or a book chapter, turn AI-generated lecture notes into a structured chapter, publish an immutable educational package with source provenance, extract concepts/flashcards/questions from a chapter, or verify a published package's integrity. Triggers: 'فصل تعليمي', 'ملخص مادة', 'chapter', 'study notes', 'publish educational content', 'بطاقات فلاش', 'مفاهيم الفصل'."
metadata:
  author: washi
  version: "1.0.0"
---

# Washi — Educational Content Publisher (agent guide)

Washi turns a single chapter of Markdown into a **frozen, traceable educational package**: deterministic parser → ChapterAST → Arabic-RTL PDF (takumi) → immutable publication with sha256-hashed provenance. Local-first: everything on disk under `projects/`.

## When to use what

| Need | Use |
|---|---|
| Create a chapter from notes/AI output | `washi_new` (MCP) or `washi new --file` (CLI) |
| Check content before publishing | `washi_validate` / `washi validate` |
| Produce a preview PDF | `washi_render` / `washi render` |
| **Publish** (freeze, permanent) | `washi_publish` / `washi publish --yes` |
| Extract concepts + flashcards + questions | `washi_trace --json` |
| Audit package integrity | `washi_verify` |
| Read a project's current manuscript | `washi_content_get` |
| Delete (destructive — confirm with user first!) | `washi_delete` |

CLI equivalent: prefix with `npm run washi --` from the repo root. Exit codes: 0 ok · 1 refusal/validation · 2 not-found · 3 usage · 4 unexpected. All CLI commands accept `--json` (stdout = result only, logs = stderr).

## THE CONTENT CONTRACT (most common failure — read this first)

`washi_new` / `washi new` **refuse** manuscripts that break the frontmatter contract. A valid chapter:

```markdown
---
subject: computer-networks        # lowercase-hyphen slug (REQUIRED)
title: "الفصل الأول: مقدمة"       # quoted title (REQUIRED)
language: ar                      # ar | en (REQUIRED)
sources:                          # at least ONE source (REQUIRED)
  - document: Lecture Notes.pdf
    pages: [1, 2, 3]
---

# عنوان الفصل (h1 — exactly one)

<!-- source: Lecture Notes.pdf p.1 -->
## قسم (h2 sections)

> [!NOTE]
> **مصطلح:** تعريف — كل [!NOTE] يصبح مفهوماً وبطاقة فلاش.

$$
E = mc^2
$$
```

Rules that gate every write:
- **Every claim traces to a source**: `<!-- source: Doc.pdf p.N -->` before a section, or `<!-- source: (generated) -->` for authored/generated content. **Never invent page numbers.**
- Math: block `$$…$$` (never leave an unclosed `$$`); inline `$…$`.
- Callouts: `[!NOTE]` `[!IMPORTANT]` `[!WARNING]` `[!EXAMPLE]` `[!TIP]` as blockquotes; note-cards with `**مصطلح:**` become concept flashcards.
- A `## أسئلة مراجعة` section produces question candidates for the platform.

## Standard pipeline (AI-authored chapter)

```
1. Write the chapter following the contract above.
2. washi_new  (or: cat ch.md | npm run washi -- new "العنوان")
3. washi_validate → if not ok, FIX THE CONTENT and re-write via washi_content_set
4. washi_render → preview PDF (optional, before freezing)
5. CONFIRM WITH THE USER → washi_publish   (permanent freeze, append-only)
6. washi_trace --json → hand concepts/flashcards/questions to the platform
```

Publishing is **permanent**: packages are immutable and hash-sealed. Never publish without explicit user consent. Never call `washi_delete` without explicit consent — it erases every snapshot and package.

## Consuming a published chapter (platform simulation)

`washi_trace --json` returns:
- `documentAst` — sections/blocks with **hidden provenance refs** (`p.document`, `p.pages`) linking each block to its source page
- `appContent.concepts` — term/definition pairs bound to their source block
- `appContent.flashcards` — front/back cards derived from definitions
- `appContent.questionCandidates` — review questions with suggested concept links

Provenance lives in the AST only — it is never part of the rendered content the student sees.

## Errors you will see

- «الـ frontmatter ناقص أو غير صالح (…)» → your markdown lacks required frontmatter — see contract above.
- «رُفض النشر — N خطأ هيكلي» → run `washi_validate`, fix each issue, then republish.
- «لا يوجد مشروع بهذا المعرف» → wrong id; run `washi_list` first.
