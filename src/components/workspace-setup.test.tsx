// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WorkspaceSetup } from "@/components/workspace-setup";

describe("WorkspaceSetup", () => {
  afterEach(cleanup);

  it("shows every terminal layout with six selected", () => {
    render(<WorkspaceSetup />);

    expect(screen.getByRole("heading", { name: "Set up your workspace" })).toBeTruthy();
    expect(screen.getByText("How many terminals?")).toBeTruthy();

    for (const count of [1, 2, 4, 6, 8, 10, 12]) {
      expect(screen.getByRole("button", { name: `${count} terminals` })).toBeTruthy();
    }

    expect(screen.getByRole("button", { name: "6 terminals" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("3×2 grid")).toBeTruthy();
  });
});
