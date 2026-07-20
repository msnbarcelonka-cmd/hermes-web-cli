# Hermes Web CLI

Full-screen Hermes CLI accessible through a browser via WebSocket + xterm.js.

## Run

```bash
npm install
npm start
```

Open `http://YOUR_SERVER_IP:3000` — the Hermes CLI fills the entire viewport.

## Config

| Variable    | Default  | Description            |
|-------------|----------|------------------------|
| `PORT`      | `3000`   | HTTP port              |
| `HERMES_BIN`| `hermes` | Path to Hermes binary  |
