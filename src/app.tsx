import { lazy, Suspense, useCallback, useRef, useState } from "react";

import { AppSidebar, type Entity, type EntityType } from "@/components/app-sidebar";
import { WorkspaceSetup } from "@/components/workspace-setup";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const Terminal = lazy(() =>
  import("@/components/terminal").then(({ Terminal }) => ({ default: Terminal })),
);

function ConnectingPanel() {
  return (
    <div
      data-testid="connecting-panel"
      className="absolute inset-0 z-10 bg-terminal px-3 py-2.5 font-mono text-sm text-[#f0e6d2]"
    >
      <div className="flex items-center gap-2 leading-[1.15]">
        <span className="h-4 w-1.5 bg-sidebar-primary" />
        <strong>mist</strong>
        <span className="text-[#f0e6d2]/45">v1.0.0</span>
      </div>
      <p className="mt-1 leading-[1.15] text-[#f0e6d2]/45">
        connecting to hermes<span className="animate-cursor-blink">…</span>
      </p>
    </div>
  );
}

export function App() {
  const nextId = useRef(0);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [workspaceSetupOpen, setWorkspaceSetupOpen] = useState(false);
  const [terminalReady, setTerminalReady] = useState(false);
  const handleTerminalReady = useCallback(() => setTerminalReady(true), []);

  const createEntity = (
    name: string,
    type: EntityType,
    details: Pick<Entity, "projectPath" | "terminalCount"> = {},
  ) => {
    setEntities((current) => [
      ...current,
      { id: ++nextId.current, name, type, ...details },
    ]);
  };

  const deleteEntity = (id: number) => {
    setEntities((current) => current.filter((entity) => entity.id !== id));
  };

  return (
    <SidebarProvider>
      <AppSidebar
        entities={entities}
        onWorkspaceSetup={() => setWorkspaceSetupOpen(true)}
        onCreateEntity={createEntity}
        onDeleteEntity={deleteEntity}
      />
      <SidebarInset className="min-h-0 overflow-hidden bg-background">
        <SidebarTrigger className="absolute top-2 left-2 z-20 bg-background/80 shadow-sm backdrop-blur-sm md:hidden" />
        <div className="relative min-h-0 flex-1">
          {workspaceSetupOpen ? (
            <WorkspaceSetup
              onCreate={(name, terminalCount, projectPath) =>
                createEntity(name, "workspace", {
                  projectPath,
                  terminalCount,
                })
              }
            />
          ) : (
            <div className="absolute inset-0 p-2 sm:p-2.5">
              <div className="relative size-full overflow-hidden rounded-lg border bg-terminal">
                {!terminalReady && <ConnectingPanel />}
                <Suspense fallback={null}>
                  <Terminal onReady={handleTerminalReady} />
                </Suspense>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
