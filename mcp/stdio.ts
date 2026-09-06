/**
 * mcp/stdio.ts — stdio entry for the Washi MCP server.
 * MCP hosts (ZCode, Claude Desktop, Cursor…) spawn this process and talk
 * JSON-RPC over stdin/stdout:
 *   npx tsx mcp/stdio.ts
 */

import { createServer } from "./server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = createServer();
await server.connect(new StdioServerTransport());
