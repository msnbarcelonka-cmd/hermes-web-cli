import { useState } from "react";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

const layouts = [
  { count: 1, columns: 1, rows: 1 },
  { count: 2, columns: 2, rows: 1 },
  { count: 4, columns: 2, rows: 2 },
  { count: 6, columns: 3, rows: 2 },
  { count: 8, columns: 4, rows: 2 },
  { count: 10, columns: 5, rows: 2 },
  { count: 12, columns: 4, rows: 3 },
] as const;

type LayoutCount = (typeof layouts)[number]["count"];

function LayoutIcon({ columns, count }: { columns: number; count: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${columns}, 0.375rem)` }}
    >
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="size-1.5 rounded-[2px] bg-current" />
      ))}
    </span>
  );
}

export function WorkspaceSetup() {
  const [selectedCount, setSelectedCount] = useState<LayoutCount>(6);
  const selected = layouts.find((layout) => layout.count === selectedCount)!;

  return (
    <main className="size-full overflow-auto bg-sidebar text-sidebar-foreground">
      <div className="mx-auto min-h-full w-full max-w-5xl px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
        <h1 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Set up your workspace
        </h1>

        <section className="mt-10" aria-labelledby="terminal-count-heading">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
            <h2 id="terminal-count-heading" className="text-sm font-semibold">
              How many terminals?
            </h2>
            <p className="text-xs text-muted-foreground">
              Tap a tile to choose a layout
            </p>
            <div className="ml-auto flex items-center gap-2 text-xs">
              <span className="rounded-md bg-sidebar-primary px-2 py-1 font-medium text-sidebar-primary-foreground">
                {selected.count} terminals
              </span>
              <span className="text-muted-foreground">
                {selected.columns}×{selected.rows} grid
              </span>
            </div>
          </div>

          <ToggleGroup
            type="single"
            value={String(selectedCount)}
            onValueChange={(value) => {
              if (value) setSelectedCount(Number(value) as LayoutCount);
            }}
            aria-label="Terminal layout"
            className="mt-3 grid w-full grid-cols-4 gap-2 sm:grid-cols-7"
          >
            {layouts.map((layout) => (
              <ToggleGroupItem
                key={layout.count}
                value={String(layout.count)}
                aria-label={`${layout.count} terminals`}
                className="h-20 min-w-0 flex-col gap-3 rounded-lg border border-sidebar-border bg-sidebar px-0 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:border-sidebar-ring focus-visible:ring-sidebar-ring/50 data-[state=on]:border-sidebar-primary data-[state=on]:bg-sidebar-primary data-[state=on]:text-sidebar-primary-foreground"
              >
                <LayoutIcon columns={layout.columns} count={layout.count} />
                <span className="text-xs font-semibold">{layout.count}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>
      </div>
    </main>
  );
}
