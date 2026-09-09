# Washi CLI — Architecture & Deep Design Specification (D-201, D-203)

> **Status**: Merged into `main` (`48acbe1`).  
> **Scope**: Architectural specification, command grammar, stream hygiene, security invariants, and domain contracts for the Washi CLI.

---

## 1. Motivation & Context

Washi started as a local-first Web Studio (Next.js). However, the heart of the system is the publishing pipeline:
$$\text{Markdown} \longrightarrow \text{Deterministic AST} \longrightarrow \text{Takumi PDF} \longrightarrow \text{Sealed Package} \longrightarrow \text{Platform Ingestion}$$

The natural interface for this pipeline is the command line:
1. **Power Authors**: Execute `washi validate` and `washi publish` without switching away from text editors.
2. **AI Agents (Primary Focus)**: Autonomous agents author Markdown files and require shell commands to ingest, validate, freeze packages, and retrieve machine-readable JSON representations.
3. **CI/CD Pipelines**: Automated systems need predictable exit codes and deterministic outputs to build and audit educational packages.

---

## 2. Goals & Non-Goals

### Goals
- **Full Lifecycle Coverage**: Ingest $\rightarrow$ Validate $\rightarrow$ Render $\rightarrow$ Snapshot/Restore $\rightarrow$ Publish $\rightarrow$ Verify $\rightarrow$ Trace.
- **Unified Domain Core**: The CLI calls `lib/*` directly (same parser, same atomic publisher, same path sanitization). Zero duplicate domain semantics.
- **Strict Machine Output (`--json`)**: Stable JSON outputs matching Web Studio API schemas.
- **Semantic Exit Codes**: Deterministic status codes allowing scripts to act without scraping text output.

### Non-Goals
- No standalone npm package distribution yet (runs via `npm run washi -- <cmd>` in repo).
- No background daemon or file-watching service (every command is a single-shot execution, except `washi serve`).
- No multi-user authentication layer (strictly local-first, single-user workspace).
- No monorepo extraction until third-party consumer boundaries require it.

---

## 3. Guiding Principles

| Principle | Practical Application |
|---|---|
| **Single Core** | `cli/` is purely presentation logic over `lib/*`. Domain changes live in `lib/`. |
| **Publish Means Freeze** | Packages are permanent, append-only, and sealed with SHA-256 hashes. |
| **Exit Code is Contract** | `0` OK, `1` Refusal/Validation failure, `2` Not found, `3` Usage error, `4` Unexpected. |
| **Stream Hygiene** | `stdout` is reserved strictly for machine JSON when `--json` is active. Diagnostics go to `stderr`. |
| **Self-Remediating Errors** | Every error message explains *what failed* and *how to fix it*. |
| **Inherited Security** | Reuses `assertValidProjectId()` and `projectDir()` path containment. |
| **Guarded Deletion** | `washi delete` requires interactive confirmation or `--yes` in headless mode. |

---

## 4. System Layering

```text
┌────────────────────────────────────── cli/ ──────────────────────────────────────┐
│  washi.ts          (Commander entry point & exit code mapper)                    │
│  ui.ts             (Terminal formatting, tables, stderr routing)                 │
│  shared.ts         (Argument parsing, exit code constants)                       │
│  commands/         (15 isolated command handlers — presentation only)            │
└──────────────────────────────────────────┬───────────────────────────────────────┘
                                           │ Direct TypeScript calls (No HTTP)
                                           ▼
┌────────────────────────────────────── lib/ ──────────────────────────────────────┐
│  project.ts        (CRUD, unified operations: buildTraceModel, verify, render)   │
│  markdown-parser.ts(Deterministic remark parser & provenance mapping)             │
│  artifacts.ts      (DocumentAST & app-content generator)                         │
│  validate.ts       (Structural validation rules)                                 │
│  render-pdf.ts     (Takumi vector PDF compilation)                               │
└──────────────────────────────────────────┬───────────────────────────────────────┘
                                           │ Filesystem writes
                                           ▼
┌────────────────────────────────── projects/<id>/ ────────────────────────────────┐
│  content.md · metadata.json · template.json · snapshots/ · publications/vN/      │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Command Grammar & Operational Tiers

### Tier 1: Public / Stable (The Authoring Pipeline)
```text
washi new <title> [--subject S] [--lang ar|en] [--file F | stdin]
washi validate <id>                     # Structural validation report (exits 1 on error)
washi render <id> [--out DIR]           # Preview PDF + AST artifacts (not frozen)
washi publish <id> [--yes]              # Freeze immutable publication vN
washi verify <id> [--version N]         # Audit SHA-256 hashes against manifest
washi trace <id> [--version N]          # Extract DocumentAST + concepts + flashcards
```

### Tier 2: Management / Inspection
```text
washi list [--json]                     # Project inventory
washi show <id> [--json]                # Project statistics and version history
washi packages <id> [--json]            # List publication manifests and hashes
washi snapshot <id>                     # Manual version checkpoint
washi restore <id> <version>            # Restore snapshot as new append-only version
washi delete <id> [--yes]               # Permanent project removal
```

### Tier 3: Dev / Utilities
```text
washi edit <id>                         # Open manuscript in $EDITOR
washi serve [--port 3000]               # Start Web Studio server
washi demo [--json]                     # Run automated end-to-end walkthrough
washi -V / --help                       # Display version / help
```

---

## 6. Output Contracts & Machine Stream Separation

### Default (Human Terminal)
- Formatted tables, status glyphs (`✓`/`✗`), and colored highlights.
- Colors auto-disable in non-TTY environments or when `NO_COLOR` is set.

### `--json` (Machine Pipe)
- Emits a single, unadorned JSON object on `stdout`.
- Logs, progress spinners, and error banners are routed exclusively to `stderr`.
- Verified via piping:
  ```bash
  washi trace computer-networks --json | jq .
  ```

---

## 7. Semantic Exit Code Contract

| Code | Label | Trigger Condition | Example Output |
|---|---|---|---|
| `0` | **OK** | Operation completed successfully. | `✓ Publication frozen: v1` |
| `1` | **Refusal** | Content validation failed, publish refused, hash mismatch. | `✗ 1 structural error — unbalanced $$` |
| `2` | **Not Found** | Project ID or version does not exist. | `✗ No project found with identifier: xyz` |
| `3` | **Usage Error** | Missing required arguments, invalid numeric flag. | `✗ Version number must be a positive integer` |
| `4` | **Unexpected** | Filesystem failure, uncaught exception. | `✗ Unexpected error: EACCES` |

---

## 8. Security & Path Containment

- **Project Identifiers**: All externally supplied project IDs pass through `assertValidProjectId(id)`. Characters like `/`, `\`, `..`, and null bytes are rejected.
- **Version Parameter**: Strict `/^\d+$/` numeric checking prevents path traversal through version numbers (e.g. `1/../../x`).
- **Atomic Publications**: Publications write to temporary staging directories before atomic promotion, preventing partial or corrupted publication packages.
- **Cryptographic Audit**: Package contents are sealed with SHA-256 hashes in `manifest.json`. Any post-freeze file mutation is detected by `washi verify`.

---

## 9. Core Domain Primitives (`lib/project.ts`)

To eliminate semantic drift across interfaces, 4 operations are centralized in Washi Core:
1. `buildTraceModel(id, version?)`: Consolidates AST, concepts, flashcards, questions, and provenance.
2. `verifyPublication(id, version)`: Audits checksums of `content.md` and `document.pdf`.
3. `listPublicationManifests(id)`: Enumerates frozen package manifests.
4. `renderPreviewToDir(id, outDir?)`: Orchestrates preview rendering to disk.

---

## 10. Acceptance Criteria & Test Suites

The CLI implementation is verified by `scripts/cli-test.mjs` (27/27 automated checks):
- Ingestion via stdin and file.
- Semantic exit codes on syntax errors, unknown commands, and invalid flags.
- Real Takumi PDF compilation.
- Snapshot creation and append-only version restoration.
- Publication package freeze and byte tampering detection.
- Machine stdout purity in `--json` mode.
