import type { TerminalCount } from "@/lib/workspace-layout";

export type Workspace = {
  id: string;
  name: string;
  projectPath: string;
  terminalCount: TerminalCount;
  createdAt: string;
  updatedAt: string;
};

export type CreateWorkspaceInput = Pick<Workspace, "name" | "projectPath" | "terminalCount">;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || `Request failed with status ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function listWorkspaces() {
  return request<Workspace[]>("/api/workspaces");
}

export function createWorkspace(input: CreateWorkspaceInput) {
  return request<Workspace>("/api/workspaces", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function deleteWorkspace(id: string) {
  return request<void>(`/api/workspaces/${encodeURIComponent(id)}`, { method: "DELETE" });
}
