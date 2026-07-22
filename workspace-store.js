import Database from "better-sqlite3";
import { mkdir, realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";

export const TERMINAL_COUNTS = new Set([1, 2, 4, 6, 8, 10, 12]);

function isWithin(root, target) {
  const pathFromRoot = relative(root, target);
  return pathFromRoot === "" || (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== "..");
}

function rowToWorkspace(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    projectPath: row.project_path,
    terminalCount: row.terminal_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createWorkspaceStore({ databasePath, browseRoot = "/root" } = {}) {
  if (!databasePath) throw new TypeError("Workspace database path is required");

  let database;
  const ready = mkdir(dirname(databasePath), { recursive: true }).then(() => {
    database = new Database(databasePath);
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");
    database.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        project_path TEXT NOT NULL,
        terminal_count INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  });

  async function validateProjectPath(projectPath) {
    if (typeof projectPath !== "string" || !isAbsolute(projectPath)) {
      throw new TypeError("Project path must be absolute");
    }

    const [root, target] = await Promise.all([
      realpath(resolve(browseRoot)),
      realpath(resolve(projectPath)),
    ]);
    if (!isWithin(root, target)) {
      throw new RangeError("Project path is outside the browse root");
    }
    if (!(await stat(target)).isDirectory()) {
      throw new TypeError("Project path must point to a directory");
    }
    return target;
  }

  return {
    async listWorkspaces() {
      await ready;
      return database
        .prepare("SELECT * FROM workspaces ORDER BY created_at, id")
        .all()
        .map(rowToWorkspace);
    },

    async getWorkspace(id) {
      await ready;
      return rowToWorkspace(database.prepare("SELECT * FROM workspaces WHERE id = ?").get(id));
    },

    async createWorkspace({ name, projectPath, terminalCount } = {}) {
      const normalizedName = typeof name === "string" ? name.trim() : "";
      if (!normalizedName || normalizedName.length > 64) {
        throw new TypeError("Workspace name is invalid");
      }
      if (!TERMINAL_COUNTS.has(terminalCount)) {
        throw new TypeError("Terminal count is invalid");
      }

      const normalizedPath = await validateProjectPath(projectPath);
      await ready;
      const now = new Date().toISOString();
      const workspace = {
        id: randomUUID(),
        name: normalizedName,
        projectPath: normalizedPath,
        terminalCount,
        createdAt: now,
        updatedAt: now,
      };
      database
        .prepare(`
          INSERT INTO workspaces (
            id, name, project_path, terminal_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `)
        .run(
          workspace.id,
          workspace.name,
          workspace.projectPath,
          workspace.terminalCount,
          workspace.createdAt,
          workspace.updatedAt,
        );
      return workspace;
    },

    async deleteWorkspace(id) {
      await ready;
      return database.prepare("DELETE FROM workspaces WHERE id = ?").run(id).changes > 0;
    },

    async validateWorkspace(workspace) {
      return { ...workspace, projectPath: await validateProjectPath(workspace.projectPath) };
    },

    async close() {
      await ready;
      database.close();
    },
  };
}
