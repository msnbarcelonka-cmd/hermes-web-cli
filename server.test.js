import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createWorkspaceStore } from "./workspace-store.js";
import { createMistServer } from "./server.js";

const cleanups = [];

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

async function setup(sessionOverrides = {}) {
  const root = await mkdtemp(join(tmpdir(), "mist-api-"));
  const projectPath = join(root, "project");
  await mkdir(projectPath);
  const store = createWorkspaceStore({
    databasePath: join(root, "workspaces.db"),
    browseRoot: root,
  });
  const sessions = {
    ensureWorkspace: vi.fn(),
    attach: vi.fn(),
    stopWorkspace: vi.fn(),
    stopAll: vi.fn(),
    ...sessionOverrides,
  };
  const mist = createMistServer({ store, terminalSessions: sessions, browseRoot: root });
  await mist.listen(0, "127.0.0.1");
  const address = mist.server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  cleanups.push(async () => {
    await mist.close();
    await store.close();
    await rm(root, { recursive: true, force: true });
  });
  return { baseUrl, projectPath, sessions };
}

describe("workspace API", () => {
  it("creates and lists a persisted workspace", async () => {
    const { baseUrl, projectPath, sessions } = await setup();

    const create = await fetch(`${baseUrl}/api/workspaces`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Alpha", projectPath, terminalCount: 2 }),
    });
    const workspace = await create.json();
    const list = await fetch(`${baseUrl}/api/workspaces`);

    expect(create.status).toBe(201);
    expect(await list.json()).toEqual([workspace]);
    expect(sessions.ensureWorkspace).toHaveBeenCalledWith(workspace);
  });

  it("rolls back persistence when terminal startup fails", async () => {
    const { baseUrl, projectPath, sessions } = await setup({
      ensureWorkspace: vi.fn(() => {
        throw new Error("spawn failed");
      }),
    });

    const create = await fetch(`${baseUrl}/api/workspaces`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Alpha", projectPath, terminalCount: 2 }),
    });

    expect(create.status).toBe(500);
    expect(await fetch(`${baseUrl}/api/workspaces`).then((response) => response.json())).toEqual([]);
    expect(sessions.stopWorkspace).toHaveBeenCalledOnce();
  });

  it("deletes a workspace and stops its terminals", async () => {
    const { baseUrl, projectPath, sessions } = await setup();
    const created = await fetch(`${baseUrl}/api/workspaces`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Alpha", projectPath, terminalCount: 1 }),
    }).then((response) => response.json());

    const deleted = await fetch(`${baseUrl}/api/workspaces/${created.id}`, { method: "DELETE" });

    expect(deleted.status).toBe(204);
    expect(sessions.stopWorkspace).toHaveBeenCalledWith(created.id);
    expect(await fetch(`${baseUrl}/api/workspaces`).then((response) => response.json())).toEqual([]);
  });

  it("returns validation errors without starting terminals", async () => {
    const { baseUrl, sessions } = await setup();

    const response = await fetch(`${baseUrl}/api/workspaces`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Alpha", projectPath: "relative", terminalCount: 3 }),
    });

    expect(response.status).toBe(400);
    expect(sessions.ensureWorkspace).not.toHaveBeenCalled();
  });
});
