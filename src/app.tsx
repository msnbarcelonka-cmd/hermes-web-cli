import { lazy, Suspense, useRef, useState } from "react";

import { AppSidebar, type Entity, type EntityType } from "@/components/app-sidebar";
import { WorkspaceSetup } from "@/components/workspace-setup";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const Terminal = lazy(() =>
  import("@/components/terminal").then(({ Terminal }) => ({ default: Terminal })),
);

export function App() {
  const nextId = useRef(0);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [workspaceSetupOpen, setWorkspaceSetupOpen] = useState(false);

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
      <SidebarInset className="min-h-0 overflow-hidden bg-black">
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
            <Suspense fallback={null}>
              <Terminal />
            </Suspense>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
