import type { Meta, StoryObj } from '@storybook/react';
import { HomeIcon, SettingsIcon, UsersIcon } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from './sidebar';

const meta = {
  title: 'Components/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b px-6 py-3">
            <h2 className="text-lg font-semibold">My App</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Home">
                      <HomeIcon className="size-4" />
                      <span>Home</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Users">
                      <UsersIcon className="size-4" />
                      <span>Users</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Settings">
                      <SettingsIcon className="size-4" />
                      <span>Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <div className="text-sm text-muted-foreground">v1.0.0</div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-16 items-center gap-2 border-b px-6">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </header>
          <div className="flex-1 p-6">
            <div className="mx-auto max-w-4xl space-y-4">
              <h2 className="text-2xl font-bold">Welcome</h2>
              <p className="text-muted-foreground">
                This is the main content area. The sidebar can be toggled using the button in the header or by pressing Cmd+B (Ctrl+B on Windows).
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-4">
                    <h3 className="font-semibold">Card {i + 1}</h3>
                    <p className="text-sm text-muted-foreground">
                      Some content for card {i + 1}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  ),
};

export const CollapsibleIcon: Story = {
  render: () => (
    <SidebarProvider defaultOpen={false}>
      <div className="flex h-screen w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b p-2">
            <div className="flex items-center justify-center py-2">
              <div className="size-8 rounded bg-primary" />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Home">
                      <HomeIcon className="size-4" />
                      <span>Home</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Users">
                      <UsersIcon className="size-4" />
                      <span>Users</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Settings">
                      <SettingsIcon className="size-4" />
                      <span>Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-16 items-center gap-2 border-b px-6">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Collapsible Sidebar</h1>
          </header>
          <div className="p-6">
            <p>Click the trigger to expand/collapse the sidebar to icon mode.</p>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  ),
};

export const RightSide: Story = {
  render: () => (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <SidebarInset>
          <header className="flex h-16 items-center gap-2 border-b px-6">
            <h1 className="flex-1 text-lg font-semibold">Content Area</h1>
            <SidebarTrigger />
          </header>
          <div className="p-6">
            <p>The sidebar is on the right side in this example.</p>
          </div>
        </SidebarInset>
        <Sidebar side="right">
          <SidebarHeader className="border-b p-4">
            <h2 className="font-semibold">Right Sidebar</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Actions</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <HomeIcon className="size-4" />
                      <span>Home</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <SettingsIcon className="size-4" />
                      <span>Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </div>
    </SidebarProvider>
  ),
};
