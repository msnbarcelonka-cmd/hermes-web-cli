// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

function renderSidebar(defaultOpen = true) {
  return render(
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
      </SidebarProvider>
    </TooltipProvider>,
  );
}

async function createItem(type: "Workspace" | "Swarm", name: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Create" }));
  await user.click(screen.getByRole("menuitem", { name: type }));
  await user.type(screen.getByLabelText("Name"), name);
  await user.click(screen.getByRole("button", { name: `Create ${type.toLowerCase()}` }));
  return user;
}

describe("AppSidebar", () => {
  beforeEach(() => {
    document.cookie = "sidebar_state=; max-age=0";
  });

  afterEach(cleanup);

  it("uses Mist branding and a single explicit sidebar trigger", async () => {
    const user = userEvent.setup();
    const { container } = renderSidebar();

    expect(screen.getByText("Mist")).toBeTruthy();
    expect(container.querySelector('[data-sidebar="rail"]')).toBeNull();

    const trigger = screen.getByRole("button", { name: "Toggle Sidebar" });
    expect(trigger.className).toContain("size-8");
    await user.click(trigger);
    expect(container.querySelector('[data-state="collapsed"]')).toBeTruthy();
  });

  it("keeps the collapsed Create button square and centered", () => {
    renderSidebar(false);

    const createButton = screen.getByRole("button", { name: "Create" });
    expect(createButton.className).toContain("group-data-[collapsible=icon]:size-8");
    expect(createButton.className).toContain("group-data-[collapsible=icon]:justify-center");
  });

  it("shows section toggles only after items exist and collapses their lists", async () => {
    renderSidebar();

    expect(screen.queryByRole("button", { name: "Toggle Workspaces" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Toggle Swarms" })).toBeNull();

    const user = await createItem("Workspace", "Alpha");
    expect(screen.getByRole("button", { name: "Toggle Workspaces" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Alpha" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Toggle Workspaces" }));
    expect(screen.queryByRole("button", { name: "Alpha" })).toBeNull();
  });

  it("creates and deletes workspaces", async () => {
    renderSidebar();
    const user = await createItem("Workspace", "Alpha");

    await user.click(screen.getByRole("button", { name: "Delete Alpha" }));
    expect(screen.queryByRole("button", { name: "Alpha" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Toggle Workspaces" })).toBeNull();
  });

  it("deletes only the selected item when names are duplicated", async () => {
    renderSidebar();
    let user = await createItem("Workspace", "Alpha");
    user = await createItem("Workspace", "Alpha");

    const deleteButtons = screen.getAllByRole("button", { name: "Delete Alpha" });
    await user.click(deleteButtons[0]);

    expect(screen.getAllByRole("button", { name: "Alpha" })).toHaveLength(1);
  });

  it("creates and deletes swarms", async () => {
    renderSidebar();
    const user = await createItem("Swarm", "Builders");

    expect(screen.getByRole("button", { name: "Builders" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Toggle Swarms" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Delete Builders" }));
    expect(screen.queryByRole("button", { name: "Builders" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Toggle Swarms" })).toBeNull();
  });
});
