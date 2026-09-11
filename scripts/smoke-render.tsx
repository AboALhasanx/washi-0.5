/**
 * scripts/smoke-render.tsx
 * Standalone engine smoke test: markdown -> parse -> ChapterAST -> takumi-pdf.
 * Verifies the 0.14.1 API + Arabic fonts + pagination BEFORE touching the app.
 *
 * Run:  npx tsx scripts/smoke-render.tsx
 */

import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render, measure } from "takumi-pdf";
import { parseMarkdown } from "../lib/markdown-parser";
import {
  ChapterDoc,
  PageFooterBand,
  baseCss,
  makeRenderEnv,
  runWithRenderEnv,
} from "../lib/takumi-renderer";
import { buildFormulaArt } from "../lib/formula-svg";

async function loadFonts() {
  const dir = path.resolve("fonts");
  const families: Array<[string, string]> = [
    ["Noto Naskh Arabic", "NotoNaskhArabic.ttf"],
    ["Noto Sans Arabic", "NotoSansArabic.ttf"],
    ["Noto Sans", "NotoSans.ttf"],
    ["JetBrains Mono", "JetBrainsMono.ttf"],
  ];
  return families.map(([name, file]) => ({
    name,
    data: () => new Uint8Array(fs.readFileSync(path.join(dir, file))),
  }));
}

async function verify(pdfPath: string) {
  const pdfjs: any = await import("pdfjs6/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data }).promise;
  console.log("pages:", doc.numPages);
  const page1 = await doc.getPage(1);
  const tc = await page1.getTextContent();
  const text = tc.items.map((i: any) => i.str).join(" ");
  const arabicOk = /[\u0600-\u06FF]/.test(text);
  console.log("page1 has arabic glyphs:", arabicOk);
  console.log("page1 sample:", text.slice(0, 140).replace(/\s+/g, " "));
  await (doc.cleanup?.() ?? doc.destroy?.());
}

async function main() {
  const md = fs.readFileSync(path.resolve("samples/software-engineering/chapter-09.md"), "utf8");
  const { ast } = parseMarkdown(md);
  console.log("parsed:", ast.sections.length, "sections,", ast.frontmatter.title);

  const fonts = await loadFonts();
  const fontFamilies = ["Noto Naskh Arabic", "Noto Sans Arabic", "Noto Sans", "JetBrains Mono"];

  // DEFAULT_THEME env; arBodyMode from AST language.
  const env = makeRenderEnv(undefined, ast.frontmatter.language);

  await runWithRenderEnv(env, async () => {
    // Page geometry (A4 = 595×1123 px @96dpi): measure the footer band first,
    // reserve its margin exactly, and let the cover fill page 1 (see route.ts).
    const PAGE_H = 1123;
    const TOP = 56;
    const footer = React.createElement(PageFooterBand, { ast });
    const band = await measure(footer, { size: "a4", fonts, fontFamilies, css: baseCss });
    const bottom = Math.max(48, Math.ceil(band.height) + 20);
    const coverHeight = PAGE_H - TOP - bottom - 3;

    const formulaArt = await buildFormulaArt(ast, 13.5);
    console.log("formula SVGs:", formulaArt.images.length);

    const element = React.createElement(ChapterDoc, {
      ast,
      coverHeight,
      formulaArt: formulaArt.map,
    });

    const t0 = Date.now();
    const pdf = await render(element, {
      size: "a4",
      margin: { top: TOP, bottom, left: 56, right: 56 },
      footer,
      backgroundColor: "#FFFCF8",
      images: formulaArt.images,
      fonts,
      fontFamilies,
      css: baseCss,
      lang: "ar",
      outline: true,
      metadata: {
        title: ast.frontmatter.title,
        authors: ["washi"],
        creator: "washi (takumi-pdf)",
        creationDate: "2026-09-04",
      },
    });
    console.log("render:", Date.now() - t0, "ms,", (pdf.length / 1024).toFixed(1), "KB");

    fs.mkdirSync("output", { recursive: true });
    const out = path.resolve("output/washi-chapter9.pdf");
    fs.writeFileSync(out, Buffer.from(pdf));
    console.log("written:", out);

    await verify(out);
  });
}

main().catch((e) => {
  console.error("SMOKE FAILED:", e?.message ?? e);
  console.error(e?.stack?.split("\n").slice(0, 6).join("\n"));
  process.exit(1);
});
