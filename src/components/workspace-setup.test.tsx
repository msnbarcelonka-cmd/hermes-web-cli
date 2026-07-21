// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { WorkspaceSetup } from "@/components/workspace-setup";

describe("WorkspaceSetup", () => {
  afterEach(cleanup);

  it("shows every terminal layout with six selected", () => {
    render(<WorkspaceSetup />);

    const heading = screen.getByRole("heading", { name: "Set up your workspace" });
    expect(heading).toBeTruthy();
    const workspace = heading.querySelector('[data-workspace-highlight="true"]');
    expect(workspace?.textContent).toBe("workspace");
    expect(workspace?.className).toContain("font-minecraft");
    expect(workspace?.className).toContain("animate-work-gradient");
    expect(workspace?.className).toContain("ml-");

    const name = screen.getByLabelText("Workspace name");
    expect(name.hasAttribute("required")).toBe(true);
    const terminalHeading = screen.getByText("How many terminals?");
    expect(heading.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(name.compareDocumentPosition(terminalHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const create = screen.getByRole("button", { name: "Create workspace" });
    expect(create.hasAttribute("disabled")).toBe(false);
    expect(create.className).toContain("font-sans");
    expect(create.querySelector('[data-gradient="spin-slow"]')).toBeTruthy();
    const surface = create.querySelector('[data-button-surface="true"]');
    expect(surface).toBeTruthy();
    expect(surface?.className).not.toContain("bg-sidebar");
    expect(surface?.className).toContain("text-sidebar-primary-foreground");
    expect(screen.getByText("How many terminals?")).toBeTruthy();

    for (const count of [1, 2, 4, 6, 8, 10, 12]) {
      expect(screen.getByRole("radio", { name: `${count} terminals` })).toBeTruthy();
    }

    expect(screen.getByRole("radio", { name: "6 terminals" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("3×2 grid")).toBeTruthy();

    const texture = document.querySelector('[data-texture="groovepaper"]') as HTMLElement;
    expect(texture).toBeTruthy();
    expect(texture.getAttribute("aria-hidden")).toBe("true");
    expect(texture.className).toContain("pointer-events-none");
    expect(texture.style.opacity).toBe("0.1");
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
