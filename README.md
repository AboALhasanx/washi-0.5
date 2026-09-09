# Washi 0.5 — Educational Content Publisher

> **Local-first Arabic/RTL educational chapter publishing engine.**  
> Transforms structured Markdown manuscripts into **immutable, traceable educational packages**: deterministic AST $\rightarrow$ Takumi vector PDF $\rightarrow$ SHA-256 sealed publication packages $\rightarrow$ platform consumer read models (concepts, flashcards, review questions).

---

## Table of Contents

1. [Overview & Core Value](#overview--core-value)
2. [Architecture: One Core, Three Interfaces](#architecture-one-core-three-interfaces)
3. [Quick Start & Installation](#quick-start--installation)
4. [The Content Contract](#the-content-contract)
5. [Web Studio Interface](#web-studio-interface)
6. [CLI Interface (`washi`)](#cli-interface-washi)
7. [MCP Server & Agent Integration](#mcp-server--agent-integration)
8. [Storage & Package Immutability](#storage--package-immutability)
9. [Verification & Test Matrix](#verification--test-matrix)
10. [Repository Structure](#repository-structure)
11. [Architectural Decision Records](#architectural-decision-records)

---

## Overview & Core Value

Washi bridges the gap between AI-authored educational content and verified academic publication:

```text
AI Manuscript ──► Frontmatter Gate ──► Washi Core ──► Takumi PDF ──► Sealed Package (vN) ──► Platform Read Model
(Markdown)         (Validation)         (AST Engine)   (Arabic RTL)   (SHA-256 Manifest)       (Trace AST / Flashcards)
```

- **Source Provenance at Block Level**: Every claim and concept links back to original lecture notes or textbooks (`<!-- source: Doc.pdf p.N -->`).
- **Deterministic Takumi PDF**: Native Arabic right-to-left layout, typography, MathJax formulas, and light syntax cards.
- **Append-Only History & Sealed Packages**: Publishing freezes `content.md`, `document.pdf`, and `manifest.json` with cryptographic SHA-256 checksums.
- **Zero Hallucination Platform Ingestion**: Emits structured DocumentAST and app-content (terms, definitions, flashcards, review questions) directly derived from the authored text.

---

## Architecture: One Core, Three Interfaces

All interfaces invoke the exact same Washi domain primitives in `lib/*` directly on disk state (`projects/<id>/`). There are zero internal HTTP loops, no subprocess hops, and no duplicate domain logic.

```text
                        ┌────────────────────────────────────────┐
                        │               WASHİ 0.5                │
                        │         Unified Domain Core            │
                        │               (lib/*)                  │
                        └───────────────────┬────────────────────┘
                                            │
                ┌───────────────────────────┼───────────────────────────┐
                ▼                           ▼                           ▼
        ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
        │  Web Studio   │           │   Washi CLI   │           │  MCP Server   │
        │    (app/)     │           │    (cli/)     │           │    (mcp/)     │
        └───────┬───────┘           └───────┬───────┘           └───────┬───────┘
                │                           │                           │
                ▼                           ▼                           ▼
       Next.js App Router             15 CLI Commands             14 Typed Tools
       Browser Studio & UI            Exit Codes (0-4)            Stdio Transport
       Live Preview & Reorder         Pure --json stdout          Safety Annotations
                │                           │                           │
                └───────────────────────────┼───────────────────────────┘
                                            ▼
                               Disk State: projects/<id>/
```

### Core Operations (`lib/project.ts`)
1. **`buildTraceModel(id, version?)`**: Generates the consumer read model (DocumentAST + concepts + flashcards + questions) from current draft or frozen publication `vN`.
2. **`verifyPublication(id, version)`**: Audits package integrity by recalculating SHA-256 hashes of `content.md` and `document.pdf` against `manifest.json`.
3. **`listPublicationManifests(id)`**: Enumerates frozen publication manifests for a project.
4. **`renderPreviewToDir(id, outDir?)`**: Generates preview `document.pdf`, `document.ast`, and `app-content.json` without freezing.

---

## Quick Start & Installation

### Requirements
- **Node.js**: `v20.12.0` or higher
- **Package Manager**: `npm`

### Installation
```bash
git clone https://github.com/AboALhasanx/washi.git
cd washi
npm install
```

### Launch Modes
```bash
# 1. Start Web Studio (Development)
npm run dev

# 2. Build & Start Web Studio (Production)
npm run build
npm start

# 3. Use the CLI
npm run washi -- --help

# 4. Launch the Model Context Protocol (MCP) Server
npm run washi:mcp
```

---

## The Content Contract

Washi strictly enforces a content contract. Manuscripts violating frontmatter or formatting rules are refused at ingestion (`exit 1`).

### Minimal Valid Chapter Example

```markdown
---
subject: computer-networks        # Lowercase hyphenated slug (REQUIRED)
title: "الفصل الأول: مقدمة الشبكات" # Quoted title (REQUIRED)
language: ar                      # ar | en (REQUIRED)
sources:                          # At least one source document (REQUIRED)
  - document: Data Communications Lecture Notes.pdf
    pages: [1, 2, 3]
---

# عنوان الفصل (Exactly one H1 title)

<!-- source: Data Communications Lecture Notes.pdf p.1 -->
## نظرة عامة (H2 section with source provenance)

محتوى تمهيدي يشرح بنية شبكات الحاسوب وبروتوكولاتها الأساسية.

> [!NOTE]
> **مصطلح:** بروتوكول الشبكة — هو مجموعة القواعد والإجراءات المحددة للاتصال بين الأجهزة.

<!-- source: Data Communications Lecture Notes.pdf p.2 -->
## النموذج الرياضي

حساب معدل نقل البيانات باستخدام معادلة شانون:

$$
C = B \log_2 (1 + \text{SNR})
$$

> [!TIP]
> تزداد السعة القنوية $C$ خطياً مع زيادة عرض النطاق الترددي $B$.

<!-- source: (generated) -->
## أسئلة مراجعة

1. ما الفرق بين البروتوكول والمعيار القياسي في الشبكات؟
```

### Rules & Invariants
- **Provenance Gate**: Every section must declare source provenance (`<!-- source: Doc.pdf p.N -->`) or explicit authoring (`<!-- source: (generated) -->`).
- **Concept Extraction**: Any blockquote callout `[!NOTE]` containing `**مصطلح:** تعريف` automatically generates an indexed concept and flashcard.
- **Review Questions**: A `## أسئلة مراجعة` section generates platform question candidates linked to chapter concepts.
- **Math Balancing**: Display formulas must use balanced `$$...$$` blocks; inline formulas use single `$..$`.

---

## Web Studio Interface

Access the interactive studio at `http://localhost:3000`:

| Route | Capabilities |
|---|---|
| `/` | Quick Studio: paste Markdown for immediate PDF compilation and theme inspection. |
| `/projects` | Project Dashboard: project list, creation form, import validation. |
| `/projects/[id]` | Main Workspace: Markdown editor, outline section drag-to-reorder, live Takumi PDF viewer, rasterized page view, theme selector, snapshot history, publish trigger. |
| `/trace/[id]` | Platform Consumer Simulator: visual AST inspector, concept definition list, flashcard tester, question linker, provenance overlay. |
| `/prompts` | Prompt Catalog: curated prompt library for chapter summarization, problem formulation, and content generation. |

### Outline Drag-to-Reorder
Sections in `/projects/[id]` support pointer-based drag-and-drop reordering with keyboard accessibility (arrow buttons), visual drop highlights, and automatic synchronization across the Markdown editor and preview viewer.

---

## CLI Interface (`washi`)

The CLI is invoked via `npm run washi -- <command>` (or directly via `tsx cli/washi.ts <command>`).

### Command Tiers

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ Tier 1: Public / Stable (Core Publishing Pipeline)                        │
│   new · validate · render · publish · verify · trace                      │
├───────────────────────────────────────────────────────────────────────────┤
│ Tier 2: Management / Inspection                                           │
│   list · show · packages · snapshot · restore · delete                    │
├───────────────────────────────────────────────────────────────────────────┤
│ Tier 3: Dev / Demo (Utilities)                                            │
│   edit · serve · demo                                                     │
└───────────────────────────────────────────────────────────────────────────┘
```

#### Public / Stable Commands
```bash
# Ingest manuscript from file or stdin
npm run washi -- new "الفصل الأول" --file chapter-01.md
cat chapter-01.md | npm run washi -- new "الفصل الأول" --subject computer-networks

# Structural validation
npm run washi -- validate computer-networks-ch1

# Generate preview artifacts (output/computer-networks-ch1/document.pdf)
npm run washi -- render computer-networks-ch1 --out dist/preview

# Freeze immutable publication vN (--yes for headless/CI runs)
npm run washi -- publish computer-networks-ch1 --yes

# Audit publication checksums against manifest
npm run washi -- verify computer-networks-ch1
npm run washi -- verify computer-networks-ch1 --version 1

# Extract platform read model (concepts, flashcards, questions)
npm run washi -- trace computer-networks-ch1 --json
npm run washi -- trace computer-networks-ch1 --version 1 --json
```

#### Management Commands
```bash
npm run washi -- list --json                 # List projects as JSON
npm run washi -- show <id> --json            # Inspect project stats
npm run washi -- packages <id>               # List all publication packages
npm run washi -- snapshot <id>               # Create manual version snapshot
npm run washi -- restore <id> 1              # Restore v1 as new current version
npm run washi -- delete <id> --yes           # Permanent deletion
```

### Exit Codes Contract
Automation scripts and CI pipelines rely on deterministic exit codes:

| Exit Code | Meaning | Example |
|---|---|---|
| `0` | **Success / OK** | Command completed normally. |
| `1` | **Logical Refusal / Validation Failure** | Frontmatter missing, unclosed `$$`, publish refused, verification tampered. |
| `2` | **Not Found** | Project ID or publication version does not exist. |
| `3` | **Invalid Usage** | Missing required arguments, unknown flags, non-numeric `--version abc`. |
| `4` | **Unexpected Error** | Unhandled exception, filesystem error. |

### JSON Stream Separation
When `--json` is supplied:
- `stdout`: Pure machine-readable JSON only.
- `stderr`: Progress logs, banners, spinners, and diagnostic errors.

```bash
# Pipe directly to jq without text contamination
npm run washi -- trace computer-networks --json | jq '.appContent.concepts[].term'
```

---

## MCP Server & Agent Integration

Washi exposes 14 typed tools through the [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) using Stdio transport.

### Configuration

Add Washi to your AI agent host (`claude_desktop_config.json`, Cursor, ZCode, etc.):

```json
{
  "mcpServers": {
    "washi": {
      "command": "npx",
      "args": ["tsx", "mcp/stdio.ts"],
      "cwd": "C:\\path\\to\\washi-0.5"
    }
  }
}
```

### Tool Catalog

| Tool | Action | Safety Annotations |
|---|---|---|
| `washi_list` | List all projects on disk | `readOnly: true` |
| `washi_show` | Retrieve project metadata and parser statistics | `readOnly: true` |
| `washi_content_get` | Read the manuscript draft | `readOnly: true` |
| `washi_content_set` | Update manuscript (subject to parser validation) | `readOnly: false` |
| `washi_validate` | Run structural validation on a project | `readOnly: true` |
| `washi_render` | Render preview PDF and artifacts to directory | `readOnly: false` |
| `washi_snapshot` | Create a version snapshot checkpoint | `readOnly: false` |
| `washi_restore` | Revert to a previous snapshot version | `readOnly: false` |
| `washi_publish` | **Freeze immutable publication package** | `readOnly: false` (permanent) |
| `washi_packages` | List frozen publication manifests and checksums | `readOnly: true` |
| `washi_verify` | Audit SHA-256 integrity of frozen packages | `readOnly: true` |
| `washi_trace` | Extract DocumentAST and app-content | `readOnly: true` |
| `washi_new` | Ingest and initialize a new chapter | `readOnly: false` |
| `washi_delete` | **Permanently delete project and packages** | `destructive: true` |

### Error Ergonomics
MCP tool errors return `isError: true` with clean Arabic diagnostics and corrective suggestions rather than raw stack traces, allowing LLM agents to self-correct in a single turn.

### Agent Skill
Agent instructions are packaged under `.agents/skills/washi/SKILL.md` for AI harness discovery.

---

## Storage & Package Immutability

Washi stores all data locally under `projects/` using atomic file writes:

```text
projects/<id>/
├── content.md                  # Current working draft
├── metadata.json               # Title, versions, timestamps, publication count
├── template.json               # Layout styling, colors, margins, fonts
├── assets/                     # Chapter image assets
├── snapshots/                  # Historical checkpoints
│   ├── v1.md
│   └── v2.md
└── publications/               # IMMUTABLE FROZEN PACKAGES
    ├── v1/
    │   ├── content.md          # Frozen manuscript
    │   ├── document.pdf        # Frozen compiled vector PDF
    │   └── manifest.json       # Metadata + SHA-256 checksums + toolchain
    └── v2/
        ├── content.md
        ├── document.pdf
        └── manifest.json
```

### Cryptographic Manifest (`manifest.json`)
```json
{
  "version": 1,
  "publishedAt": "2026-09-09T08:30:00.000Z",
  "hashes": {
    "contentSha256": "4a5b6c...",
    "pdfSha256": "8e9f0a..."
  },
  "toolchain": {
    "washi": "0.5.0",
    "takumi": "0.14.1",
    "schema": "washi.app-content/0.5"
  }
}
```

Any byte modification to `content.md` or `document.pdf` after publication is detected immediately by `washi verify` (exits 1).

---

## Verification & Test Matrix

The repository maintains five test suites covering all architectural layers:

```bash
# 1. Full Production Build & TypeScript Typecheck
npm run build

# 2. CLI Acceptance Suite (27 checks - real child processes)
node scripts/cli-test.mjs

# 3. MCP Protocol Suite (18 checks - real stdio client)
node scripts/mcp-test.mjs

# 4. E2E Acceptance Suite (50 checks - against running server)
npm start &
node scripts/e2e-test.mjs http://localhost:3000

# 5. Playwright Browser UI Suite (37 checks - headless chromium)
node scripts/ui-test.mjs
```

### Test Coverage Summary

```text
Test Suite             Target                  Checks     Focus
─────────────────────────────────────────────────────────────────────────────────────────────
next build             All 9 Routes            Pass       Route generation, strict TS types
scripts/cli-test.mjs   Washi CLI               27/27      Exit codes, stdin, tamper detection
scripts/mcp-test.mjs   Washi MCP Server        18/18      Stdio protocol, annotations, schemas
scripts/e2e-test.mjs   HTTP API Routes         50/50      Publish, snapshots, path traversal
scripts/ui-test.mjs    Web Studio UI           37/37      Editor, live preview, drag-reorder
```

---

## Repository Structure

```text
├── app/                        # Next.js App Router Web Studio
│   ├── api/projects/           # REST endpoints (thin wrappers around lib/*)
│   ├── components/             # React components (outline, editor, preview)
│   ├── projects/               # Workspace pages
│   ├── trace/                  # Consumer simulator view
│   └── prompts/                # Prompt library view
├── cli/                        # Washi CLI implementation
│   ├── commands/               # 15 Command handlers (new, publish, verify...)
│   ├── ui.ts                   # Terminal formatting, tables, stderr routing
│   ├── shared.ts               # Shared CLI helpers & exit codes
│   └── washi.ts                # Commander CLI entry point
├── mcp/                        # Model Context Protocol server
│   ├── server.ts               # 14 Typed tools & MCP server factory
│   └── stdio.ts                # Stdio transport runner
├── lib/                        # WASHI DOMAIN CORE (Shared Engine)
│   ├── project.ts              # Core filesystem & unified operations
│   ├── markdown-parser.ts      # Deterministic parser & AST generator
│   ├── artifacts.ts            # DocumentAST & app-content extractors
│   ├── validate.ts             # Structural issue validator
│   ├── render-pdf.ts           # Unified Takumi PDF rendering pipeline
│   ├── takumi-renderer.tsx     # Takumi vector layout components
│   └── formula-svg.ts          # MathJax formula compilation & height caps
├── docs/                       # Comprehensive documentation
│   ├── audit/cli-mcp-audit.md  # Architecture audit report
│   ├── cli/README.md           # CLI reference guide
│   ├── cli/design.md           # CLI deep design document
│   └── agents/README.md        # Agent & MCP integration guide
├── scripts/                    # Test suites (cli-test, mcp-test, e2e-test, ui-test)
├── projects/                   # Local storage for chapter manuscripts (gitignored)
├── DECISIONS.md                # Architectural Decision Records (D-001 through D-203)
└── package.json                # Project dependencies & scripts
```

---

## Architectural Decision Records

Major architectural milestones are recorded in [`DECISIONS.md`](DECISIONS.md):

* **D-001**: Baseline fork and working-tree consolidation.
* **D-101 / D-102**: Core hardening, path traversal prevention, atomic publications.
* **D-103 / D-104**: Human-readable Arabic Zod parser errors and web interface guidelines UI polish.
* **D-201**: Washi CLI architecture — single core, semantic exit codes, `--json` stream purity.
* **D-202**: Model Context Protocol (MCP) server & agent skill contract.
* **D-203**: Architecture stabilization & core domain unification (`lib/project.ts`).

---

## License

Private / Educational Publishing Engine. All rights reserved.
