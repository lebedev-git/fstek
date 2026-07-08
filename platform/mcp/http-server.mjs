#!/usr/bin/env node
// HTTP-сервер MCP трекера ФСТЭК №117 (Streamable HTTP, stateful sessions + bearer-auth).
// Позволяет агенту Claude с ЛЮБОГО компьютера по сети менять статусы на сервере:
//   Claude ──HTTP+токен──► этот сервер → core.mjs → assessments.json → дашборд.
// Инструменты — общие (tools.mjs). Запись атомарна+сериализована в ядре.
import http from "http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { buildServer } from "./tools.mjs";

const TOKEN = process.env.MCP_TOKEN;
const PORT = Number(process.env.MCP_HTTP_PORT || 1338);
const HOST = process.env.MCP_HTTP_HOST || "0.0.0.0";

if (!TOKEN) {
  console.error("MCP_TOKEN не задан — HTTP-сервер не стартует (открытый эндпоинт записи без токена запрещён).");
  process.exit(1);
}

// Живые транспорты по mcp-session-id.
const transports = {};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8");
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}

const httpServer = http.createServer(async (req, res) => {
  const url = (req.url || "").split("?")[0];

  // Health-check без токена.
  if (req.method === "GET" && (url === "/" || url === "/health")) {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end("fstek-117 MCP HTTP: ok");
    return;
  }

  if (url !== "/mcp") {
    res.writeHead(404);
    res.end();
    return;
  }

  // Bearer-гейт на все /mcp запросы.
  if (req.headers["authorization"] !== `Bearer ${TOKEN}`) {
    res.writeHead(401, {
      "content-type": "application/json",
      "www-authenticate": 'Bearer error="invalid_token"',
    });
    res.end(JSON.stringify({ error: "invalid_token" }));
    return;
  }

  try {
    const sessionId = req.headers["mcp-session-id"];

    // GET (SSE-поток сервера) и DELETE (завершение сессии) — по существующей сессии.
    if (req.method === "GET" || req.method === "DELETE") {
      const t = sessionId && transports[sessionId];
      if (!t) {
        sendJson(res, 400, { jsonrpc: "2.0", error: { code: -32000, message: "Нет валидной сессии" }, id: null });
        return;
      }
      await t.handleRequest(req, res);
      return;
    }

    // POST — вызовы JSON-RPC.
    const body = await readBody(req);
    let transport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(body)) {
      // Новая сессия: свежий транспорт + сервер.
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports[sid] = transport;
        },
      });
      transport.onclose = () => {
        if (transport.sessionId) delete transports[transport.sessionId];
      };
      const server = buildServer();
      await server.connect(transport);
    } else {
      sendJson(res, 400, {
        jsonrpc: "2.0",
        error: { code: -32000, message: "Нет сессии: первый запрос должен быть initialize" },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, body);
  } catch (e) {
    if (!res.headersSent) sendJson(res, 500, { error: String(e?.message || e) });
  }
});

httpServer.listen(PORT, HOST, () => {
  console.error(`FSTEK-117 MCP HTTP слушает http://${HOST}:${PORT}/mcp (stateful, bearer-auth)`);
});
