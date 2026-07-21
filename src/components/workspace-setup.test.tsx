// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { WorkspaceSetup } from "@/components/workspace-setup";

describe("WorkspaceSetup", () => {
  afterEach(cleanup);

  it("shows every terminal layout with six selected", () => {
    render(<WorkspaceSetup />);

    expect(screen.getByRole("heading", { name: "Set up your workspace" })).toBeTruthy();
    expect(screen.getByText("How many terminals?")).toBeTruthy();

    for (const count of [1, 2, 4, 6, 8, 10, 12]) {
      expect(screen.getByRole("radio", { name: `${count} terminals` })).toBeTruthy();
    }

    expect(screen.getByRole("radio", { name: "6 terminals" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("3×2 grid")).toBeTruthy();
  });

  it("changes the selected terminal layout", async () => {
    const user = userEvent.setup();
    render(<WorkspaceSetup />);

    const six = screen.getByRole("radio", { name: "6 terminals" });
    const ten = screen.getByRole("radio", { name: "10 terminals" });
    await user.click(ten);

    expect(six.getAttribute("aria-checked")).toBe("false");
    expect(ten.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("5×2 grid")).toBeTruthy();
  });
});
