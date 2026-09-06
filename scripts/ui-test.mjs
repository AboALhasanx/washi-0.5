/**
 * .uitest/ui-test.mjs — browser-level UI test suite for Washi 0.5
 * Drives the real running site (http://localhost:3000) with Playwright,
 * asserting visible state at every step and saving screenshots to .uitest/.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const BASE = "http://localhost:3000";
const SHOT = path.join(process.cwd(), ".uitest");
fs.mkdirSync(SHOT, { recursive: true });

const results = [];
const consoleErrors = [];
let page;

function ok(name, cond, detail = "") {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"} · ${name}${detail ? ` — ${detail}` : ""}`);
}

async function step(name, fn) {
  try {
    await fn();
  } catch (e) {
    results.push({ name, pass: false, detail: e.message });
    console.log(`FAIL · ${name} — THROWN: ${e.message.split("\n")[0]}`);
  }
}

const flashOk = () => page.locator("div.text-emerald-800");
const flashErr = () => page.locator("div.text-red-800");

/* 1×1 transparent PNG for the asset-upload test */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1500, height: 950 },
  deviceScaleFactor: 1.5,
});
page = await ctx.newPage();

/* clean leftovers from previous runs so project creation never collides.
 * node fs.rmSync silently no-ops on non-ASCII dir names under win32 —
 * shell rmdir is the reliable path. */
const removeProjectDir = (name) => {
  const abs = path.join(process.cwd(), "projects", name);
  try {
    if (fs.existsSync(abs)) execSync(`cmd /c rmdir /s /q "${abs}"`, { stdio: "ignore" });
  } catch {}
};
for (const leftover of ["فصل-شبكات-اختبار-ui", "اختبار-أعطال-هيكلية"]) removeProjectDir(leftover);
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
page.setDefaultTimeout(15000);

/* ════════════════════════ PART A — Studio (/) ════════════════════════ */

await step("A1 studio loads", async () => {
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('button:has-text("توليد PDF")');
  ok("A1 studio loads (title)", (await page.title()).includes("Washi Studio"));
});

await step("A2 generate disabled while empty", async () => {
  ok("A2 generate disabled when empty", await page.getByRole("button", { name: "توليد PDF ↓" }).isDisabled());
  await page.screenshot({ path: path.join(SHOT, "s01-studio-empty.png") });
});

await step("A3 paste sample into editor", async () => {
  await page.getByRole("button", { name: "تحرير", exact: true }).click();
  const sample = await (await fetch(BASE + "/samples/computer-networks-ch1.md")).text();
  await page.fill("#washi-md", sample);
  await page.waitForTimeout(300);
  const v = await page.inputValue("#washi-md");
  ok("A3 sample pasted (len>8k)", v.length > 8000, `len=${v.length}`);
});

await step("A4 insert-snippet rail works", async () => {
  await page.getByRole("button", { name: "إدراج", exact: true }).click();
  await page.getByRole("button", { name: /معادلة/ }).click();
  await page.waitForTimeout(200);
  const v = await page.inputValue("#washi-md");
  ok("A4 formula snippet inserted", v.includes("E = mc^2"));
});

await step("A4b sources rail lists manuscript sources", async () => {
  await page.getByRole("button", { name: "مصادر", exact: true }).click();
  await page.waitForTimeout(300);
  const rail = page.locator("aside").first();
  const t = await rail.innerText();
  ok("A4b source docs listed", t.includes("Computer Networks and Data Communication"), t.slice(0, 120).replace(/\n/g, " | "));
});

await step("A5 outline reorder moves a section", async () => {
  await page.getByRole("button", { name: "الهيكل", exact: true }).click();
  await page.waitForTimeout(200);
  const rows = page.locator("aside >> span.font-mono >> text=/^\\d+$/");
  const rowCount = await rows.count();
  ok("A5a outline lists sections", rowCount >= 6, `rows=${rowCount}`);
  const before = (await page.inputValue("#washi-md")).match(/^## (.+)$/gm) ?? [];
  await page.locator('button:text-is("↓")').first().click();
  await page.waitForTimeout(200);
  const after = (await page.inputValue("#washi-md")).match(/^## (.+)$/gm) ?? [];
  ok("A5b order changed after ↓", before.length === after.length && before[0] !== after[0],
    `before0="${before[0]}" after0="${after[0]}"`);
});

await step("A6 theme save + delete via UI", async () => {
  await page.getByRole("button", { name: "قوالب", exact: true }).click();
  await page.locator("aside").first().locator("input").fill("اختبار-واجهة");
  await page.getByRole("button", { name: "حفظ الثيم الحالي" }).click();
  await page.waitForTimeout(600);
  ok("A6a save confirmation", await page.locator("text=/حُفظ الثيم/").count() >= 1);
  ok("A6b theme in list", await page.locator('button:has-text("اختبار-واجهة")').count() === 1);
  await page.locator('button:has-text("اختبار-واجهة") span[title="حذف"]').click();
  await page.waitForTimeout(600);
  ok("A6c theme deleted", await page.locator('button:has-text("اختبار-واجهة")').count() === 0);
});

async function flashOkText() {
  const t = await flashOk().allTextContents();
  return t.join(" ");
}

await step("A7 live preview renders sample", async () => {
  await page.getByRole("button", { name: "معاينة حية", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector("main")?.innerText?.includes("مقدمة إلى شبكات الحاسوب"),
    { timeout: 30000 },
  );
  const t = await page.locator("main").innerText();
  ok("A7a shows chapter title", t.includes("مقدمة إلى شبكات الحاسوب"));
  ok("A7b shows section body", t.includes("بنية تحتية أساسية"));
  await page.screenshot({ path: path.join(SHOT, "s02-studio-live-preview.png") });
});

await step("A8 accent color patch", async () => {
  const accent = page.locator('input[type="color"]').nth(5);
  await accent.fill("#b91c1c");
  ok("A8 accent input reflects new color", (await accent.inputValue()) === "#b91c1c");
});

await step("A9 generate PDF in studio", async () => {
  await page.getByRole("button", { name: "توليد PDF ↓" }).click();
  await page.waitForSelector('iframe[title="PDF preview"]', { timeout: 180000 });
  ok("A9a pdf iframe shown", true);
  ok("A9b download link", await page.locator('a:has-text("تنزيل PDF")').count() === 1);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SHOT, "s03-studio-pdf.png") });
});

/* ════════════════════════ PART B — Projects flow ════════════════════════ */

await step("B1 projects list loads", async () => {
  await page.goto(BASE + "/projects", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('button:has-text("+ مشروع جديد")');
  ok("B1 projects page", true);
  await page.screenshot({ path: path.join(SHOT, "s04-projects-list.png") });
});

await step("B2 create project from comprehensive sample", async () => {
  await page.getByRole("button", { name: "+ مشروع جديد" }).first().click();
  await page.getByRole("button", { name: "إدراج النموذج الشامل (فصل كامل)" }).click();
  await page.waitForTimeout(600);
  const ta = page.locator("section textarea");
  const v = await ta.inputValue();
  ok("B2a sample filled into create form", v.length > 8000, `len=${v.length}`);
  await page.locator('input[placeholder*="عنوان المشروع"]').fill("فصل شبكات — اختبار UI");
  await page.getByRole("button", { name: "إنشاء المشروع" }).click();
  await page.waitForURL(/\/projects\/.+/, { timeout: 60000 });
  globalThis.projectUrl = page.url();
  globalThis.projectId = decodeURIComponent(page.url().split("/projects/")[1]);
  ok("B2b workspace opened", !!globalThis.projectId, globalThis.projectUrl);
});

await step("B3 structural validation passes", async () => {
  await page.getByRole("button", { name: "تحقق هيكلي" }).click();
  await page.waitForFunction(
    () => document.body.innerText.includes("صالح هيكلياً"),
    { timeout: 30000 },
  );
  ok("B3 validation flash green", true);
});

await step("B4 render PDF via workspace", async () => {
  await page.getByRole("button", { name: "رندر PDF" }).first().click();
  await page.waitForFunction(
    () => document.body.innerText.includes("تم الرندر عبر Takumi"),
    { timeout: 180000 },
  );
  ok("B4 render flash", true);
});

await step("B5 preview mode: native PDF", async () => {
  await page.getByRole("button", { name: "المعاينة", exact: true }).click();
  await page.getByRole("button", { name: /PDF مباشر/ }).click();
  await page.waitForTimeout(800);
  ok("B5 pdf object present", await page.locator("object").count() >= 1);
  await page.screenshot({ path: path.join(SHOT, "s05-preview-native-pdf.png") });
});

await step("B6 preview mode: pdf.js pages", async () => {
  await page.getByRole("button", { name: /صفحات pdf\.js/ }).click();
  await page.waitForFunction(
    () => document.querySelectorAll("img[src*='/pages/'], img[src*='page'], canvas").length >= 4,
    { timeout: 120000 },
  ).catch(() => {});
  const imgs = await page.locator("main img, main canvas").count();
  ok("B6 rasterized pages visible", imgs >= 4, `imgs/canvas=${imgs}`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SHOT, "s06-preview-pages.png") });
});

await step("B7 preview mode: live HTML mirror", async () => {
  await page.getByRole("button", { name: /HTML حي/ }).click();
  await page.waitForTimeout(800);
  const t = await page.locator("main").innerText();
  ok("B7 live mirror shows content", t.includes("مقدمة إلى شبكات الحاسوب") || t.includes("نظرة عامة"));
  await page.screenshot({ path: path.join(SHOT, "s07-preview-live.png") });
});

await step("B8 asset upload + insert reference", async () => {
  await page.getByRole("button", { name: "المحرر", exact: true }).click();
  await page.setInputFiles('input[type="file"]', {
    name: "ui-test-diagram.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  });
  await page.waitForFunction(() => document.body.innerText.includes("ui-test-diagram.png"), { timeout: 30000 });
  ok("B8a asset listed", true);
  await page.locator('button:has-text("إدراج")').first().click();
  await page.waitForTimeout(300);
  const md = await page.locator("textarea").first().inputValue();
  ok("B8b asset ref inserted", md.includes("ui-test-diagram.png"));
});

await step("B9 save + snapshot creates v2", async () => {
  const ta = page.locator("textarea").first();
  const md = await ta.inputValue();
  await ta.fill(md + "\n\n<!-- source: (generated) -->\nهذه فقرة اختبار واجهة أُضيفت آلياً.\n");
  await page.getByRole("button", { name: "حفظ + snapshot" }).click();
  await page.waitForFunction(() => document.body.innerText.includes("نسخة v2"), { timeout: 30000 });
  ok("B9 snapshot v2 flash", true);
});

await step("B10 restore v1 snapshot", async () => {
  await page.getByRole("button", { name: "النسخ والنشر" }).click();
  await page.waitForTimeout(400);
  await page.locator('button:has-text("استعادة")').first().click();
  await page.waitForFunction(() => document.body.innerText.includes("تمت الاستعادة"), { timeout: 30000 });
  ok("B10 restore flash", true);
});

await step("B11 publish package v1", async () => {
  await page.getByRole("button", { name: "نشر الحزمة" }).click();
  await page.waitForFunction(() => document.body.innerText.includes("نُشرت الحزمة"), { timeout: 60000 });
  ok("B11 publish flash", true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SHOT, "s08-history-packages.png") });
});

/* ════════════════════════ PART C — Trace screen ════════════════════════ */

await step("C1 trace screen loads", async () => {
  await page.getByRole("link", { name: "شاشة تتبع المنصة ↗" }).click();
  await page.waitForURL(/\/trace\//, { timeout: 20000 });
  await page.waitForFunction(() => document.body.innerText.includes("محاكاة المنصة"), { timeout: 30000 });
  ok("C1 trace renders", true);
  await page.screenshot({ path: path.join(SHOT, "s09-trace-top.png") });
});

await step("C2 provenance Admin/Debug toggle", async () => {
  const provBefore = await page.locator("text=/⌖/").count();
  await page.locator('label:has-text("Admin/Debug — provenance") input').uncheck();
  await page.waitForTimeout(300);
  const provAfterOff = await page.locator("text=/⌖/").count();
  await page.locator('label:has-text("Admin/Debug — provenance") input').check();
  await page.waitForTimeout(300);
  const provAfterOn = await page.locator("text=/⌖/").count();
  ok("C2 provenance toggles", provBefore > 0 && provAfterOff === 0 && provAfterOn > 0,
    `on=${provBefore} off=${provAfterOff} on2=${provAfterOn}`);
});

await step("C3 flashcard flips", async () => {
  const section = page.locator('section:has-text("بطاقات فلاش")');
  const card = section.locator("button").first();
  const before = await card.innerText();
  await card.click();
  await page.waitForTimeout(200);
  const after = await card.innerText();
  ok("C3 flip changed content", before !== after, `"${before.slice(0, 20)}" → "${after.slice(0, 20)}"`);
});

await step("C4 question → concept linking", async () => {
  const section = page.locator('section:has-text("اربط السؤال بالمفهوم")');
  const sel = section.locator("select").first();
  await sel.selectOption({ index: 1 });
  await page.waitForTimeout(200);
  ok("C4 link badge ✓", await section.locator("text=/✓/").count() >= 1);
  await page.screenshot({ path: path.join(SHOT, "s10-trace-simulation.png") });
});

/* ════════════════════════ PART D — Edge cases ════════════════════════ */

await step("D1 traversal id rejected by API", async () => {
  const status = await page.evaluate(() =>
    fetch("/api/projects/..%2Fetc-passwd").then((r) => r.status).catch(() => 0),
  );
  ok("D1 traversal blocked (4xx)", status >= 400 && status < 500, `status=${status}`);
});

await step("D2 trace of nonexistent project degrades gracefully", async () => {
  await page.goto(BASE + "/trace/does-not-exist-xyz", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const t = await page.locator("body").innerText();
  ok("D2 no crash, error surfaced", /خطأ|لا يوجد|فشل|not found|error/i.test(t), t.slice(0, 120).replace(/\n/g, " "));
});

await step("D3a import without frontmatter rejected with clear Arabic message", async () => {
  await page.goto(BASE + "/projects", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "+ مشروع جديد" }).first().click();
  await page.locator("section textarea").fill("## عنوان فقط\n\n$$\nE = mc\n");
  await page.getByRole("button", { name: "إنشاء المشروع" }).click();
  await page.waitForFunction(() => document.body.innerText.includes("استيراد مرفوض"), { timeout: 30000 });
  ok("D3a clear rejection message, no navigation", page.url().endsWith("/projects"));
});

await step("D3b broken body fails structural validation after import", async () => {
  await page.locator("section textarea").fill(
    "---\nsubject: ui-broken-test\ntitle: \"اختبار أعطال هيكلية\"\nlanguage: ar\nsources:\n  - document: Test.pdf\n    pages: [1]\n---\n\n## عنوان فقط\n\n$$\nE = mc\n",
  );
  await page.getByRole("button", { name: "إنشاء المشروع" }).click();
  await page.waitForURL(/\/projects\/.+/, { timeout: 60000 });
  await page.getByRole("button", { name: "تحقق هيكلي" }).click();
  await page.waitForFunction(() => document.body.innerText.includes("خطأ هيكلي"), { timeout: 30000 });
  ok("D3b red validation flash", true);
});

await step("D4 prompts library loads", async () => {
  await page.goto(BASE + "/prompts", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const t = await page.locator("body").innerText();
  ok("D4 prompts page renders", t.includes("Prompt") || t.includes("prompt") || t.includes("مكتبة"));
  await page.screenshot({ path: path.join(SHOT, "s11-prompts.png") });
});

/* ════════════════════════ Summary ════════════════════════ */

const passed = results.filter((r) => r.pass).length;
console.log(`\n════════ SUMMARY: ${passed}/${results.length} checks passed ════════`);
for (const r of results.filter((r) => !r.pass)) console.log(`  FAIL: ${r.name} — ${r.detail}`);
if (consoleErrors.length) {
  console.log(`\nConsole errors captured (${consoleErrors.length}):`);
  for (const e of consoleErrors.slice(0, 10)) console.log(`  • ${e}`);
} else {
  console.log("No browser console errors.");
}
fs.writeFileSync(path.join(SHOT, "results.json"), JSON.stringify({ results, consoleErrors }, null, 2));

/* cleanup: remove UI-test projects so the user's projects list stays clean
 * (suffixed variants included — createProject appends a collision suffix) */
await browser.close();
for (const d of fs.readdirSync(path.join(process.cwd(), "projects"))) {
  if (d.startsWith("فصل-شبكات-اختبار-ui") || d.startsWith("اختبار-أعطال-هيكلية")) removeProjectDir(d);
}
process.exit(passed === results.length ? 0 : 1);
