/**
 * tests/cgp-chapter-authoring.test.mjs — CGP-4 chapter authoring validation.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const { parseMarkdown } = await import("../lib/markdown-parser.ts");
const { parseChapterPlan } = await import("../lib/cgp/chapter-plan-schemas.ts");

const CHAPTER = path.join("content", "cgp", "computer-networks-ch1.chapter.md");
const PLAN = path.join("content", "cgp", "computer-networks-ch1.chapter-plan.json");

function loadChapter() {
  return fs.readFileSync(CHAPTER, "utf8");
}

describe("CGP-4 authored chapter", () => {
  test("chapter exists and parseMarkdown succeeds", () => {
    assert.ok(fs.existsSync(CHAPTER));
    const md = loadChapter();
    const { ast } = parseMarkdown(md);
    assert.ok(ast.sections.length >= 10, `sections=${ast.sections.length}`);
    const nodes = ast.sections.flatMap((s) => s.nodes);
    assert.ok(nodes.length > 80, `nodes=${nodes.length}`);
  });

  test("formulas: display present, inline present, no Shannon/SNR/T=L/B", () => {
    const { ast } = parseMarkdown(loadChapter());
    const formulas = ast.sections.flatMap((s) => s.nodes.filter((n) => n.type === "formula"));
    const display = formulas.filter((f) => f.displayMode === true);
    const inline = formulas.filter((f) => f.displayMode === false);
    assert.ok(display.length >= 3, `display=${display.length}`);
    assert.ok(inline.length >= 3, `inline=${inline.length}`);
    const lat = formulas.map((f) => f.latex).join(" ");
    assert.ok(/n\s*\(\s*n/.test(lat) || /n\(n/i.test(lat.replace(/\s/g, "")), "mesh links");
    assert.ok(/2\^\{?bits\}?|2\^\{/.test(lat) || lat.includes("2^{bits}"), "color bits");
    assert.ok(!/shannon/i.test(lat), "no Shannon");
    assert.ok(!/log_2\(1 \+ S/i.test(lat), "no Shannon S/N form");
    assert.ok(!/SNR_\{?dB/i.test(lat), "no SNR");
  });

  test("must-preserve guards appear in chapter text", () => {
    const md = loadChapter().toLowerCase();
    const checks = [
      ["five components", ["الرسالة", "المُرسِل", "المُستقبِل", "الوسيط", "البروتوكول"]],
      ["effectiveness", ["التسليم", "الدقة", "التوقيت", "التموج"]],
      ["flow three", ["أحادي", "شبه ثنائي", "ثنائي الاتجاه كامل"]],
      ["topologies", ["كاملة", "نجمية", "ناقلية", "حلقية"]],
      ["throughput delay", ["الإنتاجية", "التأخير"]],
      ["internet history", ["1969", "tcp", "ip"]],
      ["protocol triad", ["البنية", "المعنى", "التوقيت"]],
      ["standards", ["de facto", "de jure", "rfc"]],
      ["internetwork scenario", ["internetwork", "هاتف"]],
    ];
    for (const [label, needles] of checks) {
      for (const n of needles) {
        assert.ok(md.includes(n.toLowerCase()), `${label}: missing ${n}`);
      }
    }
  });

  test("source comments use available document and valid pages 1–23", () => {
    const md = loadChapter();
    const comments = [...md.matchAll(/<!--\s*source:\s*([^>]+?)\s*-->/g)].map((m) => m[1]);
    assert.ok(comments.length >= 8, `source comments=${comments.length}`);
    for (const c of comments) {
      assert.match(c, /مقدمة\.pdf|Computer Networks/i);
      const pm = c.match(/p\.?\s*(\d+)/i);
      if (pm) {
        const p = Number(pm[1]);
        assert.ok(p >= 1 && p <= 23, `bad page in ${c}`);
      }
    }
    assert.ok(!/Computer Networks and Data Communication/i.test(md), "no claimed textbook");
    assert.ok(!/Data Communications Lecture Notes/i.test(md), "no claimed lecture notes");
  });

  test("core sections from chapter plan are present as headings", () => {
    const md = loadChapter();
    const plan = parseChapterPlan(JSON.parse(fs.readFileSync(PLAN, "utf8")));
    const headings = [...md.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
    assert.ok(headings.length >= 10, `h2=${headings.length}`);
    // Must-preserve topical coverage via distinctive Arabic/English tokens
    const topicTokens = {
      "section-data-communication": "الاتصال البياناتي",
      "section-data-representation": "تمثُّل البيانات",
      "section-data-flow": "تدفق البيانات",
      "section-networks-criteria": "معاييرها",
      "section-physical-structures": "الطوبولوجيا",
      "section-network-categories": "فئات الشبكات",
      "section-internetwork": "الترابط بين الشبكات",
      "section-internet": "## الإنترنت",
      "section-protocols": "البروتوكولات",
      "section-standards": "المعايير",
      "section-integrated-review": "مراجعة",
    };
    for (const [id, token] of Object.entries(topicTokens)) {
      assert.ok(md.includes(token), `${id} token ${token}`);
    }
    assert.ok(plan.qualityChecks.allMustPreserveAssigned);
  });

  test("mesh six-device worked example present", () => {
    const md = loadChapter();
    assert.ok(md.includes("ستة أجهزة") || md.includes("6"));
    assert.ok(md.includes("15"));
    assert.ok(md.includes("5") && md.includes("منفذ"));
  });

  test("chapter is substantially richer than old sample node count", async () => {
    const sample = fs.readFileSync("public/samples/computer-networks-ch1.md", "utf8");
    const chapter = loadChapter();
    const oldAst = parseMarkdown(sample).ast;
    const newAst = parseMarkdown(chapter).ast;
    const oldN = oldAst.nodes.length;
    const newN = newAst.nodes.length;
    const oldF = oldAst.nodes.filter((n) => n.type === "formula").length;
    const newF = newAst.nodes.filter((n) => n.type === "formula").length;
    const oldH = oldAst.nodes.filter((n) => n.type === "heading").length;
    const newH = newAst.nodes.filter((n) => n.type === "heading").length;
    assert.ok(newN > oldN, `nodes ${newN} vs ${oldN}`);
    assert.ok(newH >= oldH, `headings ${newH} vs ${oldH}`);
    // New chapter should teach mesh formulas (display) in addition to inline symbols
    assert.ok(newF >= 4, `formulas ${newF}`);
  });

  test("callouts and lists parse cleanly", () => {
    const { ast } = parseMarkdown(loadChapter());
    const nodes = ast.sections.flatMap((s) => s.nodes);
    const callouts = nodes.filter((n) => n.type === "callout" || n.type === "definition");
    const lists = nodes.filter((n) => n.type === "list");
    const tables = nodes.filter((n) => n.type === "table");
    assert.ok(callouts.length >= 6, `callouts=${callouts.length}`);
    assert.ok(lists.length >= 6, `lists=${lists.length}`);
    assert.ok(tables.length >= 3, `tables=${tables.length}`);
  });
});
