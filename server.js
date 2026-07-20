import express from "express";
import { WebSocketServer } from "ws";
import { spawn as ptySpawn } from "node-pty";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const HERMES = process.env.HERMES_BIN || "hermes";
const HERMES_ARGS = process.env.HERMES_ARGS ? JSON.parse(process.env.HERMES_ARGS) : ["--tui"];

const app = express();

// Serve built assets from dist/ (Vite output)
app.use(express.static(join(__dirname, "dist")));

const server = app.listen(PORT, () =>
  console.log(`Hermes Web CLI → http://localhost:${PORT}`),
);

const wss = new WebSocketServer({ server });

const RESIZE_RE = /^\x1b\[RESIZE:(\d+);(\d+)\]$/;

wss.on("connection", (ws) => {
  const term = ptySpawn(HERMES, HERMES_ARGS, {
    name: "xterm-256color",
    cols: 100,
    rows: 30,
    env: { ...process.env, TERM: "xterm-256color" },
  });

  term.onData((d) => ws.readyState === 1 && ws.send(d));

  ws.on("message", (m) => {
    const data = m.toString();
    const match = data.match(RESIZE_RE);
    if (match) {
      term.resize(parseInt(match[1]), parseInt(match[2]));
    } else {
      term.write(data);
    }
  });

  ws.on("close", () => term.kill());
  ws.on("error", () => term.kill());
});
