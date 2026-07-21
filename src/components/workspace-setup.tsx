const layouts = [
  { count: 1, columns: 1, rows: 1 },
  { count: 2, columns: 2, rows: 1 },
  { count: 4, columns: 2, rows: 2 },
  { count: 6, columns: 3, rows: 2 },
  { count: 8, columns: 4, rows: 2 },
  { count: 10, columns: 5, rows: 2 },
  { count: 12, columns: 4, rows: 3 },
] as const;

const selectedCount = 6;

function LayoutIcon({
  columns,
  count,
}: {
  columns: number;
  count: number;
}) {
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
  const selected = layouts.find((layout) => layout.count === selectedCount)!;

  return (
    <main className="size-full overflow-auto bg-[#282735] text-[#e5e3eb]">
      <div className="mx-auto flex min-h-full w-full max-w-5xl items-start px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
        <div className="w-full">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Set up your workspace
          </h1>

          <section className="mt-10" aria-labelledby="terminal-count-heading">
            <div className="flex max-w-[50rem] flex-wrap items-center gap-x-2 gap-y-3">
              <h2 id="terminal-count-heading" className="text-sm font-semibold">
                How many terminals?
              </h2>
              <p className="text-xs text-[#817e8b]">Tap a tile to choose a layout</p>
              <div className="ml-auto flex items-center gap-2 text-xs">
                <span className="rounded-md bg-[#d8669917] px-2 py-1 font-medium text-[#dd6fa1]">
                  {selected.count} terminals
                </span>
                <span className="text-[#817e8b]">
                  {selected.columns}×{selected.rows} grid
                </span>
              </div>
            </div>

            <div className="mt-3 grid max-w-[50rem] grid-cols-4 gap-2 sm:grid-cols-7">
              {layouts.map((layout) => {
                const isSelected = layout.count === selectedCount;

                return (
                  <button
                    key={layout.count}
                    type="button"
                    aria-label={`${layout.count} terminals`}
                    aria-pressed={isSelected}
                    className={
                      "flex h-20 min-w-0 flex-col items-center justify-center gap-3 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d86699] " +
                      (isSelected
                        ? "border-[#c95f8f] bg-[#302936] text-[#dd6fa1] shadow-[0_0_0_1px_rgba(216,102,153,0.08),inset_0_0_14px_rgba(216,102,153,0.025)]"
                        : "border-white/[0.025] bg-[#292836] text-[#d2d0d9]")
                    }
                  >
                    <span className={isSelected ? "text-[#dc6b9e]" : "text-[#454250]"}>
                      <LayoutIcon columns={layout.columns} count={layout.count} />
                    </span>
                    <span className="text-xs font-semibold">{layout.count}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
