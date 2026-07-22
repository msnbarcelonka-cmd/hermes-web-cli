import express from "express";
import { WebSocketServer } from "ws";
import { spawn as ptySpawn } from "node-pty";
import { createServer } from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

import { createDirectory, listDirectories } from "./directory-browser.js";
import { createTerminalSessionManager } from "./terminal-session-manager.js";
import { createWorkspaceStore } from "./workspace-store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function errorStatus(error) {
  if (error instanceof RangeError) return 403;
  if (error?.code === "ENOENT") return 404;
  if (error instanceof TypeError) return 400;
  return 500;
}

function sendError(res, error, fallback) {
  const status = errorStatus(error);
  if (status === 500) console.error(fallback, error);
  res.status(status).json({ error: status === 500 ? fallback : error.message });
}

export function createMistServer({
  store,
  terminalSessions,
  browseRoot = "/root",
  distPath = join(__dirname, "dist"),
} = {}) {
  if (!store || !terminalSessions) throw new TypeError("Store and terminal sessions are required");

  const app = express();
  app.use(express.json({ limit: "4kb" }));

  app.get("/api/directories", async (req, res) => {
    if (typeof req.query.path !== "string") {
      res.status(400).json({ error: "An absolute directory path is required" });
      return;
    }
    try {
      res.json(await listDirectories(req.query.path, browseRoot));
    } catch (error) {
      sendError(res, error, "Unable to read directory");
    }
  });

  app.post("/api/directories", async (req, res) => {
    const { parent, name } = req.body ?? {};
    if (typeof parent !== "string" || typeof name !== "string") {
      res.status(400).json({ error: "Parent path and folder name are required" });
      return;
    }
    try {
      res.status(201).json({ path: await createDirectory(parent, name, browseRoot) });
    } catch (error) {
      if (error?.code === "EEXIST") {
        res.status(409).json({ error: "A folder with this name already exists" });
        return;
      }
      sendError(res, error, "Unable to create directory");
    }
  });

  app.get("/api/workspaces", async (_req, res) => {
    try {
      res.json(await store.listWorkspaces());
    } catch (error) {
      sendError(res, error, "Unable to list workspaces");
    }
  });

  app.post("/api/workspaces", async (req, res) => {
    let workspace;
    try {
      workspace = await store.createWorkspace(req.body);
      terminalSessions.ensureWorkspace(workspace);
      res.status(201).json(workspace);
    } catch (error) {
      if (workspace) {
        terminalSessions.stopWorkspace(workspace.id);
        await store.deleteWorkspace(workspace.id).catch(() => undefined);
      }
      sendError(res, error, "Unable to create workspace");
    }
  });

  app.delete("/api/workspaces/:id", async (req, res) => {
    try {
      if (!(await store.deleteWorkspace(req.params.id))) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }
      terminalSessions.stopWorkspace(req.params.id);
      res.status(204).end();
    } catch (error) {
      sendError(res, error, "Unable to delete workspace");
    }
  });

  app.use(express.static(distPath));

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  const terminalPath = /^\/ws\/workspaces\/([^/]+)\/terminals\/(\d+)$/;

  httpServer.on("upgrade", async (request, socket, head) => {
    const url = new URL(request.url, "http://localhost");
    const match = url.pathname.match(terminalPath);
    if (!match) {
      socket.destroy();
      return;
    }

    try {
      const workspace = await store.getWorkspace(decodeURIComponent(match[1]));
      const index = Number(match[2]);
      if (!workspace || !Number.isInteger(index) || index < 0 || index >= workspace.terminalCount) {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.destroy();
        return;
      }
      const validated = await store.validateWorkspace(workspace);
      wss.handleUpgrade(request, socket, head, (ws) => {
        terminalSessions.attach({ workspace: validated, index, ws });
      });
    } catch {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
    }
  });

  return {
    app,
    server: httpServer,
    listen(port, host) {
      return new Promise((resolveListen, reject) => {
        const onError = (error) => {
          httpServer.off("listening", onListening);
          reject(error);
        };
        const onListening = () => {
          httpServer.off("error", onError);
          resolveListen(httpServer);
        };
        httpServer.once("error", onError);
        httpServer.once("listening", onListening);
        httpServer.listen(port, host);
      });
    },
    close() {
      terminalSessions.stopAll();
      for (const client of wss.clients) client.terminate();
      return new Promise((resolveClose, reject) => {
        if (!httpServer.listening) {
          resolveClose();
          return;
        }
        httpServer.close((error) => (error ? reject(error) : resolveClose()));
      });
    },
  };
}

function parseAutostartLimit(value) {
  if (value === undefined || value === "") return Number.POSITIVE_INFINITY;
  const limit = Number(value);
  return Number.isInteger(limit) && limit >= 0 ? limit : Number.POSITIVE_INFINITY;
}

export async function startMistServer() {
  const port = Number(process.env.PORT || 3000);
  const browseRoot = process.env.MIST_BROWSE_ROOT || "/root";
  const databasePath = resolve(
    process.env.MIST_WORKSPACE_DB || join(__dirname, ".mist", "workspaces.db"),
  );
  const store = createWorkspaceStore({ databasePath, browseRoot });
  const terminalSessions = createTerminalSessionManager({
    spawn: ptySpawn,
    hermesBin: process.env.HERMES_BIN || "hermes",
    hermesArgs: process.env.HERMES_ARGS ? JSON.parse(process.env.HERMES_ARGS) : ["--tui"],
    detachTtlMs: Number(process.env.MIST_DETACH_TTL_MS || 15 * 60 * 1000),
    maxAutostartTerminals: parseAutostartLimit(process.env.MIST_MAX_AUTOSTART_TERMINALS),
  });
  const mist = createMistServer({ store, terminalSessions, browseRoot });

  if (process.env.MIST_AUTOSTART_WORKSPACES !== "0") {
    const autostartLimit = parseAutostartLimit(process.env.MIST_MAX_AUTOSTART_TERMINALS);
    let started = 0;
    for (const workspace of await store.listWorkspaces()) {
      try {
        const valid = await store.validateWorkspace(workspace);
        const remaining = autostartLimit - started;
        if (remaining <= 0) break;
        started += terminalSessions.ensureWorkspace(
          { ...valid, terminalCount: Math.min(valid.terminalCount, remaining) },
          { autostart: true },
        );
      } catch (error) {
        console.error(`Unable to autostart workspace ${workspace.name}:`, error.message);
      }
    }
    if (Number.isFinite(autostartLimit)) {
      console.log(`Mist autostart safety cap active; started ${started} terminal(s)`);
    }
  }

  await mist.listen(port);
  console.log(`Mist → http://localhost:${port}`);

  const shutdown = async () => {
    await mist.close();
    await store.close();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  return mist;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  startMistServer().catch((error) => {
    console.error("Mist failed to start:", error);
    process.exit(1);
  });
}
