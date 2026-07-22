import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { createWorkspaceStore } from "./workspace-store.js";

const roots = [];

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "mist-workspaces-"));
  roots.push(root);
  const projectPath = join(root, "project");
  await mkdir(projectPath);
  return {
    root,
    projectPath,
    databasePath: join(root, "workspaces.db"),
  };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("workspace store", () => {
  it("persists a normalized workspace across store instances", async () => {
    const { root, projectPath, databasePath } = await fixture();
    const first = createWorkspaceStore({ databasePath, browseRoot: root });

    const created = await first.createWorkspace({
      name: "  Alpha  ",
      projectPath,
      terminalCount: 4,
    });
    first.close();

    const second = createWorkspaceStore({ databasePath, browseRoot: root });
    expect(await second.listWorkspaces()).toEqual([created]);
    expect(created).toMatchObject({
      name: "Alpha",
      projectPath,
      terminalCount: 4,
    });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    second.close();
  });

  it("rejects invalid terminal counts", async () => {
    const { root, projectPath, databasePath } = await fixture();
    const store = createWorkspaceStore({ databasePath, browseRoot: root });

    await expect(
      store.createWorkspace({ name: "Alpha", projectPath, terminalCount: 3 }),
    ).rejects.toThrow("Terminal count is invalid");
    store.close();
  });

  it("rejects project paths outside the browse root", async () => {
    const { root, databasePath } = await fixture();
    const outside = await mkdtemp(join(tmpdir(), "mist-outside-"));
    roots.push(outside);
    const store = createWorkspaceStore({ databasePath, browseRoot: root });

    await expect(
      store.createWorkspace({ name: "Alpha", projectPath: outside, terminalCount: 1 }),
    ).rejects.toThrow("outside the browse root");
    store.close();
  });

  it("deletes persisted workspaces", async () => {
    const { root, projectPath, databasePath } = await fixture();
    const store = createWorkspaceStore({ databasePath, browseRoot: root });
    const workspace = await store.createWorkspace({ name: "Alpha", projectPath, terminalCount: 2 });

    expect(await store.deleteWorkspace(workspace.id)).toBe(true);
    expect(await store.getWorkspace(workspace.id)).toBeNull();
    expect(await store.deleteWorkspace(workspace.id)).toBe(false);
    store.close();
  });
});
