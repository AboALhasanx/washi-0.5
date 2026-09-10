---
feature: m3-1-render-context
status: delivered
updated: 2026-09-10
branch: m3-1-render-context
commits: f728da7b4ff6f515cb7fc11f4210bb95cb794762..HEAD
---

# M3.1 — RenderContext (no module-level renderer state)

## Report

**What was built** — `lib/takumi-renderer.tsx` no longer holds mutable module state. Theme, palette, fonts, and `arBodyMode` live in an explicit `RenderEnv` built by `makeRenderEnv()` and delivered through React context (`RenderProvider` / `RenderCtx`). True components read env via `useContext`; plain-function builders (`DefinitionCard`, `CalloutBox`, `StatBars`, `ComparisonTable`, `FormulaCard`, `CodeCard`, `RenderNode`) take `env` + `glueDepth` as arguments so hook order stays safe. `KT(children, glueDepth)` is a pure function — no module glue stack. `applyStudioTheme` is deleted. `lib/render-pdf.ts` and `scripts/smoke-render.tsx` wrap trees in `RenderProvider`. M3.2 `renderQueue` remains as belt-and-suspenders.

**Also fixed (KD-2)** — `tests/lifecycle.test.mjs` deleted-artifact case now renames the file to an ASCII tombstone before `rmSync`, because win32 `fs.rmSync` silently no-ops on Arabic paths. `verifyPublication` was never wrong.

**Verification**
- `npx tsc --noEmit` — PASS
- `grep applyStudioTheme|let THEME|let palette|let FONT_|let arBodyMode|let glueDepth` in renderer — empty
- `tests/render-queue.test.mjs` — PASS 3/3
- `npm test` — **82/82 PASS** (full suite green after KD-2 test fix; golden required LF sample which is checkout-sensitive — KD-1)

**Journey log**
1. Plain-function builders cannot call hooks; SectionBody does one `useContext` and passes `env` down.
2. `React.createElement(Provider, {env}, child)` fails TS overload — put `children` in props.
3. `makeRenderEnv` must receive `ast.frontmatter.language` or Arabic digit unification silently turns off.
4. win32 `fs.rmSync` on Unicode paths returns success without deleting (KD-2).
5. Post-M3.1: audit whether the queue can be removed; do **not** open M3.3/M3.4 before that audit (per review).

## [S1] Problem

`lib/takumi-renderer.tsx` kept mutable module-level state (`THEME`, `palette`, `FONT_*`, `arBodyMode`, `glueDepth`). `applyStudioTheme()` mutated it; every component closed over it. M3.2 serialized renders so the race could not fire, but the architecture debt remained.

## [S2] Design

Introduce an explicit render environment and thread it through the tree:

```ts
export type RenderEnv = {
  theme: StudioTheme;
  palette: /* colors + callouts */;
  fontBody: string;
  fontHead: string;
  fontMono: string;
  arBodyMode: boolean;
};

export const RenderCtx = React.createContext<RenderEnv>(/* DEFAULT_THEME env */);
export function makeRenderEnv(themeInput?: unknown, language?: string): RenderEnv
export function RenderProvider({ env, children })
```

Rules:

1. **Zero module-level `let`** in `takumi-renderer.tsx`.
2. **`applyStudioTheme` is deleted.** `render-pdf.ts` builds `makeRenderEnv(theme, language)` and wraps `PageFooterBand` and `ChapterDoc` in `RenderProvider`.
3. **True React components** read env via `useContext(RenderCtx)`.
4. **Plain-function builders** take `env: RenderEnv` and `glueDepth: number` — they must **not** call hooks.
5. **`KT(children, glueDepth)`** — depth is a parameter, not a module stack.
6. **`arabicize(s, arBodyMode)`** — flag is explicit.
7. `scripts/smoke-render.tsx` wraps with `makeRenderEnv(undefined, ast.frontmatter.language)`.
8. M3.2 queue **stays** for this delivery.

Acceptance:

- No module-scope mutable `let` in the renderer.
- No `applyStudioTheme` call sites in `lib/` / `scripts/`.
- Concurrent-theme test passes.
- `tsc` clean; `npm test` green (82/82).

## [S3] Out of Scope

- Removing the M3.2 queue (post-M3.1 audit decides).
- M3.3 project.ts split / M3.4 canonical API.
- Visual redesign; theme token changes.
- KD-1 (CRLF golden / `.gitattributes`).

## Tasks

- [x] T1: Add `RenderEnv` / `RenderCtx` / `makeRenderEnv` / `RenderProvider` — acceptance: exported and used by render-pdf (covers: S2)
- [x] T2: Convert renderer components + plain builders to env/context; remove all module `let` and `applyStudioTheme` — acceptance: zero module mutable state; `tsc` clean (covers: S2; depends: T1)
- [x] T3: Update `render-pdf.ts` + smoke script; keep queue — acceptance: concurrent test + full suite no new fails (covers: S2; depends: T2)
