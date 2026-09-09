# Washi × AI Agents — Three-Tier Integration Guide

> **Target**: Enable any autonomous agent (Claude Desktop, Cursor, ZCode, LangChain, CLI scripts) to **author, validate, publish, and ingest educational packages** without browser interaction.

---

## The Three-Tier Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Tier 1: CLI (`cli/`)                                                        │
│   Lowest denominator invocation target for shell execution & CI pipelines. │
├─────────────────────────────────────────────────────────────────────────────┤
│ Tier 2: Skill (`.agents/skills/washi/SKILL.md`)                             │
│   Knowledge context informing the agent of content contracts & workflows.  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Tier 3: Model Context Protocol (`mcp/stdio.ts`)                             │
│   14 typed tools with runtime Zod schemas and safety annotations.          │
├─────────────────────────────────────────────────────────────────────────────┤
│ UNIFIED CORE (`lib/*`)                                                      │
│   Same atomic publication, same cryptographic hashing, same AST engine.     │
└─────────────────────────────────────────────────────────────────────────────┘
```

The layers do not compete:
- **Skill** provides the **intelligence**: when to use Washi, required frontmatter structure, and safe publishing workflows.
- **MCP** provides the **typed execution**: structured tools with argument validation and self-correcting error hints.
- **CLI** provides the **headless fallback**: universal invocation via standard shell commands.

---

## MCP Server Setup

The MCP server runs over Stdio transport via `npm run washi:mcp` (or `tsx mcp/stdio.ts`).

### Host Configuration

#### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "washi": {
      "command": "npx",
      "args": ["tsx", "mcp/stdio.ts"],
      "cwd": "C:\\path\\to\\washi-0.5"
    }
  }
}
```

#### Cursor / ZCode
Add as an MCP server with `command: "npx"`, `args: ["tsx", "mcp/stdio.ts"]`, and working directory pointed to the repository root.

---

## Tool Catalog & Safety Annotations

Washi registers 14 tools under the `washi_` namespace.

| Tool | Purpose | Schema Summary | Safety Annotations |
|---|---|---|---|
| `washi_list` | Enumerate all projects on disk | `{}` | `readOnly: true`, `openWorld: false` |
| `washi_show` | Project metadata & parser statistics | `{ id: string }` | `readOnly: true`, `openWorld: false` |
| `washi_content_get` | Read manuscript text (Read before editing) | `{ id: string }` | `readOnly: true`, `openWorld: false` |
| `washi_content_set` | Update manuscript draft (runs parser gate) | `{ id: string, markdown: string }` | `readOnly: false`, `openWorld: false` |
| `washi_validate` | Run structural validation report | `{ id: string }` | `readOnly: true`, `openWorld: false` |
| `washi_render` | Compile preview PDF and AST artifacts | `{ id: string, out?: string }` | `readOnly: false`, `openWorld: false` |
| `washi_snapshot` | Create version snapshot checkpoint | `{ id: string }` | `readOnly: false`, `openWorld: false` |
| `washi_restore` | Revert to a previous snapshot | `{ id: string, version: number }` | `readOnly: false`, `openWorld: false` |
| `washi_publish` | **Freeze immutable publication package** | `{ id: string }` | `readOnly: false`, `openWorld: false` |
| `washi_packages` | List frozen publication packages & hashes | `{ id: string }` | `readOnly: true`, `openWorld: false` |
| `washi_verify` | Audit SHA-256 integrity of frozen packages | `{ id: string }` | `readOnly: true`, `openWorld: false` |
| `washi_trace` | Extract consumer read model (AST + concepts) | `{ id: string, version?: number }` | `readOnly: true`, `openWorld: false` |
| `washi_new` | Ingest complete manuscript draft | `{ title: string, markdown: string, subject?: string, language?: string }` | `readOnly: false`, `openWorld: false` |
| `washi_delete` | **Permanently delete project and packages** | `{ id: string }` | `destructive: true`, `openWorld: false` |

### Safety Invariants
1. **`readOnlyHint: true`**: Guaranteed non-mutating operations.
2. **`destructiveHint: true`**: Only assigned to `washi_delete`. Agents are advised to confirm with users before invoking.
3. **`openWorldHint: false`**: Universal invariant; all operations operate strictly on local disk state.
4. **Permanent Append-Only**: `washi_publish` declares that publishing is permanent and sealed.

---

## Error Handling & Self-Correction

Errors returned by MCP tools set `isError: true` and include human-readable guidance:
- **Gate Refusal**: `«Import rejected — missing frontmatter: subject, title, language, sources»`
- **Validation Failure**: `«1 structural error — line 12: unbalanced $$ math delimiters»`
- **Not Found**: `«No project found with identifier: xyz»`

Agents inspect the error text and can self-correct in the subsequent turn without guessing.

---

## Agent Skill (`.agents/skills/washi/SKILL.md`)

The agent skill instructs the model on:
- **Triggers**: Recognizing requests like "author a chapter", "prepare study notes", "extract concepts", or "verify publication".
- **The Content Contract**: Mandatory frontmatter, math formatting, blockquote callouts, and question candidates.
- **Workflow Order**:
  ```text
  1. Author Markdown following the Content Contract.
  2. Ingest via washi_new.
  3. Validate via washi_validate -> fix any reported issues via washi_content_set.
  4. Preview via washi_render.
  5. Confirm with the user -> washi_publish (permanent freeze).
  6. Ingest into platform via washi_trace.
  ```

---

## Protocol Verification Suite

Run the end-to-end MCP protocol suite:

```bash
node scripts/mcp-test.mjs
```

This starts `mcp/stdio.ts` as a subprocess, connects a real MCP client over stdio, verifies tool discovery and annotations, exercises the entire authoring and publishing lifecycle, audits packages, and confirms schema validation rejections.
