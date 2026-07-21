import { mkdir, readdir, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function isWithin(root, target) {
  const pathFromRoot = relative(root, target);
  return pathFromRoot === "" || (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== "..");
}

export async function listDirectories(requestedPath, browseRoot = "/root") {
  if (!isAbsolute(requestedPath)) {
    throw new TypeError("Directory path must be absolute");
  }

  const root = await realpath(resolve(browseRoot));
  const current = await realpath(resolve(requestedPath));

  if (!isWithin(root, current)) {
    throw new RangeError("Directory path is outside the browse root");
  }

  const pathFromRoot = relative(root, current);
  if (pathFromRoot.split(sep).some((segment) => segment.startsWith("."))) {
    throw new RangeError("Directory path contains a hidden segment");
  }

  const currentStat = await stat(current);
  if (!currentStat.isDirectory()) {
    throw new TypeError("Directory path must point to a directory");
  }

  const entries = await readdir(current, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => ({ name: entry.name, path: join(current, entry.name) }))
    .sort((a, b) => collator.compare(a.name, b.name));

  const parentCandidate = resolve(current, "..");

  return {
    root,
    current,
    parent: isWithin(root, parentCandidate) ? parentCandidate : root,
    directories,
  };
}

export async function createDirectory(parentPath, name, browseRoot = "/root") {
  const trimmedName = name.trim();
  if (
    !trimmedName ||
    trimmedName.length > 64 ||
    trimmedName.startsWith(".") ||
    trimmedName === ".." ||
    /[/\\\0]/.test(trimmedName)
  ) {
    throw new TypeError("Folder name is invalid");
  }

  const parent = await listDirectories(parentPath, browseRoot);
  const createdPath = join(parent.current, trimmedName);
  await mkdir(createdPath);
  return createdPath;
}
