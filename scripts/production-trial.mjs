/**
 * scripts/production-trial.mjs — M3 freeze → M4 gate.
 * Runs real-ish content through the shared core and classifies outcomes.
 * Not a substitute for npm test; a product trial harness.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const TSX = path.join("node_modules", "tsx", "dist", "cli.mjs");
const CLI = "cli/washi.ts";
const ROOT_MAIN = path.resolve("..", "..");
const ROOT = process.cwd();

function washi(args, opts = {}) {
  return execFileSync("node", [TSX, CLI, ...args], {
    encoding: "utf8",
    input: opts.input,
    timeout: 300000,
    cwd: ROOT,
  });
}

function washiCode(args, opts = {}) {
  try {
    return { code: 0, out: washi(args, opts) };
  } catch (e) {
    return { code: e.status ?? -1, out: (e.stdout ?? "") + (e.stderr ?? "") };
  }
}

const findings = [];
function note(kind, severity, title, detail) {
  findings.push({ kind, severity, title, detail });
  console.log(`[${severity}/${kind}] ${title}`);
  if (detail) console.log("   ", String(detail).slice(0, 200));
}

/** Pull markdown from main worktree projects if present. */
function loadMainProjectContent(dirName) {
  const p = path.join(ROOT_MAIN, "projects", dirName, "content.md");
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
}

const SOURCES = [];

// 1) Committed sample chapter (long, real-ish software engineering)
const samplePath = path.join("samples", "software-engineering", "chapter-09.md");
if (fs.existsSync(samplePath)) {
  SOURCES.push({
    id: "trial-chapter09",
    label: "chapter-09 software-engineering (committed sample)",
    markdown: fs.readFileSync(samplePath, "utf8"),
    origin: "samples/",
  });
}

// 2) Public sample
const pubSample = path.join("public", "samples", "computer-networks-ch1.md");
if (fs.existsSync(pubSample)) {
  SOURCES.push({
    id: "trial-networks",
    label: "computer-networks-ch1 (public sample)",
    markdown: fs.readFileSync(pubSample, "utf8"),
    origin: "public/samples/",
  });
}

// 3) Real project manuscripts from main worktree
for (const dir of [
  "تطور-البرمجيات-الفصل-التاسع",
  "شبكات-الحاسوب-الفصل-الأول",
  "فصل-إجهاد-أكواد",
  "فصل-إجهاد-معادلات",
  "فصل-إجهاد-خليط",
]) {
  const md = loadMainProjectContent(dir);
  if (md) {
    SOURCES.push({
      id: `trial-${Buffer.from(dir).toString("hex").slice(0, 12)}`,
      label: dir,
      markdown: md,
      origin: `main:projects/${dir}`,
    });
  } else {
    note("ops", "info", `skip ${dir}`, "content.md not found on main worktree");
  }
}

if (SOURCES.length === 0) {
  console.error("No sources found");
  process.exit(1);
}

console.log(`Production Trial — ${SOURCES.length} source(s)\n`);

for (const src of SOURCES) {
  console.log("\n=== ", src.label, " ===");
  console.log("bytes:", src.markdown.length, "origin:", src.origin);

  // frontmatter / structure quick stats
  const headings = (src.markdown.match(/^##\s+/gm) || []).length;
  const formulas = (src.markdown.match(/\$\$/g) || []).length / 2;
  const tables = (src.markdown.match(/^\|/gm) || []).length;
  const defs = (src.markdown.match(/definition/gi) || []).length;
  console.log({ headings, formulas: Math.floor(formulas), tableLines: tables, defMentions: defs });

  const tmpDir = path.join("output", "trial-src");
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `${src.id}.md`);
  fs.writeFileSync(tmpFile, src.markdown, "utf8");

  const create = washiCode(["new", src.label, "--file", tmpFile, "--json"]);
  if (create.code !== 0) {
    note("schema", "critical", `create failed: ${src.label}`, create.out);
    continue;
  }
  let meta;
  try {
    const parsed = JSON.parse(create.out);
    meta = parsed.project ?? parsed;
  } catch {
    note("schema", "critical", `create JSON parse failed: ${src.label}`, create.out.slice(0, 300));
    continue;
  }
  const id = meta.id;
  console.log("created id:", id);

  const validate = washiCode(["validate", id, "--json"]);
  if (validate.code !== 0) {
    note("schema", "warn", `validate non-zero: ${id}`, validate.out.slice(0, 300));
  } else {
    try {
      const v = JSON.parse(validate.out);
      if (v.errors > 0) note("schema", "warn", `validate errors: ${id}`, JSON.stringify(v).slice(0, 300));
      if (v.warnings > 0) note("editor", "info", `validate warnings: ${id}`, `warnings=${v.warnings}`);
    } catch {
      /* keep raw */
    }
  }

  const render = washiCode(["render", id, "--json"]);
  if (render.code !== 0) {
    note("render", "critical", `render failed: ${id}`, render.out.slice(0, 400));
  } else {
    try {
      const r = JSON.parse(render.out);
      const pdfPath = r.pdfPath ?? r.pdf ?? null;
      console.log("render ok", r.ms ?? "?", "ms", pdfPath ?? "");
      if (pdfPath && fs.existsSync(pdfPath)) {
        const st = fs.statSync(pdfPath);
        if (st.size < 2000) note("render", "warn", `tiny PDF: ${id}`, `size=${st.size}`);
      } else if (r.dir) {
        const p = path.join(r.dir, "document.pdf");
        if (fs.existsSync(p) && fs.statSync(p).size < 2000) {
          note("render", "warn", `tiny PDF: ${id}`, `size=${fs.statSync(p).size}`);
        }
      }
    } catch {
      console.log("render out:", render.out.slice(0, 200));
    }
  }

  const snap = washiCode(["snapshot", id, "--json"]);
  if (snap.code !== 0) note("lifecycle", "warn", `snapshot failed: ${id}`, snap.out.slice(0, 200));

  const pub = washiCode(["publish", id, "--json"]);
  if (pub.code !== 0) {
    note("publication", "critical", `publish failed: ${id}`, pub.out.slice(0, 400));
  } else {
    const verify = washiCode(["verify", id, "--json"]);
    if (verify.code !== 0) {
      note("publication", "critical", `verify failed after publish: ${id}`, verify.out.slice(0, 400));
    } else {
      try {
        const v = JSON.parse(verify.out);
        const statuses = (v.results ?? [v]).map((r) => r.status);
        if (!statuses.every((s) => s === "ok")) {
          note("publication", "critical", `verify status ${statuses.join(",")}: ${id}`, JSON.stringify(v).slice(0, 300));
        }
      } catch {
        note("publication", "warn", `verify JSON parse: ${id}`, verify.out.slice(0, 200));
      }
    }
  }

  const trace = washiCode(["trace", id, "--json"]);
  if (trace.code !== 0) {
    note("editor", "warn", `trace failed: ${id}`, trace.out.slice(0, 300));
  } else {
    try {
      const t = JSON.parse(trace.out);
      const ac = t.appContent ?? t;
      const concepts = ac.concepts?.length ?? 0;
      const flash = ac.flashcards?.length ?? 0;
      const qs = ac.questionCandidates?.length ?? 0;
      console.log("trace:", { concepts, flashcards: flash, questions: qs });
      if (concepts === 0) note("editor", "info", `no concepts extracted: ${id}`, "review sections / definitions may be thin");
    } catch {
      /* */
    }
  }
}

// Ops: trash pile on main (not this worktree)
const mainProjects = path.join(ROOT_MAIN, "projects");
if (fs.existsSync(mainProjects)) {
  const trash = fs.readdirSync(mainProjects).filter((d) => d.startsWith(".trash-"));
  if (trash.length > 5) {
    note(
      "lifecycle",
      "warn",
      `${trash.length} .trash-* husks on main projects/`,
      "Windows deleteProject residue — M4.5 / ops cleanup"
    );
  }
}

console.log("\n\n===== FINDINGS =====");
const bySev = { critical: 0, warn: 0, info: 0 };
for (const f of findings) bySev[f.severity] = (bySev[f.severity] ?? 0) + 1;
console.log(bySev);
for (const f of findings) {
  console.log(`- [${f.severity}][${f.kind}] ${f.title}`);
}

fs.mkdirSync(path.join("docs", "compose"), { recursive: true });
fs.writeFileSync(
  path.join("docs", "compose", "production-trial-findings.json"),
  JSON.stringify({ at: new Date().toISOString(), sources: SOURCES.map((s) => s.label), findings }, null, 2),
  "utf8"
);
console.log("\nWrote docs/compose/production-trial-findings.json");
process.exit(bySev.critical > 0 ? 1 : 0);
