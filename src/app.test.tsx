// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/app";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/components/terminal", () => ({
  Terminal: ({
    workspaceId,
    terminalIndex,
    onReady,
  }: {
    workspaceId: string;
    terminalIndex: number;
    onReady?: () => void;
  }) => (
    <div data-testid="terminal" data-workspace={workspaceId} data-index={terminalIndex}>
      Terminal {terminalIndex}
      <button type="button" onClick={onReady}>Signal terminal {terminalIndex} ready</button>
    </div>
  ),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

const alpha = {
  id: "alpha-id",
  name: "Alpha",
  projectPath: "/root/alpha",
  terminalCount: 4 as const,
  createdAt: "2026-07-22T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
};

const rootListing = {
  root: "/root",
  current: "/root",
  parent: "/root",
  directories: [],
};

function response(body: unknown, status = 200) {
  return Promise.resolve(new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  }));
}

function renderApp() {
  return render(
    <TooltipProvider>
      <App />
    </TooltipProvider>,
  );
}

describe("App persistent workspaces", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("restores a saved workspace into an independent terminal grid", async () => {
    vi.mocked(fetch).mockImplementation((input) =>
      response(String(input).startsWith("/api/directories") ? rootListing : [alpha]),
    );
    renderApp();

    expect(await screen.findByRole("button", { name: "Alpha" })).toBeTruthy();
    expect(await screen.findAllByTestId("terminal")).toHaveLength(4);
    expect(screen.getAllByTestId("connecting-panel")).toHaveLength(4);

    await userEvent.setup().click(screen.getByRole("button", { name: "Signal terminal 0 ready" }));
    expect(screen.getAllByTestId("connecting-panel")).toHaveLength(3);
  });

  it("creates a workspace through the server and selects it", async () => {
    vi.mocked(fetch).mockImplementation((input, init) => {
      if (String(input).startsWith("/api/directories")) return response(rootListing);
      if (init?.method === "POST") return response(alpha, 201);
      return response([]);
    });
    renderApp();

    expect(await screen.findByRole("heading", { name: "Set up your workspace" })).toBeTruthy();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Workspace name"), "Alpha");
    await user.click(screen.getByRole("radio", { name: "4 terminals" }));
    await user.click(screen.getByRole("button", { name: "Create workspace" }));

    await waitFor(() => expect(screen.getAllByTestId("terminal")).toHaveLength(4));
    expect(screen.getByRole("button", { name: "Alpha" })).toBeTruthy();
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/workspaces",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("deletes the active workspace through the server", async () => {
    vi.mocked(fetch).mockImplementation((input, init) => {
      if (String(input).startsWith("/api/directories")) return response(rootListing);
      if (init?.method === "DELETE") return response(null, 204);
      return response([alpha]);
    });
    renderApp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Delete Alpha" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Alpha" })).toBeNull());
    expect(screen.getByRole("heading", { name: "Set up your workspace" })).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith("/api/workspaces/alpha-id", { method: "DELETE" });
  });
});
