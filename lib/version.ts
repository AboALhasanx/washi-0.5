/**
 * lib/version.ts — single source of truth for the version strings Washi
 * writes into frozen artifacts.
 *
 * These strings are embedded in every publication manifest and in the derived
 * artifacts. Changing one makes new publications incomparable with older ones,
 * so they are declared exactly once here and never inlined at the call site.
 *
 * NOTE: package.json carries its own internal package version. It is
 * deliberately NOT the publication toolchain version — the toolchain version
 * must stay stable across releases so that packages published months apart
 * remain comparable.
 */

/** Product/engine version recorded in the publication manifest toolchain. */
export const WASHI_VERSION = "0.5.0";

/** document.ast schema identifier. */
export const AST_SCHEMA = "washi.document-ast/0.5" as const;
export type AstSchema = typeof AST_SCHEMA;

/** app-content.json schema identifier. */
export const APP_CONTENT_SCHEMA = "washi.app-content/0.5" as const;
export type AppContentSchema = typeof APP_CONTENT_SCHEMA;

/** Hash algorithm used for every artifact digest. */
export const HASH_ALGORITHM = "sha256";
