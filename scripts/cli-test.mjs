/**
 * scripts/cli-test.mjs — acceptance test for the Washi CLI.
 * Spawns the CLI as a real process (npx tsx cli/washi.ts) and asserts on
 * exit codes + JSON output, mirroring docs/cli/design.md §10.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/* Spawn the tsx runner directly via node (no shell, no npm arg-mangling —
 * Arabic args and em-dashes pass through as clean argv). */
const TSX = path.join("node_modules", "tsx", "dist", "cli.mjs");
const WASHI = (args, opts = {}) =>
  execFileSync("node", [TSX, "cli/washi.ts", ...args], {
    encoding: "utf8",
    input: opts.input ?? undefined,
    timeout: 300000,
  });
const WASHI_CODE = (args, opts = {}) => {
  try {
    const out = WASHI(args, opts);
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? -1, out: (e.stdout ?? "") + (e.stderr ?? "") };
  }
};

const json = (s) => JSON.parse(s);
const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}${cond ? "" : ` — ${detail}`}`);
};

const sample = fs.readFileSync("public/samples/computer-networks-ch1.md", "utf8");
const brokenBody =
  '---\nsubject: cli-broken\ntitle: "فاصل اختبار CLI"\nlanguage: ar\nsources:\n  - document: T.pdf\n    pages: [1]\n---\n\n## عنوان\n\n$$\nE = mc\n';

/* 1. version + usage */
check("-V prints CLI version (exit 0)", WASHI_CODE(["-V"]).code === 0);
check("unknown command exits 3", WASHI_CODE(["no-such-command"]).code === 3);

/* 2. new: frontmatter gate refuses garbage with exit 1 */
const refused = WASHI_CODE(["new", "فاشل CLI"], { input: "## بلا frontmatter" });
check("new without frontmatter exits 1 (friendly refusal)", refused.code === 1 && refused.out.includes("frontmatter"), `code=${refused.code}`);

/* 3. new from stdin (the AI handoff) */
const created = WASHI_CODE(["new", "فصل شبكات — اختبار CLI", "--subject", "computer-networks", "--json"], { input: sample });
check("new from stdin exits 0", created.code === 0, `code=${created.code} out=${created.out.slice(0, 100)}`);
const id = json(created.out).project.id;
check("derived id is the Arabic slug", id.startsWith("فصل-شبكات-اختبار-cli") || id.startsWith("فصل-شبكات-ا"), id);

/* 4. list + show --json */
const listJson = json(WASHI(["list", "--json"]));
check("list --json contains the new project", (listJson.projects ?? []).some((p) => p.id === id));
const showJson = json(WASHI(["show", id, "--json"]));
check("show --json reports stats", showJson.stats?.sections >= 4);

/* 5. broken body fails validation with exit 1 */
fs.writeFileSync(path.join(".uitest", "cli-broken.md"), brokenBody);
const b2 = WASHI_CODE(["new", "فاصل اختبار CLI", "--file", path.join(".uitest", "cli-broken.md"), "--json"]);
check("broken-body project created", b2.code === 0, (b2.out + b2.out).slice(0, 120));
const brokenId = json(b2.out).project.id;
const vBroken = WASHI_CODE(["validate", brokenId]);
check("validate broken body exits 1", vBroken.code === 1 && /خطأ/.test(vBroken.out + vBroken.out), `code=${vBroken.code}`);
WASHI(["delete", brokenId, "--yes"]);

/* 6. render writes artifacts */
WASHI(["render", id]);
check("render wrote document.pdf", fs.existsSync(path.join("output", id, "document.pdf")));

/* 7. snapshot + restore */
const v2 = json(WASHI(["snapshot", id, "--json"]));
check("snapshot bumps to v2", v2.currentVersion === 2, `got ${v2.currentVersion}`);
const restored = json(WASHI(["restore", id, "1", "--json"]));
check("restore v1 creates v3", restored.currentVersion === 3, `got ${restored.currentVersion}`);

/* 8. publish → package → verify → tamper → detect → undo */
const pub = json(WASHI(["publish", id, "--yes", "--json"]));
check("publish freezes v1", pub.version === 1 && !!pub.manifest?.hashes?.contentSha256);

const ver = WASHI_CODE(["verify", id, "--version", "1", "--json"]);
check("verify fresh package exits 0", ver.code === 0 && json(ver.out).results[0].status === "ok", ver.out.slice(0, 120));

// tamper with the FROZEN package bytes
const pubFile = path.join("projects", id, "publications", "v1", "content.md");
const original = fs.readFileSync(pubFile, "utf8");
fs.writeFileSync(pubFile, original + "\n<!-- TAMPERED -->\n");
const tampered = WASHI_CODE(["verify", id, "--version", "1"]);
check("verify detects tampering (exit 1)", tampered.code === 1 && tampered.out.includes("مخالفة"), `code=${tampered.code}`);
fs.writeFileSync(pubFile, original); // undo
check("verify passes after restore", WASHI_CODE(["verify", id, "--version", "1"]).code === 0);

/* 9. trace --json is the platform contract */
const trace = json(WASHI(["trace", id, "--version", "1", "--json"]));
check("trace --json has concepts + flashcards", (trace.appContent?.concepts?.length ?? 0) > 0 && (trace.appContent?.flashcards?.length ?? 0) > 0);
check("trace from publication carries source marker", trace.source === "publication v1");

/* 10. not found → exit 2 */
check("show nonexistent exits 2", WASHI_CODE(["show", "لا-يوجد-مطلقاً-xyz"]).code === 2);

/* 11. delete requires consent */
const noConsent = WASHI_CODE(["delete", id]);
check("delete without --yes refuses (exit 1) in non-TTY", noConsent.code === 1, `code=${noConsent.code}`);
const del = WASHI_CODE(["delete", id, "--yes"]);
check("delete --yes exits 0", del.code === 0, del.out.slice(0, 100));
check("deleted project gone from list", !json(WASHI(["list", "--json"])).projects.some((p) => p.id === id));

/* cleanup: the demo project created by `washi demo` earlier in the run */
const demoId = "عرض-cli-فصل-شبكات-كامل";
if (fs.existsSync(path.join("projects", demoId))) {
  WASHI(["delete", demoId, "--yes"]);
}

const passed = results.filter((r) => r.pass).length;
console.log(`\n═══ CLI: ${passed}/${results.length} passed ═══`);
process.exit(passed === results.length ? 0 : 1);
