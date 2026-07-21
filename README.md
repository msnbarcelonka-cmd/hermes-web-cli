# hermes-web-cli

Full-screen [Hermes Agent](https://github.com/NousResearch/hermes-agent) TUI in the browser.

Spawns `hermes --tui` behind a PTY and streams it to a GPU-accelerated xterm.js terminal — visually identical to the official `hermes dashboard` Chat tab.

## Quick start

```bash
npm install
npm run build
npm start
```

Open `http://localhost:3000`.

## How it works

- **Express + WebSocket** server (`server.js`) spawns `hermes --tui` via `node-pty`
- **xterm.js v6 + WebGL renderer** (`src/main.js`) renders ANSI output on GPU
- PTY env sets `HERMES_TUI_DISABLE_MOUSE`, `COLORTERM=truecolor` — matches the official dashboard exactly

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `HERMES_BIN` | `hermes` | Path to Hermes binary |
| `HERMES_ARGS` | `["--tui"]` | Arguments (JSON array) |

## Requirements

- Node.js 18+
- Hermes Agent CLI (`hermes`)
- POSIX system (Linux/macOS) for PTY support

## Stack

`@xterm/xterm@6` · `@xterm/addon-webgl@0.19` · `@xterm/addon-fit@0.11` · `@xterm/addon-web-links@0.12` · `@xterm/addon-unicode11@0.9` · Vite 8 · Express 4 · ws 8 · node-pty 1
