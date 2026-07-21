import { useState, type FormEvent } from "react";
import { FolderIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { addWorkspace } from "@/workspaces";

export function AppSidebar() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [workspaces, setWorkspaces] = useState<string[]>([]);

  const createWorkspace = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextWorkspaces = addWorkspace(workspaces, name);
    if (nextWorkspaces === workspaces) return;
    setWorkspaces(nextWorkspaces);
    setName("");
    setDialogOpen(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-8 items-center gap-2">
          <SidebarTrigger className="size-8 shrink-0" />
          <span className="font-minecraft truncate text-base leading-none group-data-[collapsible=icon]:hidden">
            Mist
          </span>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="w-full justify-start group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
              size="sm"
            >
              <PlusIcon />
              <span className="group-data-[collapsible=icon]:hidden">New workspace</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={createWorkspace}>
              <DialogHeader>
                <DialogTitle>Create workspace</DialogTitle>
                <DialogDescription>
                  Choose a name for your new workspace.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-5">
                <Label htmlFor="workspace-name">Name</Label>
                <Input
                  id="workspace-name"
                  autoFocus
                  autoComplete="off"
                  maxLength={64}
                  placeholder="My workspace"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={!name.trim()}>
                  Create workspace
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
          <SidebarGroupContent>
            {workspaces.length ? (
              <SidebarMenu>
                {workspaces.map((workspace, index) => (
                  <SidebarMenuItem key={`${workspace}-${index}`}>
                    <SidebarMenuButton tooltip={workspace}>
                      <FolderIcon />
                      <span>{workspace}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            ) : (
              <p className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                No workspaces yet.
              </p>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
