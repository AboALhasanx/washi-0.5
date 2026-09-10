---
feature: m3-2-render-queue
status: delivered
updated: 2026-09-10
branch: m3-render-queue
commits: 7333f6f7b9d89871c9258346dc895cd9715f1eab..HEAD
---

# M3.2 — Serial renderQueue

## Report

**What was built** — `renderChapterPdf()` is now wrapped in a process-local promise-chain queue (`renderChain`). Each call enqueues the previous body (`renderChapterPdfUnqueued`); only one render can be in flight, so `applyStudioTheme()` cannot be overwritten mid-await. Rejections still reject that caller but do not poison the chain. Public signature and return type are unchanged. New `tests/render-queue.test.mjs` pins concurrent isolation (brand metadata must not cross-leak), failure non-blocking, and sequential correctness.

**Verification**
- `node --import tsx --test --test-concurrency=1 --test-timeout=180000 --test-force-exit tests/render-queue.test.mjs` — PASS 3/3
- `npx tsc --noEmit` — PASS
- `npm test` — 80 pass / 2 fail, both PRE-EXISTING:
  - golden snapshot: Windows `core.autocrlf` checks the sample out as CRLF; golden expects LF. Passes when sample is LF.
  - `a deleted artifact is reported as missing` — also fails on `main`.

**Journey log**
1. Race is real: `applyStudioTheme` then 3 awaits with no lock (`lib/render-pdf.ts` + module `let` in `takumi-renderer.tsx`).
2. Queue is containment only — M3.1 RenderContext is the proper fix and remains the next M3 step.
3. `metadata.creator` uses the local `theme` var, not module `THEME`; isolation tests must assert *absence* of the other brand (footer reads `THEME` at render time).
4. Windows autocrlf makes fresh worktree checkouts fail golden tests on sample code blocks; not an M3.2 regression.
5. Reviewer: no critical findings; ship.

## [S1] Problem

`applyStudioTheme()` writes module-level theme state in `lib/takumi-renderer.tsx`, and `renderChapterPdf()` calls it then awaits three times (`measureFn`, `buildFormulaArt`, `renderFn`) with no lock. Two concurrent renders with different themes interleave: the second call overwrites THEME/palette/fonts before the first finishes building or rendering its element tree. The output PDF can pick up the wrong theme.

This is a real race, not theoretical debt. M3.1 (RenderContext) is the proper fix but touches ~1444 lines. M3.2 is the immediate containment.

## [S2] Design

Serialize every `renderChapterPdf()` call inside the process with a promise chain:

- Module-level `renderChain: Promise<void>`.
- Public `renderChapterPdf` enqueues the real work; the chain advances even if a render rejects (errors propagate to that caller only).
- No change to the public signature or return type (`Promise<RenderChapterResult>`).
- No change to rendering behavior for a single call.
- Queue is process-local (same as the global state it protects). Cross-process concurrency was never the bug.

Acceptance test (`tests/render-queue.test.mjs`):

- Fire two `renderChapterPdf` calls via `Promise.all` with different markdown + different themes.
- Both resolve.
- Each `ast.frontmatter.title` matches its own markdown.
- Each PDF is non-empty and the two PDFs differ.
- Brand metadata does not cross-leak (negative includes on the other theme's brand).

## [S3] Out of Scope

- M3.1 RenderContext / removing module-level `let` from the renderer.
- Cross-process locking, worker pools, parallel render performance.
- Changing takumi-pdf, fonts, or theme merge semantics.
- M3.3 project.ts split / M3.4 canonical API.

## Tasks

- [x] T1: Add serial `renderQueue` around `renderChapterPdf` — acceptance: concurrent renders cannot interleave; public API unchanged (covers: S2)
- [x] T2: Add `tests/render-queue.test.mjs` concurrent-theme test — acceptance: concurrent isolation + failure non-blocking + sequential; typecheck clean (covers: S2; depends: T1)
