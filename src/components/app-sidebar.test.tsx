// @vitest-environment jsdom

import { useRef, useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AppSidebar,
  type Entity,
  type EntityType,
} from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

let requestedWorkspaceName = "Workspace";

function SidebarHarness() {
  const nextId = useRef(0);
  const [entities, setEntities] = useState<Entity[]>([]);

  const createEntity = (name: string, type: EntityType) => {
    setEntities((current) => [
      ...current,
      { id: ++nextId.current, name, type },
    ]);
  };

  return (
    <AppSidebar
      entities={entities}
      onWorkspaceSetup={() => createEntity(requestedWorkspaceName, "workspace")}
      onCreateEntity={createEntity}
      onDeleteEntity={(id) =>
        setEntities((current) => current.filter((entity) => entity.id !== id))
      }
    />
  );
}

function renderSidebar(defaultOpen = true) {
  return render(
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <SidebarHarness />
      </SidebarProvider>
    </TooltipProvider>,
  );
}

async function createItem(type: "Workspace" | "Swarm", name: string) {
  const user = userEvent.setup();
  requestedWorkspaceName = name;
  await user.click(screen.getByRole("button", { name: "Create" }));
  await user.click(screen.getByRole("menuitem", { name: type }));

  if (type === "Swarm") {
    await user.type(screen.getByLabelText("Name"), name);
    await user.click(screen.getByRole("button", { name: "Create swarm" }));
  }

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

  it("keeps section rows stable while their submenus appear", async () => {
    renderSidebar();

    const workspaces = screen.getByRole("button", { name: "Workspaces" });
    const swarms = screen.getByRole("button", { name: "Swarms" });
    expect(workspaces.closest('[data-sidebar="menu-item"]')).toBeTruthy();
    expect(swarms.closest('[data-sidebar="menu-item"]')).toBeTruthy();
    expect(workspaces.querySelector(".lucide-chevron-right")).toBeNull();
    expect(swarms.querySelector(".lucide-chevron-right")).toBeNull();

    const user = await createItem("Workspace", "Alpha");
    const workspaceToggle = screen.getByRole("button", { name: "Toggle Workspaces" });
    const submenu = document.querySelector('[data-sidebar="menu-sub"]');
    expect(workspaceToggle).toBe(workspaces);
    expect(workspaceToggle.querySelector(".lucide-chevron-right")).toBeTruthy();
    expect(submenu).toBeTruthy();
    expect(submenu?.className).toContain("border-l");
    expect(screen.getByRole("button", { name: "Alpha" }).closest('[data-sidebar="menu-sub-item"]')).toBeTruthy();

    await user.click(workspaceToggle);
    expect(screen.queryByRole("button", { name: "Alpha" })).toBeNull();
  });

  it("keeps submenu lines and initial buttons in collapsed mode", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await createItem("Workspace", "Alpha");
    await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));

    const submenu = document.querySelector('[data-sidebar="menu-sub"]');
    const item = screen.getByRole("button", { name: "Alpha" });
    expect(submenu?.className).toContain("group-data-[collapsible=icon]:flex!");
    expect(item.className).toContain("group-data-[collapsible=icon]:flex!");
    expect(item.className).toContain("group-data-[collapsible=icon]:size-8");
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("creates and deletes workspaces", async () => {
    renderSidebar();
    const user = await createItem("Workspace", "Alpha");

    await user.click(screen.getByRole("button", { name: "Delete Alpha" }));
    expect(screen.queryByRole("button", { name: "Alpha" })).toBeNull();
    const workspaces = screen.getByRole("button", { name: "Workspaces" });
    expect(workspaces.querySelector(".lucide-chevron-right")).toBeNull();
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
    const swarms = screen.getByRole("button", { name: "Swarms" });
    expect(swarms.querySelector(".lucide-chevron-right")).toBeNull();
  });
});
