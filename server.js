import express from "express";
import { WebSocketServer } from "ws";
import { spawn as ptySpawn } from "node-pty";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const HERMES = process.env.HERMES_BIN || "hermes";

const app = express();
app.get("/", (_req, res) =>
  res.type("html").send(readFileSync(join(__dirname, "index.html"))),
);

const server = app.listen(PORT, () =>
  console.log(`Hermes Web CLI → http://localhost:${PORT}`),
);

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  const term = ptySpawn(HERMES, [], {
    name: "xterm-256color",
    cols: 100,
    rows: 30,
    env: process.env,
  });

  term.onData((d) => ws.readyState === 1 && ws.send(d));
  ws.on("message", (m) => {
    try {
      const msg = JSON.parse(m.toString());
      if (msg.resize) term.resize(msg.resize.cols, msg.resize.rows);
    } catch {
      term.write(m.toString());
    }
  });
  ws.on("close", () => term.kill());
  ws.on("error", () => term.kill());
});
