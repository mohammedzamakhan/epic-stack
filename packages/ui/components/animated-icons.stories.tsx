import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { ArrowLeftIcon, type ArrowLeftIconHandle } from './animated-icons/arrow-left-icon';
import { BuildingIcon, type BuildingIconHandle } from './animated-icons/building-icon';
import { CircleHelp, type CircleHelpHandle } from './animated-icons/circle-help';
import { FileTextIcon, type FileTextIconHandle } from './animated-icons/file-text-icon';
import { FoldersIcon, type FoldersIconHandle } from './animated-icons/folders-icon';
import { GlobeIcon, type GlobeIconHandle } from './animated-icons/globe-icon';
import { HomeIcon, type HomeIconHandle } from './animated-icons/home-icon';
import { ListTodo, type ListTodoHandle } from './animated-icons/list-todo';
import { LockOpenIcon, type LockOpenIconHandle } from './animated-icons/lock-open-icon';
import { LogoutIcon, type LogoutIconHandle } from './animated-icons/logout-icon';
import { MCPIcon, type MCPIconHandle } from './animated-icons/mcp-icon';
import { MessageSquareMore, type MessageSquareMoreHandle } from './animated-icons/message-square-more';
import { SettingsGearIcon, type SettingsGearIconHandle } from './animated-icons/settings-gear-icon';
import { ShieldCheckIcon, type ShieldCheckIconHandle } from './animated-icons/shield-check-icon';
import { SunMoonIcon, type SunMoonIconHandle } from './animated-icons/sun-moon-icon';
import { UserIcon, type UserIconHandle } from './animated-icons/user-icon';
import { UserRoundPlus, type UserRoundPlusHandle } from './animated-icons/user-round-plus';

const meta = {
  title: 'Components/Animated Icons',
  component: HomeIcon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'number',
    },
  },
} satisfies Meta<typeof HomeIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <HomeIcon size={32} />
      <p className="text-sm text-muted-foreground">Hover over the icon</p>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <HomeIcon size={20} />
        <span className="text-xs text-muted-foreground">20px</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <HomeIcon size={28} />
        <span className="text-xs text-muted-foreground">28px (default)</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <HomeIcon size={36} />
        <span className="text-xs text-muted-foreground">36px</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <HomeIcon size={48} />
        <span className="text-xs text-muted-foreground">48px</span>
      </div>
    </div>
  ),
};

export const ControlledAnimation: Story = {
  render: () => {
    const iconRef = useRef<HomeIconHandle>(null);

    return (
      <div className="flex flex-col items-center gap-4">
        <HomeIcon ref={iconRef} size={48} />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => iconRef.current?.startAnimation()}>
            Start Animation
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => iconRef.current?.stopAnimation()}
          >
            Stop Animation
          </Button>
        </div>
      </div>
    );
  },
};

export const AllAnimatedIcons: Story = {
  render: () => {
    const animatedIcons = [
      { name: 'Arrow Left', component: ArrowLeftIcon, description: 'Navigation arrow with slide animation' },
      { name: 'Building', component: BuildingIcon, description: 'Building/organization icon' },
      { name: 'Circle Help', component: CircleHelp, description: 'Help/question icon' },
      { name: 'File Text', component: FileTextIcon, description: 'Document icon' },
      { name: 'Folders', component: FoldersIcon, description: 'Folders icon' },
      { name: 'Globe', component: GlobeIcon, description: 'Globe/world icon with rotation' },
      { name: 'Home', component: HomeIcon, description: 'Home icon with draw animation' },
      { name: 'List Todo', component: ListTodo, description: 'Todo list icon' },
      { name: 'Lock Open', component: LockOpenIcon, description: 'Unlock icon' },
      { name: 'Logout', component: LogoutIcon, description: 'Logout icon with slide animation' },
      { name: 'MCP', component: MCPIcon, description: 'MCP icon' },
      { name: 'Message Square More', component: MessageSquareMore, description: 'Message/chat icon' },
      { name: 'Settings Gear', component: SettingsGearIcon, description: 'Settings icon with rotation' },
      { name: 'Shield Check', component: ShieldCheckIcon, description: 'Security/verification icon' },
      { name: 'Sun Moon', component: SunMoonIcon, description: 'Theme toggle icon' },
      { name: 'User', component: UserIcon, description: 'User/profile icon' },
      { name: 'User Round Plus', component: UserRoundPlus, description: 'Add user icon' },
    ];

    return (
      <div className="max-w-6xl p-8">
        <h2 className="text-2xl font-bold mb-2">All Animated Icons ({animatedIcons.length})</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Hover over any icon to see its animation
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {animatedIcons.map(({ name, component: IconComponent, description }) => (
            <div
              key={name}
              className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:bg-muted transition-colors group"
            >
              <IconComponent size={48} className="mb-3" />
              <span className="text-sm font-medium text-center mb-1">{name}</span>
              <span className="text-xs text-center text-muted-foreground">
                {description}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export const InteractiveShowcase: Story = {
  render: () => {
    const [selectedIcon, setSelectedIcon] = useState<string>('Home');
    const iconRef = useRef<any>(null);

    const animatedIcons = [
      { name: 'Arrow Left', component: ArrowLeftIcon },
      { name: 'Building', component: BuildingIcon },
      { name: 'Circle Help', component: CircleHelp },
      { name: 'File Text', component: FileTextIcon },
      { name: 'Folders', component: FoldersIcon },
      { name: 'Globe', component: GlobeIcon },
      { name: 'Home', component: HomeIcon },
      { name: 'List Todo', component: ListTodo },
      { name: 'Lock Open', component: LockOpenIcon },
      { name: 'Logout', component: LogoutIcon },
      { name: 'MCP', component: MCPIcon },
      { name: 'Message Square More', component: MessageSquareMore },
      { name: 'Settings Gear', component: SettingsGearIcon },
      { name: 'Shield Check', component: ShieldCheckIcon },
      { name: 'Sun Moon', component: SunMoonIcon },
      { name: 'User', component: UserIcon },
      { name: 'User Round Plus', component: UserRoundPlus },
    ];

    const SelectedIconComponent = animatedIcons.find(
      (icon) => icon.name === selectedIcon
    )?.component || HomeIcon;

    return (
      <div className="max-w-4xl p-8">
        <h2 className="text-2xl font-bold mb-6">Interactive Animated Icons</h2>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Icon Selector */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-4">Select an Icon</h3>
            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-2">
              {animatedIcons.map(({ name }) => (
                <Button
                  key={name}
                  variant={selectedIcon === name ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedIcon(name)}
                  className="justify-start"
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>

          {/* Icon Display */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-4">Preview</h3>
            <div className="flex flex-col items-center gap-6 p-8 rounded-lg border border-border bg-muted/50">
              <SelectedIconComponent ref={iconRef} size={80} />
              <div className="text-center">
                <p className="text-lg font-medium mb-2">{selectedIcon}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Hover to see animation
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => iconRef.current?.startAnimation()}>
                  Animate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => iconRef.current?.stopAnimation()}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export const UsageExamples: Story = {
  render: () => (
    <div className="max-w-4xl p-8 space-y-8">
      <h2 className="text-2xl font-bold mb-6">Usage Examples</h2>

      {/* Navigation */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Navigation</h3>
        <div className="flex items-center gap-4 p-4 rounded-lg border border-border">
          <ArrowLeftIcon size={24} />
          <span>Back to Dashboard</span>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Settings Menu</h3>
        <div className="flex items-center gap-4 p-4 rounded-lg border border-border">
          <SettingsGearIcon size={24} />
          <span>Account Settings</span>
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Theme Toggle</h3>
        <Button variant="outline" className="gap-2">
          <SunMoonIcon size={20} />
          Toggle Theme
        </Button>
      </div>

      {/* User Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">User Actions</h3>
        <div className="flex gap-4">
          <Button variant="outline" className="gap-2">
            <UserIcon size={20} />
            Profile
          </Button>
          <Button variant="outline" className="gap-2">
            <UserRoundPlus size={20} />
            Add User
          </Button>
          <Button variant="outline" className="gap-2">
            <LogoutIcon size={20} />
            Logout
          </Button>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Status & Info</h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 p-3 rounded-lg border border-green-500/50 bg-green-500/10">
            <ShieldCheckIcon size={20} />
            <span className="text-sm">Secured</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg border border-blue-500/50 bg-blue-500/10">
            <CircleHelp size={20} />
            <span className="text-sm">Need Help?</span>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};
