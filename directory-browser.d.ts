export type DirectoryEntry = {
  name: string;
  path: string;
};

export type DirectoryListing = {
  root: string;
  current: string;
  parent: string;
  directories: DirectoryEntry[];
};

export function createDirectory(
  parentPath: string,
  name: string,
  browseRoot?: string,
): Promise<string>;

export function listDirectories(
  requestedPath: string,
  browseRoot?: string,
): Promise<DirectoryListing>;
