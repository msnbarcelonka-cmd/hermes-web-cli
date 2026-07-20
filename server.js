import express from "express";
import { WebSocketServer } from "ws";
import { spawn as ptySpawn } from "node-pty";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const HERMES = process.env.HERMES_BIN || "hermes";
const HERMES_ARGS = process.env.HERMES_ARGS
  ? JSON.parse(process.env.HERMES_ARGS)
  : ["--tui"];

const RESIZE_RE = /\x1b\[RESIZE:(\d+);(\d+)\]/;
const RESIZE_RE_G = /\x1b\[RESIZE:(\d+);(\d+)\]/g;

const app = express();
app.get("/", (_req, res) =>
  res.type("html").send(readFileSync(join(__dirname, "index.html"))),
);

const server = app.listen(PORT, () =>
  console.log(`Hermes Web CLI → http://localhost:${PORT}`),
);

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  const term = ptySpawn(HERMES, HERMES_ARGS, {
    name: "xterm-256color",
    cols: 100,
    rows: 30,
    env: { ...process.env, TERM: "xterm-256color" },
  });

  term.onData((d) => {
    if (ws.readyState === 1) ws.send(d);
  });

  ws.on("message", (m) => {
    const data = m.toString();
    if (!RESIZE_RE.test(data)) {
      term.write(data);
      return;
    }
    // Extract resize commands, write any surrounding data
    let last = 0;
    for (const match of data.matchAll(RESIZE_RE_G)) {
      if (match.index > last) term.write(data.slice(last, match.index));
      const [, cols, rows] = match;
      try {
        term.resize(parseInt(cols, 10), parseInt(rows, 10));
      } catch {}
      last = match.index + match[0].length;
    }
    if (last < data.length) term.write(data.slice(last));
  });

  ws.on("close", () => term.kill());
  ws.on("error", () => term.kill());
});
