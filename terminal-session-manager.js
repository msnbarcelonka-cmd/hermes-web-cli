const RESIZE_RE = /^\x1b\[RESIZE:(\d+);(\d+)\]$/;
const OPEN = 1;

function appendBounded(buffer, chunk, maxBytes) {
  buffer.chunks.push(chunk);
  buffer.bytes += Buffer.byteLength(chunk);
  while (buffer.bytes > maxBytes && buffer.chunks.length > 1) {
    buffer.bytes -= Buffer.byteLength(buffer.chunks.shift());
  }
}

export function createTerminalSessionManager({
  spawn,
  hermesBin = "hermes",
  hermesArgs = ["--tui"],
  detachTtlMs = 15 * 60 * 1000,
  outputBufferBytes = 1024 * 1024,
  maxAutostartTerminals = Number.POSITIVE_INFINITY,
  tuiDir,
} = {}) {
  if (typeof spawn !== "function") throw new TypeError("PTY spawn function is required");

  const sessions = new Map();
  const keyFor = (workspaceId, index) => `${workspaceId}:${index}`;

  function stopSession(key) {
    const session = sessions.get(key);
    if (!session) return;
    clearTimeout(session.detachTimer);
    sessions.delete(key);
    for (const client of session.clients) client.close?.();
    session.pty.kill();
  }

  function startSession(workspace, index) {
    const key = keyFor(workspace.id, index);
    const existing = sessions.get(key);
    if (existing) return existing;

    const env = {
      ...process.env,
      TERM: "xterm-256color",
      HERMES_TUI_DISABLE_MOUSE: "1",
      HERMES_TUI_INLINE: "1",
      COLORTERM: "truecolor",
      HERMES_TUI_DASHBOARD: "1",
      ...(tuiDir ? { HERMES_TUI_DIR: tuiDir } : {}),
    };
    const pty = spawn(hermesBin, hermesArgs, {
      name: "xterm-256color",
      cols: 100,
      rows: 30,
      cwd: workspace.projectPath,
      env,
    });
    const session = {
      key,
      workspaceId: workspace.id,
      index,
      pty,
      clients: new Set(),
      outputBuffer: { chunks: [], bytes: 0 },
      detachTimer: undefined,
    };
    sessions.set(key, session);
    session.detachTimer = setTimeout(() => {
      if (session.clients.size === 0) stopSession(key);
    }, detachTtlMs);
    session.detachTimer.unref?.();

    pty.onData((data) => {
      appendBounded(session.outputBuffer, data, outputBufferBytes);
      for (const client of session.clients) {
        if (client.readyState === OPEN) client.send(data);
      }
    });
    pty.onExit(() => {
      clearTimeout(session.detachTimer);
      sessions.delete(key);
      for (const client of session.clients) client.close?.();
    });
    return session;
  }

  function ensureWorkspace(workspace, { autostart = false } = {}) {
    const limit = autostart
      ? Math.min(workspace.terminalCount, Math.max(0, maxAutostartTerminals))
      : workspace.terminalCount;
    for (let index = 0; index < limit; index += 1) startSession(workspace, index);
    return limit;
  }

  function attach({ workspace, index, ws }) {
    if (!Number.isInteger(index) || index < 0 || index >= workspace.terminalCount) {
      throw new RangeError("Terminal index is invalid");
    }
    const session = startSession(workspace, index);
    clearTimeout(session.detachTimer);
    session.detachTimer = undefined;
    session.clients.add(ws);

    for (const chunk of session.outputBuffer.chunks) {
      if (ws.readyState === OPEN) ws.send(chunk);
    }

    const onMessage = (message) => {
      const data = message.toString();
      const resize = data.match(RESIZE_RE);
      if (resize) session.pty.resize(Number(resize[1]), Number(resize[2]));
      else session.pty.write(data);
    };
    const detach = () => {
      ws.off?.("message", onMessage);
      ws.off?.("close", detach);
      ws.off?.("error", detach);
      if (!session.clients.delete(ws) || session.clients.size) return;
      clearTimeout(session.detachTimer);
      session.detachTimer = setTimeout(() => stopSession(session.key), detachTtlMs);
      session.detachTimer.unref?.();
    };
    ws.on("message", onMessage);
    ws.on("close", detach);
    ws.on("error", detach);
    return session;
  }

  return {
    ensureWorkspace,
    attach,
    stopWorkspace(workspaceId) {
      for (const [key, session] of sessions) {
        if (session.workspaceId === workspaceId) stopSession(key);
      }
    },
    stopAll() {
      for (const key of [...sessions.keys()]) stopSession(key);
    },
    listRuntimeSessions() {
      return [...sessions.values()].map(({ key, workspaceId, index, clients }) => ({
        id: key,
        workspaceId,
        index,
        clientCount: clients.size,
      }));
    },
  };
}
