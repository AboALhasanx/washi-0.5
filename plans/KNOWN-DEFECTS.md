# Known defects (pre-M3.1)

Tracked so “pre-existing” does not hide real bugs. Update when fixed; delete entries when green.

## KD-1 — Golden snapshot fails on Windows CRLF checkout

| Field | Value |
|-------|--------|
| **Test** | `tests/artifacts.test.mjs` → `matches the golden snapshot` |
| **Symptom** | Code-block `code` strings contain `\r\n`; golden fixture was generated with `\n`. |
| **Root cause** | `core.autocrlf=true` + no `.gitattributes`. Fresh worktree/checkout converts `public/samples/computer-networks-ch1.md` to CRLF; parser preserves those bytes in AST. |
| **Not a product bug** | Artifact builder is faithful to input bytes. |
| **Repro** | Fresh worktree on Windows → `npm test`. Normalize sample to LF → test passes. |
| **Fix direction** | Add `.gitattributes` with `* text=auto eol=lf` (or at least `public/samples/** eol=lf`), or normalize newlines in the golden comparator. |
| **Priority** | P2 — blocks clean Windows CI, not production correctness. |

## KD-2 — `fs.rmSync` silently fails on non-ASCII paths (Windows)

| Field | Value |
|-------|--------|
| **Test** | `tests/lifecycle.test.mjs` → `a deleted artifact is reported as missing, not merely changed` |
| **Symptom** | After `fs.rmSync(document.ast)`, `verifyPublication` still returns `status: "ok"`. |
| **Root cause** | On win32, `fs.rmSync` on a path under an Arabic project id (e.g. `projects/فصل-اختبار-دورة-الحياة/...`) **returns without deleting and without throwing**. The file remains; verify correctly reports every sealed artifact as present. |
| **Evidence** | Manual repro: ASCII id → `exists after rm false`, `status mismatch`. Arabic id → `exists after rm true`, `status ok`. Same code path in `verifyPublication`. |
| **Not a product bug** | `verifyPublication` logic (M1) is correct. The **test’s delete step** is not reliable on Windows Unicode paths. |
| **Related** | `deleteProject` already works around this with rename-to-ASCII-tombstone + `cmd /c rmdir` (`lib/project.ts`). |
| **Fix direction** | In the test, delete via rename to a temp ASCII path then `rmSync`, or use an ASCII-only project title for this case. Do **not** weaken verify. |
| **Priority** | P1 — false confidence that M1 “deleted artifact” detection is broken. |
| **Status** | **FIXED** (M3.1 branch) — test now renames to an ASCII tombstone under `output/` before `rmSync`. Product `verifyPublication` unchanged. |

## Out of scope notes

- Neither defect is caused by M3.2 (`renderQueue`).
- Neither blocks M3.1 (RenderContext).
- M4.5 (`execSync` in `deleteProject`) is related to KD-2’s Windows delete fragility.
