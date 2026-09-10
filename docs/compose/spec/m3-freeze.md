---
feature: m3-freeze
status: delivered
updated: 2026-09-10
branch: m3-1-render-context
commits: a954c47..HEAD
---

# M3 Renderer Freeze

## Report

**What was built** — Final M3 closure. Queue **removed** after concurrent proofs. MathJax `doc` classified SAFE SHARED. StatBars dead `glueDepth` removed. RenderEnv delivered via **AsyncLocalStorage** (React `createContext` breaks `next build` on API routes). New `tests/render-concurrency.test.mjs` pins isolation. Decisions in `DECISIONS.md` D-301.

**Verification** — tsc clean; `npm test` **88/88**; `npm run build` OK; render-concurrency 6/6; isolation 3/3.

**Journey log**
1. MathJax concurrent convert: 0/80 mismatches.
2. 8-way concurrent full renders without queue: 0 brand leaks → REMOVE queue.
3. PDF content streams are Flate-compressed — isolate via uncompressed metadata brands + AST titles, not body tokens.
4. `next build` rejected `React.createContext` in API-route import graph → AsyncLocalStorage.
5. StatBars is multi-row by design; KT on the whole chart would break pagination.

## [S1] Problem

Uncertainty remained after M3.1/M3.2: is the queue still needed? Is MathJax `doc` safe? Are there other globals?

## [S2] Design

Audit → evidence → explicit decisions → tests → freeze. No M4 features. No M3.3/M3.4.

## [S3] Out of Scope

M4 Studio/editor productization; project.ts split; visual redesign.

## Tasks

- [x] T1: Audit queue + formula + module state
- [x] T2: Concurrency / failure / sequential / MathJax tests
- [x] T3: Queue REMOVE + StatBars glueDepth + docs + full verify
