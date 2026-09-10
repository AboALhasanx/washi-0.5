/**
 * lib/render-pdf.ts
 * Shared render path: Markdown + theme → ChapterAST → takumi-pdf → PDF bytes.
 * Single source of rendering truth for the studio preview, the project
 * workspace, and the immutable Publication Package (Washi 0.5).
 *
 * Extracted from app/api/generate-pdf/route.ts so preview and publish
 * cannot drift apart.
 */

import fs from "node:fs";
import path from "node:path";
import React from "react";
import { parseMarkdown } from "@/lib/markdown-parser";
import {
  ChapterDoc,
  PageFooterBand,
  baseCss,
  makeRenderEnv,
  runWithRenderEnv,
} from "@/lib/takumi-renderer";
import { buildFormulaArt } from "@/lib/formula-svg";
import { StudioTheme, mergeTheme } from "@/lib/theme";
import type { ChapterAST } from "@/lib/schemas";

const FONT_FAMILIES: Array<[string, string]> = [
  ["Noto Naskh Arabic", "NotoNaskhArabic.ttf"],
  ["Noto Sans Arabic", "NotoSansArabic.ttf"],
  ["Noto Sans", "NotoSans.ttf"],
  ["JetBrains Mono", "JetBrainsMono.ttf"],
];

let fontCache: Array<{ name: string; data: () => Uint8Array }> | null = null;

function loadFonts() {
  if (!fontCache) {
    const dir = path.join(process.cwd(), "fonts");
    fontCache = FONT_FAMILIES.map(([name, file]) => ({
      name,
      data: () => new Uint8Array(fs.readFileSync(path.join(dir, file))),
    }));
  }
  return fontCache;
}

export interface RenderChapterResult {
  pdf: Buffer;
  ast: ChapterAST;
  ms: number;
}

export class RenderError extends Error {}

/**
 * Parse + render one chapter through the intended Takumi path.
 *
 * No process-local queue: theme/palette/fonts are explicit per-call via
 * RenderEnv (M3.1). MathJax's shared converter cache is pure (see freeze
 * tests). Concurrent renderChapterPdf() calls are supported and covered by
 * tests/render-concurrency.test.mjs.
 */
export async function renderChapterPdf(
  markdown: string,
  themeInput?: unknown
): Promise<RenderChapterResult> {
  const { ast } = parseMarkdown(markdown);

  const takumi: any = await import("takumi-pdf");
  const renderFn = takumi.render ?? takumi.default?.render;
  const measureFn = takumi.measure ?? takumi.default?.measure;
  if (typeof renderFn !== "function") {
    throw new RenderError("takumi-pdf has no render() export");
  }

  const theme: StudioTheme = mergeTheme(themeInput);
  const env = makeRenderEnv(theme, ast.frontmatter.language);

  return runWithRenderEnv(env, async () => {
    const PAGE_SIZES: Record<string, { w: number; h: number }> = {
      a4: { w: 595, h: 1123 },
      letter: { w: 612, h: 1056 },
    };
    const pageSize = PAGE_SIZES[theme.page.size] ?? PAGE_SIZES.a4;
    const TOP = theme.page.marginTop;
    const SIDE = theme.page.marginSide;
    const footer = React.createElement(PageFooterBand, { ast });
    let bottom = 48;
    let coverHeight = 946;
    if (typeof measureFn === "function") {
      const m = await measureFn(footer, {
        size: theme.page.size,
        fonts: loadFonts(),
        fontFamilies: FONT_FAMILIES.map(([name]) => name),
        css: baseCss,
      });
      bottom = Math.max(48, Math.ceil(m.height) + 20);
      coverHeight = pageSize.h - TOP - bottom - 3;
    }

    const formulaArt = await buildFormulaArt(ast);

    const element = React.createElement(ChapterDoc, {
      ast,
      coverHeight,
      formulaArt: formulaArt.map,
    });

    const t0 = Date.now();
    const pdfBytes: Uint8Array = await renderFn(element, {
      size: theme.page.size,
      margin: { top: TOP, bottom, left: SIDE, right: SIDE },
      footer,
      backgroundColor: theme.page.background,
      images: formulaArt.images,
      fonts: loadFonts(),
      fontFamilies: FONT_FAMILIES.map(([name]) => name),
      css: baseCss,
      lang: ast.frontmatter.language,
      outline: true,
      metadata: {
        title: ast.frontmatter.title,
        creator: theme.footer.brand || "washi",
        creationDate: new Date().toISOString().slice(0, 10),
      },
    });
    const ms = Date.now() - t0;

    return { pdf: Buffer.from(pdfBytes), ast, ms };
  });
}

export { FONT_FAMILIES, loadFonts };
