import { lazy, Suspense, useCallback, useState } from "react";

import { getWorkspaceGrid } from "@/lib/workspace-layout";
import type { Workspace } from "@/lib/workspaces";

const Terminal = lazy(() =>
  import("@/components/terminal").then(({ Terminal }) => ({ default: Terminal })),
);

type PaneState = "connecting" | "ready" | "error";

function PaneOverlay({ state }: { state: PaneState }) {
  if (state === "ready") return null;

  return (
    <div
      data-testid={state === "error" ? "terminal-error" : "connecting-panel"}
      className="absolute inset-0 z-10 bg-terminal px-3 py-2.5 font-mono text-sm text-[#f0e6d2]"
    >
      <div className="flex items-center gap-2 leading-[1.15]">
        <span className="h-4 w-1.5 bg-sidebar-primary" />
        <strong>mist</strong>
        <span className="text-[#f0e6d2]/45">v1.0.0</span>
      </div>
      <p className="mt-1 leading-[1.15] text-[#f0e6d2]/45">
        {state === "error" ? (
          "connection failed"
        ) : (
          <>connecting to hermes<span className="animate-cursor-blink">…</span></>
        )}
      </p>
    </div>
  );
}

function TerminalPane({ workspace, index }: { workspace: Workspace; index: number }) {
  const [state, setState] = useState<PaneState>("connecting");

  return (
    <div className="relative min-h-0 min-w-0 overflow-hidden rounded-lg border bg-terminal">
      <PaneOverlay state={state} />
      <Suspense fallback={null}>
        <Terminal
          workspaceId={workspace.id}
          terminalIndex={index}
          onReady={useCallback(() => setState("ready"), [])}
          onError={useCallback(() => setState("error"), [])}
        />
      </Suspense>
    </div>
  );
}

export function WorkspaceGrid({ workspace }: { workspace: Workspace }) {
  const { columns, rows } = getWorkspaceGrid(workspace.terminalCount);

  return (
    <div className="absolute inset-0 p-2 sm:p-2.5">
      <div
        data-testid="workspace-grid"
        className="grid size-full min-h-0 min-w-0 gap-2"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: workspace.terminalCount }, (_, index) => (
          <TerminalPane key={`${workspace.id}:${index}`} workspace={workspace} index={index} />
        ))}
      </div>
    </div>
  );
}
