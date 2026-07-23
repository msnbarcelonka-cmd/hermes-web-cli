import { useState, type FormEvent } from "react";

import { DirectoryPicker } from "@/components/directory-picker";
import { AnimatedCreateButton } from "@/components/ui/animated-create-button";
import { BackgroundImageTexture } from "@/components/ui/background-image-texture";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  TERMINAL_LAYOUTS,
  type TerminalCount,
  type TerminalLayout,
} from "@/lib/workspace-layout";

function LayoutIcon({ columns, rows, count }: TerminalLayout) {
  return (
    <span
      aria-hidden="true"
      className="grid h-7 w-12 gap-[3px]"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className="rounded-[2px] bg-current opacity-60 transition-opacity duration-150 group-hover/tile:opacity-80 group-data-[state=on]/tile:opacity-100"
        />
      ))}
    </span>
  );
}

export function WorkspaceSetup({
  onCreate,
  isSubmitting = false,
  error = "",
}: {
  onCreate?: (
    name: string,
    terminalCount: TerminalCount,
    projectPath: string,
  ) => void | Promise<void>;
  isSubmitting?: boolean;
  error?: string;
}) {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [projectPath, setProjectPath] = useState("/root");
  const [selectedCount, setSelectedCount] = useState<TerminalCount>(6);
  const selected = TERMINAL_LAYOUTS.find(
    (layout) => layout.count === selectedCount,
  )!;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedPath = projectPath.trim();
    if (!trimmedName) {
      setNameError("Enter a workspace name.");
      return;
    }
    setNameError("");
    if (trimmedPath.startsWith("/")) {
      onCreate?.(trimmedName, selectedCount, trimmedPath);
    }
  };

  return (
    <BackgroundImageTexture
      opacity={0.1}
      className="size-full overflow-auto bg-background text-foreground"
    >
      <main className="mx-auto flex min-h-full w-full max-w-xl flex-col justify-center px-6 py-12 sm:px-8">
        <form
          onSubmit={submit}
          className="animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none"
        >
          <header>
            <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
              <span
                aria-hidden="true"
                className="inline-block size-1.5 bg-sidebar-primary"
              />
              new workspace
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Set up your{" "}
              <span
                data-workspace-highlight="true"
                className="animate-work-gradient ml-1 font-minecraft text-[0.92em]"
              >
                workspace
              </span>
            </h1>
          </header>

          <div className="mt-10 grid gap-6">
            <div className="grid gap-2.5">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                id="workspace-name"
                autoFocus
                autoComplete="off"
                aria-invalid={Boolean(nameError)}
                maxLength={64}
                placeholder="My workspace"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameError("");
                }}
              />
              {nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
            </div>

            <div className="grid gap-2.5">
              <Label htmlFor="project-location">Project location</Label>
              <DirectoryPicker value={projectPath} onChange={setProjectPath} />
              <p className="text-xs text-muted-foreground/80">
                Choose an existing server folder for this workspace.
              </p>
            </div>
          </div>

          <section className="mt-10" aria-labelledby="terminal-count-heading">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <h2
                id="terminal-count-heading"
                className="font-mono text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground"
              >
                How many terminals?
              </h2>
              <p className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
                <span className="text-foreground">
                  {selected.count} terminals
                </span>
                <span className="mx-1.5 text-muted-foreground/50">·</span>
                <span>
                  {selected.columns}×{selected.rows} grid
                </span>
              </p>
            </div>

            <ToggleGroup
              type="single"
              value={String(selectedCount)}
              onValueChange={(value) => {
                if (value) setSelectedCount(Number(value) as TerminalCount);
              }}
              aria-label="Terminal layout"
              className="mt-3 grid w-full grid-cols-4 gap-2 sm:grid-cols-7"
            >
              {TERMINAL_LAYOUTS.map((layout) => (
                <ToggleGroupItem
                  key={layout.count}
                  value={String(layout.count)}
                  aria-label={`${layout.count} terminals`}
                  className="group/tile h-[4.5rem] min-w-0 flex-col gap-2.5 rounded-lg border border-border bg-transparent px-0 text-muted-foreground transition-colors duration-150 hover:border-foreground/25 hover:bg-foreground/[0.04] hover:text-foreground focus-visible:border-sidebar-ring focus-visible:ring-sidebar-ring/40 data-[state=on]:border-sidebar-primary data-[state=on]:bg-sidebar-primary/10 data-[state=on]:text-sidebar-primary"
                >
                  <LayoutIcon {...layout} />
                  <span className="font-mono text-[11px] font-medium tabular-nums">
                    {layout.count}
                  </span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>

          <div className="mt-12">
            {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
            <AnimatedCreateButton
              type="submit"
              aria-label="Create workspace"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating workspace…" : "Create workspace"}
            </AnimatedCreateButton>
          </div>
        </form>
      </main>
    </BackgroundImageTexture>
  );
}
