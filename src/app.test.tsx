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

function renderApp() {
  return render(
    <TooltipProvider>
      <App />
    </TooltipProvider>,
  );
}

describe("App workspace setup flow", () => {
  afterEach(cleanup);

  it("moves workspace creation into the setup screen", async () => {
    const user = userEvent.setup();
    renderApp();

    expect(await screen.findByTestId("terminal")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByRole("menuitem", { name: "Workspace" }));

    expect(await screen.findByRole("heading", { name: "Set up your workspace" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByTestId("terminal")).toBeNull();
    expect(screen.queryByRole("button", { name: "Alpha" })).toBeNull();

    const name = screen.getByLabelText("Workspace name");
    const create = screen.getByRole("button", { name: "Create workspace" });
    expect(create.hasAttribute("disabled")).toBe(false);

    await user.click(create);
    expect(screen.queryByRole("button", { name: "Alpha" })).toBeNull();

    await user.type(name, "  Alpha  ");
    await user.click(create);

    expect(screen.getByRole("button", { name: "Alpha" })).toBeTruthy();
  });
});
