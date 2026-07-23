import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

import { createTerminalSessionManager } from "./terminal-session-manager.js";

class FakePty extends EventEmitter {
  constructor(options) {
    super();
    this.options = options;
    this.killed = false;
    this.writes = [];
    this.resizes = [];
  }

  onData(listener) {
    this.on("data", listener);
    return { dispose: () => this.off("data", listener) };
  }

  onExit(listener) {
    this.on("exit", listener);
    return { dispose: () => this.off("exit", listener) };
  }

  write(data) {
    this.writes.push(data);
  }

  resize(cols, rows) {
    this.resizes.push([cols, rows]);
  }

  kill() {
    this.killed = true;
    this.emit("exit", { exitCode: 0 });
  }
}

class FakeSocket extends EventEmitter {
  constructor() {
    super();
    this.readyState = 1;
    this.sent = [];
  }

  send(data) {
    this.sent.push(data);
  }
}

const workspace = {
  id: "workspace-1",
  name: "Alpha",
  projectPath: "/root/project",
  terminalCount: 2,
};

function setup(options = {}) {
  const ptys = [];
  const spawn = vi.fn((_bin, _args, spawnOptions) => {
    const pty = new FakePty(spawnOptions);
    ptys.push(pty);
    return pty;
  });
  const manager = createTerminalSessionManager({
    spawn,
    hermesBin: "hermes",
    hermesArgs: ["--tui"],
    detachTtlMs: 25,
    ...options,
  });
  return { manager, ptys, spawn };
}

describe("terminal session manager", () => {
  it("starts independent PTYs in the workspace directory", () => {
    const { manager, ptys } = setup({ detachTtlMs: 10_000 });

    manager.ensureWorkspace(workspace);

    expect(ptys).toHaveLength(2);
    expect(ptys[0]).not.toBe(ptys[1]);
    expect(ptys[0].options.cwd).toBe("/root/project");
    expect(ptys[0].options.env.HERMES_CWD).toBe("/root/project");
    expect(ptys[0].options.env.TERMINAL_CWD).toBe("/root/project");
    expect(ptys[0].options.env.HERMES_TUI_DISABLE_MOUSE).toBe("1");
    manager.stopAll();
  });

  it("stops an automatically started terminal if no browser attaches", async () => {
    const { manager, ptys } = setup();

    manager.ensureWorkspace({ ...workspace, terminalCount: 1 });
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(ptys[0].killed).toBe(true);
    expect(manager.listRuntimeSessions()).toEqual([]);
  });

  it("routes input and resize to only the attached terminal", () => {
    const { manager, ptys } = setup();
    manager.ensureWorkspace(workspace);
    const first = new FakeSocket();
    const second = new FakeSocket();

    manager.attach({ workspace, index: 0, ws: first });
    manager.attach({ workspace, index: 1, ws: second });
    first.emit("message", Buffer.from("hello"));
    second.emit("message", Buffer.from("\x1b[RESIZE:80;24]"));

    expect(ptys[0].writes).toEqual(["hello"]);
    expect(ptys[1].writes).toEqual([]);
    expect(ptys[1].resizes).toEqual([[80, 24]]);
    manager.stopAll();
  });

  it("replays buffered output when a terminal reconnects", () => {
    const { manager, ptys } = setup();
    manager.ensureWorkspace(workspace);
    ptys[0].emit("data", "before reconnect");
    const socket = new FakeSocket();

    manager.attach({ workspace, index: 0, ws: socket });

    expect(socket.sent).toEqual(["before reconnect"]);
    manager.stopAll();
  });

  it("keeps a detached PTY until its TTL expires", async () => {
    const { manager, ptys } = setup();
    manager.ensureWorkspace(workspace);
    const socket = new FakeSocket();
    manager.attach({ workspace, index: 0, ws: socket });

    socket.emit("close");
    expect(ptys[0].killed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(ptys[0].killed).toBe(true);
    expect(manager.listRuntimeSessions()).toEqual([]);
    manager.stopAll();
  });

  it("cancels teardown when a terminal reconnects", async () => {
    const { manager, ptys } = setup();
    manager.ensureWorkspace(workspace);
    const first = new FakeSocket();
    manager.attach({ workspace, index: 0, ws: first });
    first.emit("close");

    const second = new FakeSocket();
    manager.attach({ workspace, index: 0, ws: second });
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(ptys[0].killed).toBe(false);
    manager.stopAll();
  });
});
