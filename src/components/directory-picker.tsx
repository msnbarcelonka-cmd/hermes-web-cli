import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon,
  LoaderCircleIcon,
  ServerIcon,
} from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const BROWSE_ROOT = "/root";

type DirectoryEntry = { name: string; path: string };
type DirectoryListing = {
  root: string;
  current: string;
  parent: string;
  directories: DirectoryEntry[];
};

type DirectoryPickerProps = {
  value: string;
  onChange: (path: string) => void;
};

export function DirectoryPicker({ value, onChange }: DirectoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/directories?path=${encodeURIComponent(path)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to read directory");
      setListing(body);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to read directory",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void loadDirectory(BROWSE_ROOT);
  }, [open]);

  const breadcrumbs = useMemo(() => {
    if (!listing) return [];
    const relativePath = listing.current.slice(listing.root.length);
    const segments = relativePath.split("/").filter(Boolean);
    const rootName = listing.root;

    return [
      { name: rootName, path: listing.root },
      ...segments.map((name, index) => ({
        name,
        path: `${listing.root}/${segments.slice(0, index + 1).join("/")}`,
      })),
    ];
  }, [listing]);

  const browserHeight = loading
    ? 256
    : error || !listing?.directories.length
      ? 192
      : Math.min(320, Math.max(144, listing.directories.length * 44 + 24));

  const selectCurrent = () => {
    if (!listing) return;
    onChange(listing.current);
    setOpen(false);
  };

  return (
    <>
      <div className="flex gap-2">
        <Input
          id="project-location"
          aria-label="Project location"
          autoComplete="off"
          readOnly
          required
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          aria-label="Browse directories"
          onClick={() => setOpen(true)}
        >
          <FolderOpenIcon />
          Browse
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                <ServerIcon className="size-4" />
              </div>
              <div className="min-w-0 space-y-1">
                <DialogTitle>Choose project location</DialogTitle>
                <DialogDescription>
                  Select a directory on this server for your workspace.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="border-b border-border px-6 py-3">
            {listing ? (
              <Breadcrumb>
                <BreadcrumbList className="flex-nowrap overflow-hidden">
                  {breadcrumbs.map((crumb, index) => {
                    const current = index === breadcrumbs.length - 1;
                    return (
                      <Fragment key={crumb.path}>
                        {index > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem className="min-w-0">
                          {current ? (
                            <BreadcrumbPage className="truncate">
                              {crumb.name}
                            </BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink asChild>
                              <button
                                type="button"
                                className="truncate"
                                onClick={() => void loadDirectory(crumb.path)}
                              >
                                {crumb.name}
                              </button>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </Fragment>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            ) : (
              <span className="text-sm text-muted-foreground">/root</span>
            )}
          </div>

          <ScrollArea style={{ height: browserHeight }}>
            <div className="p-3">
              {loading ? (
                <div className="flex min-h-40 items-center justify-center text-muted-foreground">
                  <LoaderCircleIcon className="size-5 animate-spin" />
                  <span className="sr-only">Loading directories</span>
                </div>
              ) : error ? (
                <div className="flex min-h-40 items-center justify-center px-6 text-center text-sm text-destructive">
                  {error}
                </div>
              ) : listing?.directories.length ? (
                <div className="grid gap-1">
                  {listing.directories.map((directory) => (
                    <button
                      key={directory.path}
                      type="button"
                      aria-label={`Open ${directory.name}`}
                      onClick={() => void loadDirectory(directory.path)}
                      className="group flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    >
                      <FolderIcon className="size-4 shrink-0 text-sidebar-primary" />
                      <span className="min-w-0 flex-1 truncate">{directory.name}</span>
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
                  <FolderOpenIcon className="size-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium">This folder is empty</p>
                  <p className="text-xs text-muted-foreground">
                    You can select it as the project location.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
              {listing?.current || BROWSE_ROOT}
            </p>
            <Button
              type="button"
              className="shrink-0"
              disabled={!listing || loading || Boolean(error)}
              onClick={selectCurrent}
            >
              Select this folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
