/**
 * tests/render-queue.test.mjs — M3.2 acceptance (queue still relevant after M3.1).
 *
 * M3.1 removed module-level theme state from the renderer. The queue remains
 * as belt-and-suspenders; these tests pin concurrent isolation of the public
 * renderChapterPdf() API.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { renderChapterPdf } = await import("../lib/render-pdf.ts");

function chapter(title, body) {
  return [
    "---",
    "subject: render-queue",
    `title: "${title}"`,
    "language: ar",
    "sources:",
    "  - document: Queue Test.pdf",
    "    pages: [1]",
    "---",
    "",
    `# ${title}`,
    "",
    body,
    "",
  ].join("\n");
}

const THEME_A = {
  footer: { brand: "BRAND_ALPHA_QUEUE", tagline: "alpha" },
  colors: { accent: "#FF0000", accentDeep: "#990000", accentSoft: "#FFE0E0" },
};

const THEME_B = {
  footer: { brand: "BRAND_BETA_QUEUE", tagline: "beta" },
  colors: { accent: "#0000FF", accentDeep: "#000099", accentSoft: "#E0E0FF" },
};

describe("renderQueue (M3.2)", () => {
  test("two concurrent renders with different themes stay isolated", async () => {
    const mdA = chapter("عنوان ألف", "فقرة الاختبار الأولى للطابور.");
    const mdB = chapter("عنوان باء", "فقرة الاختبار الثانية للطابور.");

    const [a, b] = await Promise.all([
      renderChapterPdf(mdA, THEME_A),
      renderChapterPdf(mdB, THEME_B),
    ]);

    assert.equal(a.ast.frontmatter.title, "عنوان ألف");
    assert.equal(b.ast.frontmatter.title, "عنوان باء");
    assert.ok(a.pdf.length > 500, `PDF A too small: ${a.pdf.length}`);
    assert.ok(b.pdf.length > 500, `PDF B too small: ${b.pdf.length}`);
    assert.notDeepEqual(a.pdf, b.pdf, "different themes must produce different PDFs");

    // Metadata creator is taken from theme.footer.brand at render time.
    const latinA = a.pdf.toString("latin1");
    const latinB = b.pdf.toString("latin1");
    assert.ok(
      latinA.includes("BRAND_ALPHA_QUEUE"),
      "PDF A should carry theme A brand in metadata"
    );
    assert.ok(
      latinB.includes("BRAND_BETA_QUEUE"),
      "PDF B should carry theme B brand in metadata"
    );
    assert.ok(!latinA.includes("BRAND_BETA_QUEUE"), "PDF A must not leak theme B brand");
    assert.ok(!latinB.includes("BRAND_ALPHA_QUEUE"), "PDF B must not leak theme A brand");
  });

  test("a failed render does not block the next one", async () => {
    const bad = "---\nsubject: render-queue\nlanguage: ar\n---\n"; // missing title/sources
    await assert.rejects(() => renderChapterPdf(bad, THEME_A));

    const good = await renderChapterPdf(chapter("بعد الفشل", "استمرار سليم."), THEME_B);
    assert.equal(good.ast.frontmatter.title, "بعد الفشل");
    assert.ok(good.pdf.length > 500);
  });

  test("sequential renders still work and stay correct", async () => {
    const a = await renderChapterPdf(chapter("تسلسلي ١", "نص أول."), THEME_A);
    const b = await renderChapterPdf(chapter("تسلسلي ٢", "نص ثانٍ."), THEME_B);
    assert.equal(a.ast.frontmatter.title, "تسلسلي ١");
    assert.equal(b.ast.frontmatter.title, "تسلسلي ٢");
    assert.ok(a.pdf.toString("latin1").includes("BRAND_ALPHA_QUEUE"));
    assert.ok(b.pdf.toString("latin1").includes("BRAND_BETA_QUEUE"));
  });
});
