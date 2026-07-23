export const TERMINAL_COUNTS = [1, 2, 4, 6, 8, 10, 12] as const;
export type TerminalCount = (typeof TERMINAL_COUNTS)[number];

export type TerminalLayout = {
  count: TerminalCount;
  columns: number;
  rows: number;
};

const layouts: Record<TerminalCount, Omit<TerminalLayout, "count">> = {
  1: { columns: 1, rows: 1 },
  2: { columns: 2, rows: 1 },
  4: { columns: 2, rows: 2 },
  6: { columns: 3, rows: 2 },
  8: { columns: 4, rows: 2 },
  10: { columns: 5, rows: 2 },
  12: { columns: 4, rows: 3 },
};

export const TERMINAL_LAYOUTS: readonly TerminalLayout[] = TERMINAL_COUNTS.map(
  (count) => ({ count, ...layouts[count] }),
);

export function getWorkspaceGrid(count: TerminalCount) {
  return layouts[count];
}
