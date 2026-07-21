// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "@/app";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/components/terminal", () => ({
  Terminal: () => <div data-testid="terminal">Terminal</div>,
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

describe("App workspace setup flow", () => {
  afterEach(cleanup);

  it("replaces the terminal after creating a workspace", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>,
    );

    expect(await screen.findByTestId("terminal")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByRole("menuitem", { name: "Workspace" }));
    await user.type(screen.getByLabelText("Name"), "Alpha");
    await user.click(screen.getByRole("button", { name: "Create workspace" }));

    expect(await screen.findByRole("heading", { name: "Set up your workspace" })).toBeTruthy();
    expect(screen.queryByTestId("terminal")).toBeNull();
  });
});
