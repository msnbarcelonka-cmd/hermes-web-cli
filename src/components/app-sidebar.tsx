import { useRef, useState, type FormEvent } from "react";
import {
  BoxesIcon,
  ChevronRightIcon,
  FolderIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const entityTypes = {
  workspace: {
    singular: "workspace",
    label: "Workspace",
    section: "Workspaces",
    icon: FolderIcon,
  },
  swarm: {
    singular: "swarm",
    label: "Swarm",
    section: "Swarms",
    icon: BoxesIcon,
  },
} as const;

type EntityType = keyof typeof entityTypes;
type Entity = { id: number; name: string; type: EntityType };

type SidebarSectionProps = {
  type: EntityType;
  items: Entity[];
  onDelete: (id: number) => void;
};

function SidebarSection({ type, items, onDelete }: SidebarSectionProps) {
  const config = entityTypes[type];
  const Icon = config.icon;

  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarGroup>
        {items.length ? (
          <CollapsibleTrigger asChild>
            <button
              aria-label={`Toggle ${config.section}`}
              className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:hidden"
            >
              <span>{config.section}</span>
              <ChevronRightIcon className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </button>
          </CollapsibleTrigger>
        ) : (
          <SidebarGroupLabel>{config.section}</SidebarGroupLabel>
        )}

        {items.length > 0 && (
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton tooltip={item.name}>
                      <Icon />
                      <span>{item.name}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      aria-label={`Delete ${item.name}`}
                      onClick={() => onDelete(item.id)}
                    >
                      <XIcon />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        )}
      </SidebarGroup>
    </Collapsible>
  );
}

export function AppSidebar() {
  const nextId = useRef(0);
  const [createType, setCreateType] = useState<EntityType | null>(null);
  const [name, setName] = useState("");
  const [entities, setEntities] = useState<Entity[]>([]);

  const closeDialog = () => {
    setCreateType(null);
    setName("");
  };

  const createEntity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!createType || !trimmedName) return;

    setEntities((current) => [
      ...current,
      { id: ++nextId.current, name: trimmedName, type: createType },
    ]);
    closeDialog();
  };

  const deleteEntity = (id: number) =>
    setEntities((current) => current.filter((entity) => entity.id !== id));

  const dialogConfig = createType ? entityTypes[createType] : null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-8 items-center gap-2">
          <SidebarTrigger className="size-8 shrink-0" />
          <span className="font-minecraft truncate text-base leading-none group-data-[collapsible=icon]:hidden">
            Mist
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="w-full justify-start group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
              size="sm"
            >
              <PlusIcon />
              <span className="group-data-[collapsible=icon]:hidden">Create</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {(Object.keys(entityTypes) as EntityType[]).map((type) => {
              const config = entityTypes[type];
              const Icon = config.icon;
              return (
                <DropdownMenuItem key={type} onSelect={() => setCreateType(type)}>
                  <Icon />
                  {config.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        {(Object.keys(entityTypes) as EntityType[]).map((type) => (
          <SidebarSection
            key={type}
            type={type}
            items={entities.filter((entity) => entity.type === type)}
            onDelete={deleteEntity}
          />
        ))}
      </SidebarContent>

      <Dialog
        open={createType !== null}
        onOpenChange={(open) => !open && closeDialog()}
      >
        {dialogConfig && (
          <DialogContent>
            <form onSubmit={createEntity}>
              <DialogHeader>
                <DialogTitle>Create {dialogConfig.singular}</DialogTitle>
                <DialogDescription>
                  Choose a name for your new {dialogConfig.singular}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-5">
                <Label htmlFor="entity-name">Name</Label>
                <Input
                  id="entity-name"
                  autoFocus
                  autoComplete="off"
                  maxLength={64}
                  placeholder={`My ${dialogConfig.singular}`}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={!name.trim()}>
                  Create {dialogConfig.singular}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </Sidebar>
  );
}
