import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </StrictMode>,
);
