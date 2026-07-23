import { describe, expect, it } from "vitest";

import {
  getWorkspaceGrid,
  TERMINAL_COUNTS,
  TERMINAL_LAYOUTS,
} from "@/lib/workspace-layout";

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

describe("TERMINAL_LAYOUTS", () => {
  it("exposes one entry per terminal count", () => {
    expect(TERMINAL_LAYOUTS.map((l) => l.count)).toEqual([...TERMINAL_COUNTS]);
  });

  it("matches getWorkspaceGrid for every count", () => {
    for (const { count, columns, rows } of TERMINAL_LAYOUTS) {
      expect(getWorkspaceGrid(count)).toEqual({ columns, rows });
    }
  });
});
