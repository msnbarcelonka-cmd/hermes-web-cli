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
  // Env vars that match the official dashboard's PTY spawn (web_server.py:16676-16689).
  // HERMES_TUI_DISABLE_MOUSE: disables SGR mouse tracking so xterm.js does native
  //   browser-side selection (GPU-accelerated, correct selectionBackground color).
  // HERMES_TUI_INLINE: inline transcript mode for browser embedding.
  // COLORTERM: forces chalk to emit 24-bit RGB instead of downgrading to xterm 256 palette.
  // HERMES_TUI_DASHBOARD: marks the TUI as dashboard-embedded.
  const env = {
    ...process.env,
    TERM: "xterm-256color",
    HERMES_TUI_DISABLE_MOUSE: "1",
    HERMES_TUI_INLINE: "1",
    COLORTERM: "truecolor",
    HERMES_TUI_DASHBOARD: "1",
  };

  const term = ptySpawn(HERMES, HERMES_ARGS, {
    name: "xterm-256color",
    cols: 100,
    rows: 30,
    env,
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
