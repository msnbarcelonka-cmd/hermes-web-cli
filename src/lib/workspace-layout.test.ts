import { describe, expect, it } from "vitest";

import { getWorkspaceGrid } from "@/lib/workspace-layout";

describe("getWorkspaceGrid", () => {
  it.each([
    [1, 1, 1],
    [2, 2, 1],
    [4, 2, 2],
    [6, 3, 2],
    [8, 4, 2],
    [10, 5, 2],
    [12, 4, 3],
  ] as const)("maps %i terminals to a %ix%i grid", (count, columns, rows) => {
    expect(getWorkspaceGrid(count)).toEqual({ columns, rows });
  });
});
