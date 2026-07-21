import { lazy, Suspense, useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { WorkspaceSetup } from "@/components/workspace-setup";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const Terminal = lazy(() =>
  import("@/components/terminal").then(({ Terminal }) => ({ default: Terminal })),
);

export function App() {
  const [workspaceSetupOpen, setWorkspaceSetupOpen] = useState(false);

  return (
    <SidebarProvider>
      <AppSidebar onWorkspaceCreated={() => setWorkspaceSetupOpen(true)} />
      <SidebarInset className="min-h-0 overflow-hidden bg-black">
        <SidebarTrigger className="absolute top-2 left-2 z-20 bg-background/80 shadow-sm backdrop-blur-sm md:hidden" />
        <div className="relative min-h-0 flex-1">
          {workspaceSetupOpen ? (
            <WorkspaceSetup />
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
