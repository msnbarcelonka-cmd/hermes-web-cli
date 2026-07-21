export function addWorkspace(workspaces: string[], name: string) {
  const trimmedName = name.trim();
  return trimmedName ? [...workspaces, trimmedName] : workspaces;
}
