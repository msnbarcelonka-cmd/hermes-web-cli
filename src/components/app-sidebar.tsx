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
  id: number;
  name: string;
  type: EntityType;
  projectPath?: string;
  terminalCount?: number;
};

type SidebarSectionProps = {
  type: EntityType;
  items: Entity[];
  onDelete: (id: number) => void;
};

function SidebarSection({ type, items, onDelete }: SidebarSectionProps) {
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
                <Icon />
                <span>{config.section}</span>
                {hasItems && (
                  <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            {hasItems && (
              <CollapsibleContent>
                <SidebarMenuSub className="group-data-[collapsible=icon]:mx-0! group-data-[collapsible=icon]:flex! group-data-[collapsible=icon]:translate-x-0 group-data-[collapsible=icon]:px-0!">
                  {items.map((item) => (
                    <SidebarMenuSubItem key={item.id}>
                      <SidebarMenuSubButton
                        asChild
                        className="group-data-[collapsible=icon]:flex! group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:translate-x-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
                      >
                        <button type="button" aria-label={item.name}>
                          <span className="group-data-[collapsible=icon]:hidden">
                            {item.name}
                          </span>
                          <span className="hidden uppercase group-data-[collapsible=icon]:inline">
                            {item.name.charAt(0)}
                          </span>
                        </button>
                      </SidebarMenuSubButton>
                      <SidebarMenuAction
                        aria-label={`Delete ${item.name}`}
                        className="top-1"
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
  onDeleteEntity,
}: {
  entities: Entity[];
  onWorkspaceSetup: () => void;
  onCreateEntity: (name: string, type: EntityType) => void;
  onDeleteEntity: (id: number) => void;
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
