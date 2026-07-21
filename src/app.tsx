import { lazy, Suspense } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const Terminal = lazy(() =>
  import("@/components/terminal").then(({ Terminal }) => ({ default: Terminal })),
);

export function App() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-0 overflow-hidden bg-black">
        <SidebarTrigger className="absolute top-2 left-2 z-20 bg-background/80 shadow-sm backdrop-blur-sm md:hidden" />
        <div className="relative min-h-0 flex-1">
          <Suspense fallback={null}>
            <Terminal />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
