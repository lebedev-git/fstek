#!/usr/bin/env node
// MCP-сервер трекера ФСТЭК №117 (stdio).
// Локальный вариант: агент запускает этот процесс, тот пишет в src/data/assessments.json.
// Определения инструментов — общие, в tools.mjs (используются и HTTP-сервером).
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./tools.mjs";

async function main() {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("FSTEK-117 MCP tracker запущен (stdio)");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
