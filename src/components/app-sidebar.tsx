import { useState, type FormEvent } from "react";
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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

export type EntityType = keyof typeof entityTypes;
export type Entity = {
  id: string;
  name: string;
  type: EntityType;
  projectPath?: string;
  terminalCount?: number;
};

type SidebarSectionProps = {
  type: EntityType;
  items: Entity[];
  activeId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

function SidebarSection({ type, items, activeId, onSelect, onDelete }: SidebarSectionProps) {
  const config = entityTypes[type];
  const Icon = config.icon;
  const hasItems = items.length > 0;

  return (
    <SidebarGroup>
      <SidebarMenu>
        <Collapsible asChild defaultOpen className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                aria-label={hasItems ? `Toggle ${config.section}` : config.section}
                tooltip={config.section}
              >
                <Icon className="text-sidebar-foreground/45" />
                <span className="font-mono text-[11px] font-medium tracking-[0.12em] uppercase text-sidebar-foreground/60">
                  {config.section}
                </span>
                {hasItems && (
                  <span
                    aria-hidden="true"
                    className="ml-auto font-mono text-[10px] tabular-nums text-sidebar-foreground/35 group-data-[collapsible=icon]:hidden"
                  >
                    {items.length}
                  </span>
                )}
                {hasItems && (
                  <ChevronRightIcon className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            {!hasItems && (
              <div className="pt-0.5 pr-2 pb-1 pl-8 font-mono text-[10px] tracking-wide text-sidebar-foreground/30 select-none group-data-[collapsible=icon]:hidden">
                none yet
              </div>
            )}
            {hasItems && (
              <CollapsibleContent>
                <SidebarMenuSub className="group-data-[collapsible=icon]:mx-0! group-data-[collapsible=icon]:flex! group-data-[collapsible=icon]:translate-x-0 group-data-[collapsible=icon]:px-0!">
                  {items.map((item) => (
                    <SidebarMenuSubItem key={item.id}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={item.id === activeId}
                        className="group-data-[collapsible=icon]:flex! group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:translate-x-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
                      >
                        <button type="button" aria-label={item.name} onClick={() => onSelect(item.id)}>
                          <span className="truncate group-data-[collapsible=icon]:hidden">
                            {item.name}
                          </span>
                          <span className="hidden font-mono text-xs uppercase group-data-[collapsible=icon]:inline">
                            {item.name.charAt(0)}
                          </span>
                        </button>
                      </SidebarMenuSubButton>
                      <SidebarMenuAction
                        showOnHover
                        aria-label={`Delete ${item.name}`}
                        className="top-1 text-sidebar-foreground/50 hover:text-sidebar-foreground"
                        onClick={() => onDelete(item.id)}
                      >
                        <XIcon />
                      </SidebarMenuAction>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            )}
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
  );
}

export function AppSidebar({
  entities,
  onWorkspaceSetup,
  onCreateEntity,
  activeEntityId,
  onSelectEntity,
  onDeleteEntity,
}: {
  entities: Entity[];
  onWorkspaceSetup: () => void;
  onCreateEntity: (name: string, type: EntityType) => void;
  activeEntityId?: string;
  onSelectEntity: (id: string) => void;
  onDeleteEntity: (id: string) => void;
}) {
  const [createType, setCreateType] = useState<EntityType | null>(null);
  const [name, setName] = useState("");

  const closeDialog = () => {
    setCreateType(null);
    setName("");
  };

  const createEntity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!createType || !trimmedName) return;

    onCreateEntity(trimmedName, createType);
    closeDialog();
  };

  const dialogConfig = createType ? entityTypes[createType] : null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3">
        <div className="flex h-8 items-center gap-2">
          <SidebarTrigger className="size-8 shrink-0" />
          <span className="font-minecraft flex items-center gap-1.5 truncate text-base leading-none tracking-wide group-data-[collapsible=icon]:hidden">
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
                <DropdownMenuItem
                  key={type}
                  onSelect={() => {
                    if (type === "workspace") onWorkspaceSetup();
                    else setCreateType(type);
                  }}
                >
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
            activeId={activeEntityId}
            onSelect={onSelectEntity}
            onDelete={onDeleteEntity}
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
