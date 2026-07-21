import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import "@xterm/xterm/css/xterm.css";

// ── Theme (matches official dashboard exactly) ──────────────────────
const DEFAULT_TERMINAL_BACKGROUND = "#000000";
const DEFAULT_TERMINAL_FOREGROUND = "#f0e6d2";

function buildTerminalTheme(background, foreground) {
  return {
    background,
    foreground,
    cursor: foreground,
    cursorAccent: background,
    selectionBackground:
      foreground.length === 7 ? `${foreground}44` : foreground,
  };
}

const terminalTheme = buildTerminalTheme(
  DEFAULT_TERMINAL_BACKGROUND,
  DEFAULT_TERMINAL_FOREGROUND,
);

const host = document.getElementById("t");

const term = new Terminal({
  allowProposedApi: true,
  cursorBlink: true,
  fontFamily:
    "'JetBrains Mono', 'Cascadia Mono', 'Fira Code', 'MesloLGS NF', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
  fontSize: 14,
  lineHeight: 1.15,
  letterSpacing: 0,
  fontWeight: "400",
  fontWeightBold: "700",
  macOptionIsMeta: true,
  macOptionClickForcesSelection: true,
  rightClickSelectsWord: true,
  scrollback: 5000,
  theme: terminalTheme,
});

// ── OSC 52 clipboard handler (write-only) ───────────────────────────
term.parser.registerOscHandler(52, (data) => {
  const semi = data.indexOf(";");
  if (semi < 0) return false;
  const payload = data.slice(semi + 1);
  if (payload === "?" || payload === "") return false;
  try {
    const binary = atob(payload);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const text = new TextDecoder("utf-8").decode(bytes);
    navigator.clipboard.writeText(text).catch(() => {});
  } catch {}
  return true;
});

const isMac =
  typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

// ── Custom key handler (copy/paste) ─────────────────────────────────
term.attachCustomKeyEventHandler((ev) => {
  if (ev.type !== "keydown") return true;
  const copyModifier = isMac ? ev.metaKey : ev.ctrlKey && ev.shiftKey;
  const pasteModifier = isMac ? ev.metaKey : ev.ctrlKey && ev.shiftKey;

  if (copyModifier && ev.key.toLowerCase() === "c") {
    const sel = term.getSelection();
    if (sel) {
      navigator.clipboard.writeText(sel).catch(() => {});
      term.clearSelection();
      ev.preventDefault();
      return false;
    }
  }

  if (pasteModifier && ev.key.toLowerCase() === "v") {
    ev.preventDefault();
    (async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) term.paste(text);
      } catch {}
    })();
    return false;
  }

  return true;
});

// ── Addons ──────────────────────────────────────────────────────────
const fit = new FitAddon();
term.loadAddon(fit);

// Dashboard chat scrolls the browser-side transcript, not PTY mouse-wheel.
term.attachCustomWheelEventHandler((ev) => {
  const delta = ev.deltaY;
  if (!delta) return false;
  const step = Math.max(1, Math.round(Math.abs(delta) / 50));
  term.scrollLines(delta > 0 ? step : -step);
  ev.preventDefault();
  ev.stopPropagation();
  return false;
});

const unicode11 = new Unicode11Addon();
term.loadAddon(unicode11);
term.unicode.activeVersion = "11";

term.loadAddon(new WebLinksAddon());

term.open(host);

// textarea attributes
const textarea = term.textarea;
if (textarea) {
  textarea.setAttribute("autocomplete", "off");
  textarea.setAttribute("autocorrect", "off");
  textarea.setAttribute("autocapitalize", "off");
  textarea.setAttribute("spellcheck", "false");
}

// ── WebGL renderer with context-loss recovery ───────────────────────
try {
  const webgl = new WebglAddon();
  webgl.onContextLoss(() => webgl.dispose());
  term.loadAddon(webgl);
} catch (err) {
  console.warn("[hermes-web-cli] WebGL unavailable; falling back to canvas", err);
}

// ── Resize sync (double-rAF authoritative fit, matches dashboard) ───
function syncTerminalMetrics() {
  if (!host.isConnected || host.clientWidth <= 0 || host.clientHeight <= 0)
    return;
  try {
    fit.fit();
  } catch {
    return;
  }
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(`\x1b[RESIZE:${term.cols};${term.rows}]`);
  }
}

let metricsDebounce = null;
const scheduleSyncTerminalMetrics = () => {
  if (metricsDebounce) clearTimeout(metricsDebounce);
  metricsDebounce = setTimeout(() => {
    metricsDebounce = null;
    syncTerminalMetrics();
  }, 60);
};

let hostSyncRaf = 0;
const scheduleHostSync = () => {
  if (hostSyncRaf) return;
  hostSyncRaf = requestAnimationFrame(() => {
    hostSyncRaf = 0;
    syncTerminalMetrics();
  });
};

const ro = new ResizeObserver(() => scheduleHostSync());
ro.observe(host);

window.addEventListener("resize", scheduleSyncTerminalMetrics);
window.visualViewport?.addEventListener("resize", scheduleSyncTerminalMetrics);

// Double-rAF authoritative fit
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    syncTerminalMetrics();
  });
});

// ── WebSocket ───────────────────────────────────────────────────────
const ws = new WebSocket(
  (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host,
);
ws.binaryType = "arraybuffer";

ws.onopen = () => {
  ws.send(`\x1b[RESIZE:${term.cols};${term.rows}]`);
  term.focus();
};

ws.onmessage = (ev) => {
  if (typeof ev.data === "string") {
    term.write(ev.data);
  } else {
    term.write(new Uint8Array(ev.data));
  }
};

ws.onclose = () =>
  term.write("\r\n\x1b[31m[disconnected]\x1b[0m");
ws.onerror = () => {};

// SGR mouse reports must never reach the PTY — they're terminal control traffic,
// not user input. Matches the official dashboard ChatPage.tsx filter (line 1101).
const SGR_MOUSE_RE = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/;

term.onData((d) => {
  if (SGR_MOUSE_RE.test(d)) return; // swallow mouse reports
  if (ws.readyState === WebSocket.OPEN) ws.send(d);
});

term.onResize(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(`\x1b[RESIZE:${term.cols};${term.rows}]`);
  }
});
