/**
 * scripts/mcp-test.mjs — REAL MCP protocol acceptance test.
 * Spawns mcp/stdio.ts as a subprocess, connects a genuine MCP client over
 * stdio, discovers tools, and drives the full lifecycle through the protocol.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond });
  console.log(`${cond ? "✓" : "✗"} ${name}${cond ? "" : ` — ${detail}`}`);
};
const text = (res) => res.content?.[0]?.text ?? "";
const data = (res) => {
  const t = text(res);
  const i = t.indexOf("\n\n{");
  return i >= 0 ? JSON.parse(t.slice(i + 2)) : null;
};

const sample = fs.readFileSync("public/samples/computer-networks-ch1.md", "utf8");
const TSX = path.join("node_modules", "tsx", "dist", "cli.mjs");

const transport = new StdioClientTransport({
  command: "node",
  args: [TSX, "mcp/stdio.ts"],
  stderr: "inherit",
});
const client = new Client({ name: "washi-acceptance", version: "1.0.0" });
await client.connect(transport);

/* 1. discovery */
const tools = await client.listTools();
const names = tools.tools.map((t) => t.name);
check("14 tools discovered", names.length === 14, names.join(","));
check("annotations expose safety model",
  names.length > 0 &&
  tools.tools.every((t) => typeof t.annotations?.readOnlyHint === "boolean" || t.annotations?.destructiveHint === true),
);
check("washi_delete marked destructive", tools.tools.find((t) => t.name === "washi_delete")?.annotations?.destructiveHint === true);
check("washi_trace marked read-only", tools.tools.find((t) => t.name === "washi_trace")?.annotations?.readOnlyHint === true);

/* 2. lifecycle over the protocol */
const created = await client.callTool({ name: "washi_new", arguments: { title: "فصل MCP — اختبار بروتوكول", markdown: sample, subject: "computer-networks" } });
check("washi_new creates project", !created.isError, text(created).slice(0, 120));
const id = data(created)?.project?.id;

const shown = await client.callTool({ name: "washi_show", arguments: { id } });
check("washi_show returns stats", data(shown)?.stats?.sections >= 4);

const read = await client.callTool({ name: "washi_content_get", arguments: { id } });
check("washi_content_get returns manuscript", read.content?.[0]?.text.includes("# شبكات الحاسوب") === true);

const validated = await client.callTool({ name: "washi_validate", arguments: { id } });
check("washi_validate ok", validated.isError !== true && data(validated)?.ok === true);

const rendered = await client.callTool({ name: "washi_render", arguments: { id } });
check("washi_render writes pdf", fs.existsSync(path.join("output", id, "document.pdf")), text(rendered).slice(0, 100));

const snap = await client.callTool({ name: "washi_snapshot", arguments: { id } });
check("washi_snapshot bumps version", data(snap)?.currentVersion === 2);

const pub = await client.callTool({ name: "washi_publish", arguments: { id } });
check("washi_publish freezes v1", data(pub)?.version === 1 && !!data(pub)?.hashes?.contentSha256, text(pub).slice(0, 120));

const verified = await client.callTool({ name: "washi_verify", arguments: { id } });
check("washi_verify passes fresh package", verified.isError !== true && data(verified)?.results?.[0]?.status === "ok", text(verified).slice(0, 120));

const traced = await client.callTool({ name: "washi_trace", arguments: { id, version: 1 } });
const traceData = data(traced);
check("washi_trace reads frozen publication", traceData?.source === "publication v1" && traceData.appContent.concepts.length > 0);

/* 3. agent-readable refusal */
const bad = await client.callTool({
  name: "washi_new",
  arguments: { title: "رفض MCP", markdown: "## بلا frontmatter" },
});
check("gate refusal returns isError with fix hint", bad.isError === true && text(bad).includes("frontmatter"));

/* 4. not-found surfaces cleanly */
const missing = await client.callTool({ name: "washi_show", arguments: { id: "لا-يوجد-xyz" } });
check("not-found returns isError", missing.isError === true && text(missing).includes("لا يوجد مشروع"));

/* 5. cleanup via the same protocol */
const del = await client.callTool({ name: "washi_delete", arguments: { id } });
check("washi_delete removes project", data(del)?.deleted === true);

const gone = await client.callTool({ name: "washi_show", arguments: { id } });
check("deleted project is gone", gone.isError === true);

await client.close();

const passed = results.filter((r) => r.pass).length;
console.log(`\n═══ MCP: ${passed}/${results.length} passed ═══`);
process.exit(passed === results.length ? 0 : 1);
