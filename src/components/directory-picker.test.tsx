// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FormEvent } from "react";

import { DirectoryPicker } from "@/components/directory-picker";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const listing = (
  current: string,
  directories: Array<{ name: string; path: string }> = [],
) => ({
  root: "/root",
  current,
  parent: current === "/root" ? "/root" : current.slice(0, current.lastIndexOf("/")) || "/root",
  directories,
});

const response = (body: unknown) => ({
  ok: true,
  json: async () => body,
});

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

describe("DirectoryPicker", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  it("preloads directories before opening the stable dialog", async () => {
    const user = userEvent.setup();
    let resolveFetch!: (value: ReturnType<typeof response>) => void;
    const fetchMock = vi.fn(() =>
      new Promise<ReturnType<typeof response>>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<DirectoryPicker value="/root" onChange={vi.fn()} />);
    expect(fetchMock).toHaveBeenCalledWith("/api/directories?path=%2Froot");

    await user.click(screen.getByRole("button", { name: "Browse directories" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    resolveFetch(
      response(
        listing("/root", [{ name: "projects", path: "/root/projects" }]),
      ),
    );

    expect(await screen.findByRole("button", { name: "Open projects" })).toBeTruthy();
    expect(screen.queryByText("Loading directories")).toBeNull();
  });

  it("navigates back through visited directories without closing", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(
          listing("/root", [{ name: "projects", path: "/root/projects" }]),
        ),
      )
      .mockResolvedValueOnce(response(listing("/root/projects")));
    vi.stubGlobal("fetch", fetchMock);

    render(<DirectoryPicker value="/root" onChange={vi.fn()} />);
    await screen.findByRole("button", { name: "Browse directories" });
    await user.click(screen.getByRole("button", { name: "Browse directories" }));
    await user.click(screen.getByRole("button", { name: "Open projects" }));
    expect(await screen.findByText("/root/projects")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByRole("button", { name: "Open projects" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "/root" })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("accepts a manually entered existing directory", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(listing("/root")))
      .mockResolvedValueOnce(response(listing("/root/projects")));
    vi.stubGlobal("fetch", fetchMock);

    render(<DirectoryPicker value="/root" onChange={onChange} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const input = screen.getByLabelText("Project location");
    await user.clear(input);
    await user.type(input, "/root/projects{Enter}");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/directories?path=%2Froot%2Fprojects",
      );
      expect(onChange).toHaveBeenCalledWith("/root/projects");
    });
    expect(screen.queryByText("Choose an existing directory inside /root.")).toBeNull();
  });

  it("rejects a manual path outside the browse root", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const fetchMock = vi.fn().mockResolvedValueOnce(response(listing("/root")));
    vi.stubGlobal("fetch", fetchMock);

    render(<DirectoryPicker value="/root" onChange={onChange} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const input = screen.getByLabelText("Project location");
    await user.clear(input);
    await user.type(input, "/tmp{Enter}");

    expect(await screen.findByText("Choose an existing directory inside /root.")).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("creates a folder and enters it immediately", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(listing("/root")))
      .mockResolvedValueOnce(response({ path: "/root/New project" }))
      .mockResolvedValueOnce(response(listing("/root/New project")));
    vi.stubGlobal("fetch", fetchMock);

    render(<DirectoryPicker value="/root" onChange={vi.fn()} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "Browse directories" }));
    await user.click(screen.getByRole("button", { name: "New folder" }));
    await user.type(screen.getByLabelText("New folder name"), "New project{Enter}");

    await waitFor(() =>
      expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/directories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent: "/root", name: "New project" }),
      }),
    );
    expect(await screen.findByText("/root/New project")).toBeTruthy();
    expect(screen.queryByLabelText("New folder name")).toBeNull();
  });

  it("creates a folder by clicking the inline action", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(listing("/root")))
      .mockResolvedValueOnce(response({ path: "/root/Clicked folder" }))
      .mockResolvedValueOnce(response(listing("/root/Clicked folder")));
    vi.stubGlobal("fetch", fetchMock);

    render(<DirectoryPicker value="/root" onChange={vi.fn()} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "Browse directories" }));
    await user.click(screen.getByRole("button", { name: "New folder" }));
    await user.type(screen.getByLabelText("New folder name"), "Clicked folder");
    await user.click(screen.getByRole("button", { name: "Create folder" }));

    expect(await screen.findByText("/root/Clicked folder")).toBeTruthy();
  });

  it("returns to the created folder and restores focus", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(listing("/root")))
      .mockResolvedValueOnce(response({ path: "/root/Focused folder" }))
      .mockResolvedValueOnce(response(listing("/root/Focused folder")));
    vi.stubGlobal("fetch", fetchMock);

    render(<DirectoryPicker value="/root" onChange={vi.fn()} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "Browse directories" }));
    await user.click(screen.getByRole("button", { name: "New folder" }));
    await user.type(screen.getByLabelText("New folder name"), "Focused folder{Enter}");
    await screen.findByText("/root/Focused folder");
    await user.click(screen.getByRole("button", { name: "Go back" }));

    const folder = screen.getByRole("button", { name: "Open Focused folder" });
    expect(document.activeElement).toBe(folder);
  });

  it("does not submit the workspace form when folder creation uses Enter", async () => {
    const user = userEvent.setup();
    const outerSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(listing("/root")))
      .mockResolvedValueOnce(response({ path: "/root/Inner folder" }))
      .mockResolvedValueOnce(response(listing("/root/Inner folder")));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <form onSubmit={outerSubmit}>
        <DirectoryPicker value="/root" onChange={vi.fn()} />
      </form>,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "Browse directories" }));
    await user.click(screen.getByRole("button", { name: "New folder" }));
    await user.type(screen.getByLabelText("New folder name"), "Inner folder{Enter}");
    await screen.findByText("/root/Inner folder");

    expect(outerSubmit).not.toHaveBeenCalled();
  });
});
