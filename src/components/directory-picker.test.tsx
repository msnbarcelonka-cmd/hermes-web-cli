// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DirectoryPicker } from "@/components/directory-picker";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

describe("DirectoryPicker", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  it("browses server directories and selects the current folder", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          root: "/root",
          current: "/root",
          parent: "/root",
          directories: [{ name: "projects", path: "/root/projects" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          root: "/root",
          current: "/root/projects",
          parent: "/root",
          directories: [],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DirectoryPicker
        value="/root/workspaces/alpha"
        onChange={onChange}
      />,
    );

    expect(
      (screen.getByLabelText("Project location") as HTMLInputElement).readOnly,
    ).toBe(true);

    await user.click(screen.getByRole("button", { name: "Browse directories" }));
    expect(await screen.findByRole("heading", { name: "Choose project location" })).toBeTruthy();
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/directories?path=%2Froot");

    await user.click(screen.getByRole("button", { name: "Open projects" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/directories?path=%2Froot%2Fprojects",
      ),
    );

    await user.click(screen.getByRole("button", { name: "Select this folder" }));
    expect(onChange).toHaveBeenCalledWith("/root/projects");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
