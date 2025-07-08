"use client"

import { ChevronsUpDown, Plus } from "lucide-react"
import * as React from "react"

import { Link, useSubmit } from "react-router"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "#app/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "#app/components/ui/sidebar"
import { useUserOrganizations } from "#app/utils/organizations"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const submit = useSubmit()

  const userOrganizations = useUserOrganizations() || {
    organizations: [],
    currentOrganization: null,
  }

  const { organizations, currentOrganization } = userOrganizations

  const [activeTeam, setActiveTeam] = React.useState(
    currentOrganization?.organization,
  )

  React.useEffect(() => {
    setActiveTeam(currentOrganization?.organization)
  }, [currentOrganization])

  function handleOrganizationSelect(organizationId: string) {
    void submit(
      { organizationId },
      {
        method: "post",
        action: "/organizations/set-default",
      },
    )
  }

  if (!activeTeam) {
    return null
  }

  console.log(activeTeam)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-lg">
                <Avatar className="h-6 w-6 rounded-md">
                  {activeTeam.image?.objectKey ? (
                    <AvatarImage
                      src={`/resources/images?objectKey=${activeTeam.image.objectKey}`}
                      alt={activeTeam.image?.altText || `${activeTeam.name} logo`}
                    />
                  ) : null}
                  <AvatarFallback>{activeTeam.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeTeam.name}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Teams
            </DropdownMenuLabel>
            {organizations.map((userOrg, index) => (
              <DropdownMenuItem
                key={userOrg.organization.id}
                onClick={() => handleOrganizationSelect(userOrg.organization.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <Avatar className="h-5 w-5 rounded-md">
                    {userOrg.organization.image?.objectKey ? (
                      <AvatarImage
                        src={`/resources/images?objectKey=${userOrg.organization.image.objectKey}`}
                        alt={
                          userOrg.organization.image?.altText ||
                          `${userOrg.organization.name} logo`
                        }
                        className="grayscale-0"
                      />
                    ) : null}
                    <AvatarFallback>
                      {userOrg.organization.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {userOrg.organization.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 p-2">
              <Link to="/organizations/create">
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <div className="text-muted-foreground font-medium">Add team</div>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
