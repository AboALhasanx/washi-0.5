# Washi CLI Reference Guide

> **The terminal interface for local-first educational content publishing.**  
> Transform Markdown manuscripts into **frozen, traceable educational packages** directly from the command line — without launching a browser.

---

## Quick Start

```bash
# 1. Ingest from file
npm run washi -- new "Computer Networks — Chapter 1" --file ch1.md

# 2. Ingest via stdin (standard AI agent workflow)
cat ch1.md | npm run washi -- new "Introduction to Networks" --subject computer-networks

# 3. Inspect projects
npm run washi -- list
npm run washi -- show computer-networks-ch1

# 4. Validate manuscript syntax and structure
npm run washi -- validate computer-networks-ch1

# 5. Render preview PDF (output/computer-networks-ch1/document.pdf)
npm run washi -- render computer-networks-ch1

# 6. Publish = Freeze immutable package v1
npm run washi -- publish computer-networks-ch1 --yes

# 7. Audit package cryptographic hashes
npm run washi -- verify computer-networks-ch1

# 8. Extract consumer read model (DocumentAST + concepts + flashcards + questions)
npm run washi -- trace computer-networks-ch1 --version 1 --json
```

---

## Command Classification (v0.1 Contract)

Commands are divided into three operational tiers:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Tier 1: Public / Stable (Core Authoring & Publishing Pipeline)          │
│   new · validate · render · publish · verify · trace                    │
├─────────────────────────────────────────────────────────────────────────┤
│ Tier 2: Management / Inspection                                         │
│   list · show · packages · snapshot · restore · delete                  │
├─────────────────────────────────────────────────────────────────────────┤
│ Tier 3: Dev / Demo (Utilities)                                          │
│   edit · serve · demo                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1. Public / Stable Commands

#### `washi new <title>`
Creates a new project from a file or standard input.
* **Flags**:
  * `--subject <slug>`: Subject identifier (e.g. `computer-networks`).
  * `--lang <ar|en>`: Chapter language (default: `ar`).
  * `--file <path>`: Source Markdown file path (omit to read from stdin).
  * `--json`: Emits `{ project: { id, title, currentVersion } }`.
* **Exit Codes**: `0` on success, `1` on invalid frontmatter, `3` on missing title.

#### `washi validate <id>`
Performs a deep structural validation pass on the project draft using `validateProject`.
* **Checks**: Unbalanced math (`$$`), unknown callout components, missing assets, broken frontmatter.
* **Flags**: `--json` emits `{ ok, errors, warnings, issues: [...] }`.
* **Exit Codes**: `0` if valid, `1` if structural errors exist, `2` if project not found.

#### `washi render <id>`
Generates fresh preview artifacts via Takumi PDF and Washi Core.
* **Output Artifacts**: `document.pdf`, `document.ast`, and `app-content.json`.
* **Flags**:
  * `--out <dir>`: Custom destination directory (default: `output/<id>/`).
  * `--json`: Emits `{ dir, pdfPath, ms }`.
* **Exit Codes**: `0` on success, `1` on parser failure, `2` if project not found.

#### `washi publish <id>`
Atomically freezes the current draft into an immutable publication package (`publications/vN/`).
* **Flags**:
  * `--yes`: Skips interactive confirmation (mandatory in CI / headless agent runs).
  * `--json`: Emits `{ version, dir, manifest }`.
* **Exit Codes**: `0` on success, `1` on validation refusal (cannot publish invalid drafts), `2` if not found.

#### `washi verify <id>`
Audits the cryptographic integrity of frozen publication packages by recalculating SHA-256 hashes against `manifest.json`.
* **Flags**:
  * `--version <n>`: Audits a specific publication version (e.g. `--version 1`). Omit to audit all versions.
  * `--json`: Emits `{ id, results: [{ version, status: "ok"|"mismatch"|"legacy"|"missing" }] }`.
* **Exit Codes**: `0` on match, `1` on checksum mismatch/tamper, `2` if project/version not found, `3` on invalid numeric version.

#### `washi trace <id>`
Extracts the platform-consumer read model: DocumentAST, concepts, flashcards, and review questions.
* **Flags**:
  * `--version <n>`: Reads a frozen publication package instead of the current draft.
  * `--json`: Emits the full `{ source, manifest, documentAst, appContent }` payload.
* **Exit Codes**: `0` on success, `2` if project/version not found, `3` on non-numeric version string.

---

### 2. Management Commands

#### `washi list`
Displays a tabular list of all projects stored in `projects/`.
* **Flags**: `--json` emits `{ projects: [{ id, title, currentVersion, publicationCount }] }`.

#### `washi show <id>`
Displays detailed project statistics (section counts, word counts, block counts, versions).
* **Flags**: `--json` emits `{ metadata, stats: { blocks, concepts, flashcards, questions } }`.

#### `washi packages <id>`
Lists all frozen publication packages for a project with their creation timestamps and SHA-256 checksums.
* **Flags**: `--json` emits `{ publications: [PublicationManifest] }`.

#### `washi snapshot <id>`
Creates a manual version snapshot checkpoint (`snapshots/vN.md`) of the current manuscript.
* **Flags**: `--json` emits `{ currentVersion: number }`.

#### `washi restore <id> <version>`
Restores an earlier snapshot as a brand new current version (append-only history; historical revisions are never overwritten).
* **Flags**: `--json` emits `{ currentVersion: number }`.

#### `washi delete <id>`
Permanently deletes a project and all associated snapshots and publication packages.
* **Flags**: `--yes` confirms deletion (mandatory in headless environments).
* **Exit Codes**: `0` on deletion, `1` if `--yes` was omitted in non-TTY mode.

---

### 3. Dev / Utility Commands

* `washi edit <id>`: Launches `$EDITOR` (or `nano`/`vim`) on `content.md`.
* `washi serve [--port 3000]`: Starts the local Next.js Web Studio server.
* `washi demo [--json]`: Executes an automated end-to-end walkthrough using the bundled sample chapter.

---

## Exit Code Contract

Automation scripts and AI agents must rely on semantic exit codes:

```text
0 = OK / SUCCESS
1 = LOGICAL REFUSAL / VALIDATION ERROR
    - Malformed frontmatter
    - Structural syntax errors (unclosed $$, invalid callouts)
    - Publication refused due to errors
    - Hash mismatch during verification (tampered package)
2 = NOT FOUND
    - Unknown project ID
    - Publication package version does not exist
3 = USAGE ERROR
    - Missing required command arguments
    - Unknown flags or options
    - Invalid numeric values (e.g. washi trace <id> --version abc)
4 = UNEXPECTED ERROR
    - Unhandled exceptions, filesystem permission failures
```

---

## JSON Output & Pipe Hygiene

In `--json` mode, Washi strictly enforces stream separation:
* **`stdout`**: Clean, machine-readable JSON only.
* **`stderr`**: Diagnostic logs, banners, spinners, and progress indicators.

This ensures flawless pipeline composition:

```bash
# Extract all indexed concept terms
npm run washi -- trace computer-networks --version 1 --json | jq '.appContent.concepts[].term'

# Count review question candidates
npm run washi -- trace computer-networks --json | jq '.appContent.questionCandidates | length'
```

---

## AI Agent Integration Recipe

```bash
# 1. AI agent generates structured chapter with valid frontmatter
generate_chapter_content > draft.md

# 2. Ingest chapter via stdin
cat draft.md | npm run washi -- new "Introduction to Databases" --subject db-systems --json

# 3. Validate manuscript structure
npm run washi -- validate introduction-to-databases --json

# 4. Freeze immutable package
npm run washi -- publish introduction-to-databases --yes --json

# 5. Extract platform read model with verified source provenance
npm run washi -- trace introduction-to-databases --version 1 --json > platform-payload.json
```
