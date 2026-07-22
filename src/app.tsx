import { useEffect, useMemo, useState } from "react";

import { AppSidebar, type Entity, type EntityType } from "@/components/app-sidebar";
import { WorkspaceGrid } from "@/components/workspace-grid";
import { WorkspaceSetup } from "@/components/workspace-setup";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
  type Workspace,
} from "@/lib/workspaces";
import type { TerminalCount } from "@/lib/workspace-layout";

const ACTIVE_WORKSPACE_KEY = "mist.activeWorkspaceId";

type AppState = "loading" | "ready" | "error";

export function App() {
  const [state, setState] = useState<AppState>("loading");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [swarms, setSwarms] = useState<Entity[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>();
  const [workspaceSetupOpen, setWorkspaceSetupOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listWorkspaces()
      .then((loaded) => {
        if (cancelled) return;
        const savedId = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
        const selected = loaded.find((workspace) => workspace.id === savedId) ?? loaded[0];
        setWorkspaces(loaded);
        setActiveWorkspaceId(selected?.id);
        setWorkspaceSetupOpen(loaded.length === 0);
        setState("ready");
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Unable to load workspaces");
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeWorkspaceId) localStorage.setItem(ACTIVE_WORKSPACE_KEY, activeWorkspaceId);
    else localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
  }, [activeWorkspaceId]);

  const activeWorkspace = workspaces.find(({ id }) => id === activeWorkspaceId);
  const entities = useMemo<Entity[]>(
    () => [
      ...workspaces.map((workspace) => ({ ...workspace, type: "workspace" as const })),
      ...swarms,
    ],
    [swarms, workspaces],
  );

  const selectEntity = (id: string) => {
    if (!workspaces.some((workspace) => workspace.id === id)) return;
    setActiveWorkspaceId(id);
    setWorkspaceSetupOpen(false);
    setError("");
  };

  const createEntity = (name: string, type: EntityType) => {
    if (type !== "swarm") return;
    setSwarms((current) => [
      ...current,
      { id: crypto.randomUUID(), name, type },
    ]);
  };

  const handleCreateWorkspace = async (
    name: string,
    terminalCount: TerminalCount,
    projectPath: string,
  ) => {
    setIsCreating(true);
    setError("");
    try {
      const workspace = await createWorkspace({ name, terminalCount, projectPath });
      setWorkspaces((current) => [...current, workspace]);
      setActiveWorkspaceId(workspace.id);
      setWorkspaceSetupOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create workspace");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteEntity = async (id: string) => {
    if (!workspaces.some((workspace) => workspace.id === id)) {
      setSwarms((current) => current.filter((entity) => entity.id !== id));
      return;
    }

    setError("");
    try {
      await deleteWorkspace(id);
      const remaining = workspaces.filter((workspace) => workspace.id !== id);
      setWorkspaces(remaining);
      if (activeWorkspaceId === id) {
        setActiveWorkspaceId(remaining[0]?.id);
        setWorkspaceSetupOpen(remaining.length === 0);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete workspace");
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar
        entities={entities}
        activeEntityId={activeWorkspaceId}
        onWorkspaceSetup={() => {
          setWorkspaceSetupOpen(true);
          setError("");
        }}
        onCreateEntity={createEntity}
        onSelectEntity={selectEntity}
        onDeleteEntity={handleDeleteEntity}
      />
      <SidebarInset className="min-h-0 overflow-hidden bg-background">
        <SidebarTrigger className="absolute top-2 left-2 z-20 bg-background/80 shadow-sm backdrop-blur-sm md:hidden" />
        <div className="relative min-h-0 flex-1">
          {state === "loading" && (
            <div data-testid="workspace-bootstrap" className="absolute inset-0 bg-background" />
          )}
          {state === "error" && (
            <div className="flex size-full items-center justify-center px-6 text-sm text-destructive">
              {error}
            </div>
          )}
          {state === "ready" && workspaceSetupOpen && (
            <WorkspaceSetup
              onCreate={handleCreateWorkspace}
              isSubmitting={isCreating}
              error={error}
            />
          )}
          {state === "ready" && !workspaceSetupOpen && activeWorkspace && (
            <WorkspaceGrid workspace={activeWorkspace} />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
