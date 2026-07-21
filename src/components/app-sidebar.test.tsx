// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

describe("AppSidebar", () => {
  beforeEach(() => {
    document.cookie = "sidebar_state=; max-age=0";
  });

  it("creates a workspace through the Radix dialog", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar />
        </SidebarProvider>
      </TooltipProvider>,
    );

    await user.click(screen.getByRole("button", { name: "New workspace" }));
    await user.type(screen.getByLabelText("Name"), "  Alpha  ");
    await user.click(screen.getByRole("button", { name: "Create workspace" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Alpha" })).toBeTruthy();
  });
});
