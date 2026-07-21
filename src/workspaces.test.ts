import { describe, expect, it } from "vitest";

import { addWorkspace } from "./workspaces";

describe("addWorkspace", () => {
  it("appends a trimmed workspace name", () => {
    expect(addWorkspace(["Alpha"], "  Beta  ")).toEqual(["Alpha", "Beta"]);
  });

  it("ignores blank names", () => {
    expect(addWorkspace(["Alpha"], "   ")).toEqual(["Alpha"]);
  });
});
