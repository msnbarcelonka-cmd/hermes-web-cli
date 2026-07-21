import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon,
  FolderPlusIcon,
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
  const [openRequested, setOpenRequested] = useState(false);
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [history, setHistory] = useState<DirectoryListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderError, setFolderError] = useState("");
  const [submittingFolder, setSubmittingFolder] = useState(false);
  const [pathValue, setPathValue] = useState(value);
  const [pathError, setPathError] = useState("");
  const listingRef = useRef<DirectoryListing | null>(null);
  const cacheRef = useRef(new Map<string, DirectoryListing>());
  const requestRef = useRef(new Map<string, Promise<DirectoryListing>>());

  const showListing = (next: DirectoryListing) => {
    listingRef.current = next;
    setListing(next);
  };

  const loadDirectory = async (path: string, rememberCurrent = true) => {
    setLoading(true);
    setError("");

    try {
      let next = cacheRef.current.get(path);
      if (!next) {
        let request = requestRef.current.get(path);
        if (!request) {
          request = fetch(`/api/directories?path=${encodeURIComponent(path)}`)
            .then(async (response) => {
              const body = await response.json();
              if (!response.ok) {
                throw new Error(body.error || "Unable to read directory");
              }
              return body as DirectoryListing;
            })
            .finally(() => requestRef.current.delete(path));
          requestRef.current.set(path, request);
        }
        next = await request;
        cacheRef.current.set(path, next);
      }

      const current = listingRef.current;
      if (rememberCurrent && current && current.current !== next.current) {
        setHistory((items) => [...items, current]);
      }
      showListing(next);
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
    void loadDirectory(BROWSE_ROOT, false);
  }, []);

  useEffect(() => setPathValue(value), [value]);

  const validatePath = async () => {
    const path = pathValue.trim();
    if (path !== BROWSE_ROOT && !path.startsWith(`${BROWSE_ROOT}/`)) {
      setPathError(`Choose an existing directory inside ${BROWSE_ROOT}.`);
      return;
    }

    try {
      let next = cacheRef.current.get(path);
      if (!next) {
        const response = await fetch(
          `/api/directories?path=${encodeURIComponent(path)}`,
        );
        const body = await response.json();
        if (!response.ok) throw new Error();
        next = body as DirectoryListing;
        cacheRef.current.set(path, next);
      }
      setPathValue(next.current);
      setPathError("");
      onChange(next.current);
    } catch {
      setPathError(`Choose an existing directory inside ${BROWSE_ROOT}.`);
    }
  };

  const goBack = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((items) => items.slice(0, -1));
    showListing(previous);
    setError("");
  };

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

  const browserHeight = !listing && loading
    ? 256
    : error || !listing?.directories.length
      ? 192
      : Math.min(320, Math.max(144, listing.directories.length * 44 + 24));

  const selectCurrent = () => {
    if (!listing) return;
    onChange(listing.current);
    setOpenRequested(false);
  };

  const createFolder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!listing || !folderName.trim()) return;

    setSubmittingFolder(true);
    setFolderError("");

    try {
      const response = await fetch("/api/directories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent: listing.current, name: folderName }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Unable to create folder");
      }

      setCreatingFolder(false);
      setFolderName("");
      cacheRef.current.delete(body.path);
      await loadDirectory(body.path);
    } catch (requestError) {
      setFolderError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create folder",
      );
    } finally {
      setSubmittingFolder(false);
    }
  };

  return (
    <>
      <div className="space-y-1">
        <div className="flex gap-2">
          <Input
            id="project-location"
            aria-label="Project location"
            aria-invalid={Boolean(pathError)}
            autoComplete="off"
            required
            spellCheck={false}
            value={pathValue}
            onChange={(event) => {
              setPathValue(event.target.value);
              setPathError("");
            }}
            onBlur={() => void validatePath()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void validatePath();
              }
            }}
            className="font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            aria-label="Browse directories"
            onClick={() => setOpenRequested(true)}
          >
            <FolderOpenIcon />
            Browse
          </Button>
        </div>
        {pathError && <p className="text-xs text-destructive">{pathError}</p>}
      </div>

      <Dialog
        open={openRequested && Boolean(listing)}
        onOpenChange={setOpenRequested}
      >
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

          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Go back"
              disabled={!history.length || loading}
              onClick={goBack}
            >
              <ArrowLeftIcon />
            </Button>
            <div className="min-w-0 flex-1 px-2">
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
            {loading && listing && (
              <LoaderCircleIcon
                aria-label="Loading directory"
                className="size-4 animate-spin text-muted-foreground"
              />
            )}
          </div>

          <ScrollArea style={{ height: browserHeight }}>
            <div className="p-3">
              {creatingFolder && (
                <form className="mb-2 space-y-1" onSubmit={createFolder}>
                  <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent px-3 py-1.5">
                    <FolderIcon className="size-4 shrink-0 text-sidebar-primary" />
                    <Input
                      aria-label="New folder name"
                      autoFocus
                      autoComplete="off"
                      maxLength={64}
                      value={folderName}
                      disabled={submittingFolder}
                      onChange={(event) => setFolderName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          setCreatingFolder(false);
                          setFolderName("");
                          setFolderError("");
                        }
                      }}
                    />
                  </div>
                  {folderError && (
                    <p className="px-3 text-xs text-destructive">{folderError}</p>
                  )}
                </form>
              )}
              {loading && !listing ? (
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
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!listing || loading || creatingFolder || Boolean(error)}
                onClick={() => {
                  setCreatingFolder(true);
                  setFolderError("");
                }}
              >
                <FolderPlusIcon />
                New folder
              </Button>
              <Button
                type="button"
                disabled={!listing || loading || Boolean(error)}
                onClick={selectCurrent}
              >
                Select this folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
