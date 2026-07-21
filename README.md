# hermes-web-cli

Full-screen [Hermes Agent](https://github.com/NousResearch/hermes-agent) TUI in the browser with a shadcn/ui workspace sidebar.

## Quick start

```bash
npm install
npm run build
npm start
```

Open `http://localhost:3000`.

## Architecture

- **React + TypeScript + Vite** application shell
- **shadcn/ui Radix Nova** sidebar, dialog, input, button, and tooltip components
- **xterm.js v6 + WebGL** terminal renderer, loaded as a separate chunk
- **Express + WebSocket + node-pty** bridge to `hermes --tui`

## Commands

```bash
npm run dev        # Vite development server
npm run typecheck  # TypeScript validation
npm test           # Unit and component tests
npm run build      # Production build
npm start          # Production server
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `HERMES_BIN` | `hermes` | Hermes executable |
| `HERMES_ARGS` | `["--tui"]` | Hermes arguments as a JSON array |

## Requirements

- Node.js 18+
- Hermes Agent CLI
- Linux or macOS for PTY support
