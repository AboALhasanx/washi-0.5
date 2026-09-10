/**
 * tests/mcp.test.mjs — REAL MCP protocol acceptance suite.
 *
 * Migrated from scripts/mcp-test.mjs. Spawns mcp/stdio.ts as a subprocess and
 * drives the whole lifecycle through a genuine MCP client over stdio —
 * no direct imports, so the protocol surface itself is what gets tested.
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { TSX, MCP_STDIO, sampleMarkdown, track, cleanupTracked, purge } from "./helpers.mjs";

const SAMPLE = sampleMarkdown();
const MCP_PREFIX = "فصل-mcp";

/** MCP text content → string */
const text = (res) => res.content?.[0]?.text ?? "";

/** MCP response → parsed JSON payload (tools emit "label\n\n{...}") */
const data = (res) => {
  const t = text(res);
  const i = t.indexOf("\n\n{");
  return i >= 0 ? JSON.parse(t.slice(i + 2)) : null;
};

describe("MCP protocol", () => {
  let client;
  let id;

  before(async () => {
    purge(MCP_PREFIX);
    const transport = new StdioClientTransport({
      command: "node",
      args: [TSX, MCP_STDIO],
      stderr: "inherit",
    });
    client = new Client({ name: "washi-acceptance", version: "1.0.0" });
    await client.connect(transport);
  });

  after(async () => {
    cleanupTracked();
    try {
      await client?.close();
    } catch {
      /* already closed */
    }
  });

  /* 1. discovery */
  test("14 tools are discovered", async () => {
    const tools = await client.listTools();
    assert.equal(tools.tools.length, 14, tools.tools.map((t) => t.name).join(","));
  });

  test("every tool exposes a safety annotation", async () => {
    const tools = await client.listTools();
    assert.ok(
      tools.tools.every(
        (t) => typeof t.annotations?.readOnlyHint === "boolean" || t.annotations?.destructiveHint === true
      )
    );
  });

  test("washi_delete is marked destructive", async () => {
    const tools = await client.listTools();
    assert.equal(tools.tools.find((t) => t.name === "washi_delete")?.annotations?.destructiveHint, true);
  });

  test("washi_trace is marked read-only", async () => {
    const tools = await client.listTools();
    assert.equal(tools.tools.find((t) => t.name === "washi_trace")?.annotations?.readOnlyHint, true);
  });

  /* 2. lifecycle over the protocol */
  test("washi_new creates a project", async () => {
    const res = await client.callTool({
      name: "washi_new",
      arguments: { title: "فصل MCP — اختبار بروتوكول", markdown: SAMPLE, subject: "computer-networks" },
    });
    assert.ok(!res.isError, text(res).slice(0, 200));
    id = track(data(res)?.project?.id);
    assert.ok(id, "no project id returned");
  });

  test("washi_show returns stats", async () => {
    const res = await client.callTool({ name: "washi_show", arguments: { id } });
    assert.ok(data(res)?.stats?.sections >= 4);
  });

  test("washi_content_get returns the manuscript", async () => {
    const res = await client.callTool({ name: "washi_content_get", arguments: { id } });
    assert.match(text(res), /# شبكات الحاسوب/);
  });

  test("washi_validate reports ok", async () => {
    const res = await client.callTool({ name: "washi_validate", arguments: { id } });
    assert.notEqual(res.isError, true);
    assert.equal(data(res)?.ok, true);
  });

  test("washi_render writes document.pdf", async () => {
    await client.callTool({ name: "washi_render", arguments: { id } });
    assert.ok(fs.existsSync(path.join("output", id, "document.pdf")));
  });

  test("washi_snapshot bumps currentVersion to 2", async () => {
    const res = await client.callTool({ name: "washi_snapshot", arguments: { id } });
    assert.equal(data(res)?.currentVersion, 2);
  });

  test("washi_publish freezes v1 with hashes", async () => {
    const res = await client.callTool({ name: "washi_publish", arguments: { id } });
    const d = data(res);
    assert.equal(d?.version, 1);
    assert.ok(d?.hashes?.contentSha256);
  });

  test("washi_verify passes on a fresh package", async () => {
    const res = await client.callTool({ name: "washi_verify", arguments: { id } });
    assert.notEqual(res.isError, true);
    assert.equal(data(res)?.results?.[0]?.status, "ok");
  });

  test("washi_trace reads the frozen publication", async () => {
    const res = await client.callTool({ name: "washi_trace", arguments: { id, version: 1 } });
    const d = data(res);
    assert.equal(d?.source, "publication v1");
    assert.ok(d.appContent.concepts.length > 0);
  });

  /* 3. agent-readable refusal */
  test("the frontmatter gate returns isError with a fix hint", async () => {
    const res = await client.callTool({
      name: "washi_new",
      arguments: { title: "رفض MCP", markdown: "## بلا frontmatter" },
    });
    assert.equal(res.isError, true);
    assert.match(text(res), /frontmatter/);
  });

  /* 4. not-found surfaces cleanly */
  test("not-found returns isError with an Arabic message", async () => {
    const res = await client.callTool({ name: "washi_show", arguments: { id: "لا-يوجد-xyz" } });
    assert.equal(res.isError, true);
    assert.match(text(res), /لا يوجد مشروع/);
  });

  /* 5. cleanup through the same protocol */
  test("washi_delete removes the project", async () => {
    const res = await client.callTool({ name: "washi_delete", arguments: { id } });
    assert.equal(data(res)?.deleted, true);
  });

  test("a deleted project is gone", async () => {
    const res = await client.callTool({ name: "washi_show", arguments: { id } });
    assert.equal(res.isError, true);
  });

  /* 6. input schema rejection */
  test("an empty id fails schema validation with isError", async () => {
    const res = await client.callTool({ name: "washi_show", arguments: { id: "" } });
    assert.equal(res.isError, true);
  });
});
