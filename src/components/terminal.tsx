import { useEffect, useRef } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal as XTerm } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

const SGR_MOUSE_RE = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/;
const RESIZE_DEBOUNCE_MS = 60;

export function Terminal({ onReady }: { onReady?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let ready = false;
    let readyDelay: ReturnType<typeof setTimeout> | undefined;
    let readyFallback: ReturnType<typeof setTimeout> | undefined;
    const term = new XTerm({
      allowProposedApi: true,
      cursorBlink: true,
      fontFamily:
        "'Geist Mono Variable', 'JetBrains Mono', 'Cascadia Mono', 'Fira Code', Menlo, Consolas, monospace",
      fontSize: 14,
      lineHeight: 1.15,
      fontWeight: "400",
      fontWeightBold: "700",
      macOptionIsMeta: true,
      macOptionClickForcesSelection: true,
      rightClickSelectsWord: true,
      scrollback: 5000,
      theme: {
        background: "#0b0a08",
        foreground: "#f0e6d2",
        cursor: "#f0e6d2",
        cursorAccent: "#0b0a08",
        selectionBackground: "#5f93b855",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);

    term.attachCustomWheelEventHandler((event) => {
      if (!event.deltaY) return false;
      const lines = Math.max(1, Math.round(Math.abs(event.deltaY) / 50));
      term.scrollLines(event.deltaY > 0 ? lines : -lines);
      event.preventDefault();
      event.stopPropagation();
      return false;
    });

    const unicode11 = new Unicode11Addon();
    term.loadAddon(unicode11);
    term.unicode.activeVersion = "11";
    term.loadAddon(new WebLinksAddon());
    term.open(host);

    const textarea = term.textarea;
    if (textarea) {
      textarea.autocomplete = "off";
      textarea.autocorrect = false;
      textarea.autocapitalize = "off";
      textarea.spellcheck = false;
    }

    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => webgl.dispose());
      term.loadAddon(webgl);
    } catch (error) {
      console.warn("[hermes-web-cli] WebGL unavailable; using canvas", error);
    }

    term.parser.registerOscHandler(52, (data) => {
      const separator = data.indexOf(";");
      if (separator < 0) return false;
      const payload = data.slice(separator + 1);
      if (!payload || payload === "?") return false;
      try {
        const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0));
        navigator.clipboard
          .writeText(new TextDecoder().decode(bytes))
          .catch(() => undefined);
      } catch {
        return false;
      }
      return true;
    });

    const socket = new WebSocket(
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`,
    );
    socket.binaryType = "arraybuffer";

    const sendSize = () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(`\x1b[RESIZE:${term.cols};${term.rows}]`);
      }
    };

    const fitTerminal = () => {
      if (!host.isConnected || !host.clientWidth || !host.clientHeight) return;
      try {
        fit.fit();
        sendSize();
      } catch {
        // The terminal may be between layout states during sidebar transitions.
      }
    };

    let frame = 0;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const scheduleFit = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        fitTerminal();
      });
    };
    const scheduleDebouncedFit = () => {
      clearTimeout(debounce);
      debounce = setTimeout(fitTerminal, RESIZE_DEBOUNCE_MS);
    };

    const resizeObserver = new ResizeObserver(scheduleFit);
    resizeObserver.observe(host);
    window.addEventListener("resize", scheduleDebouncedFit);
    window.visualViewport?.addEventListener("resize", scheduleDebouncedFit);

    const isMac = /Mac/i.test(navigator.platform);
    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== "keydown") return true;
      const modifier = isMac ? event.metaKey : event.ctrlKey && event.shiftKey;
      const key = event.key.toLowerCase();

      if (modifier && key === "c") {
        const selection = term.getSelection();
        if (!selection) return true;
        navigator.clipboard.writeText(selection).catch(() => undefined);
        term.clearSelection();
        event.preventDefault();
        return false;
      }

      if (modifier && key === "v") {
        event.preventDefault();
        navigator.clipboard
          .readText()
          .then((text) => text && term.paste(text))
          .catch(() => undefined);
        return false;
      }

      return true;
    });

    const dataDisposable = term.onData((data) => {
      if (!SGR_MOUSE_RE.test(data) && socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    });
    const resizeDisposable = term.onResize(sendSize);

    socket.onopen = () => {
      requestAnimationFrame(() => requestAnimationFrame(fitTerminal));
      term.focus();
      readyFallback = setTimeout(() => {
        if (!ready) {
          ready = true;
          requestAnimationFrame(() => onReady?.());
        }
      }, 30000);
    };
    socket.onmessage = ({ data }) => {
      term.write(typeof data === "string" ? data : new Uint8Array(data));

      if (!ready) {
        clearTimeout(readyDelay);
        readyDelay = setTimeout(() => {
          const buf = term.buffer.active;
          for (let i = 0; i < buf.length; i++) {
            const line = buf.getLine(i);
            if (line && /ready/.test(line.translateToString(true))) {
              if (!ready) {
                ready = true;
                requestAnimationFrame(() => onReady?.());
              }
              return;
            }
          }
        }, 200);
      }
    };
    socket.onclose = () => term.write("\r\n\x1b[31m[disconnected]\x1b[0m");

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleDebouncedFit);
      window.visualViewport?.removeEventListener("resize", scheduleDebouncedFit);
      cancelAnimationFrame(frame);
      clearTimeout(debounce);
      clearTimeout(readyDelay);
      clearTimeout(readyFallback);
      dataDisposable.dispose();
      resizeDisposable.dispose();
      socket.close();
      term.dispose();
    };
  }, [onReady]);

  return <div ref={hostRef} className="absolute inset-0 px-3 py-2.5" />;
}
