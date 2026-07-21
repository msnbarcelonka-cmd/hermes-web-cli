// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

describe("AppSidebar", () => {
  beforeEach(() => {
    document.cookie = "sidebar_state=; max-age=0";
  });

  afterEach(cleanup);

  it("uses Mist branding and a single explicit sidebar trigger", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar />
        </SidebarProvider>
      </TooltipProvider>,
    );

    expect(screen.getByText("Mist")).toBeTruthy();
    expect(container.querySelector('[data-sidebar="rail"]')).toBeNull();

    const trigger = screen.getByRole("button", { name: "Toggle Sidebar" });
    expect(trigger.className).toContain("size-8");
    await user.click(trigger);
    expect(container.querySelector('[data-state="collapsed"]')).toBeTruthy();
  });

  it("keeps collapsed action buttons square and centered", () => {
    render(
      <TooltipProvider>
        <SidebarProvider defaultOpen={false}>
          <AppSidebar />
        </SidebarProvider>
      </TooltipProvider>,
    );

    const createButton = screen.getByRole("button", { name: "New workspace" });
    expect(createButton.className).toContain("group-data-[collapsible=icon]:size-8");
    expect(createButton.className).toContain("group-data-[collapsible=icon]:justify-center");
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
