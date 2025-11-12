import type { Meta, StoryObj } from '@storybook/react';
import { Icon, type IconName } from './icon';

// All available icons from the IconName type
const allIconNames: IconName[] = [
  'activity-log',
  'activity',
  'alert-triangle',
  'arrow-left',
  'arrow-right',
  'asana',
  'badge-question-mark',
  'ban',
  'bell',
  'blocks',
  'bot',
  'building',
  'calendar',
  'camera',
  'chat-bubble',
  'check-circle',
  'check-circled',
  'check',
  'chevron-down',
  'chevron-left',
  'chevron-right',
  'chevron-up',
  'chevrons-left',
  'chevrons-right',
  'circle-check',
  'clickup',
  'clock',
  'cog',
  'command',
  'copy',
  'credit-card',
  'database',
  'download',
  'edit',
  'ellipsis-vertical',
  'ellipsis',
  'external-link',
  'file-text',
  'folder-open',
  'folder',
  'frown',
  'gear',
  'github',
  'gitlab',
  'google',
  'grip-vertical',
  'hamburger-menu',
  'height',
  'help-circle',
  'image',
  'jira',
  'key',
  'laptop',
  'linear',
  'link-2',
  'loader',
  'lock',
  'log-out',
  'logs',
  'mail',
  'meh',
  'menu',
  'message-circle',
  'message-square',
  'minus',
  'moon',
  'more-horizontal',
  'more-vertical',
  'notion',
  'octagon-alert',
  'panel-left',
  'paper-plane',
  'paperclip',
  'passkey',
  'pencil',
  'person',
  'plane',
  'plug',
  'plus',
  'pocket-knife',
  'refresh-cw',
  'search',
  'send',
  'settings',
  'share-2',
  'shield-check',
  'shield',
  'signal-high',
  'signal-low',
  'signal-medium',
  'slack',
  'smile',
  'sparkles',
  'star-off',
  'star',
  'sticky-note',
  'sun',
  'tag',
  'trash-2',
  'trello',
  'trending-down',
  'trending-up',
  'undo-2',
  'unlock',
  'user-plus',
  'user',
  'users',
  'width',
  'x',
];

const meta = {
  title: 'Components/Icon',
  component: Icon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'select',
      options: allIconNames,
    },
    size: {
      control: 'select',
      options: ['font', 'xs', 'sm', 'md', 'lg', 'xl'],
    },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'star',
    size: 'md',
  },
};

export const WithText: Story = {
  args: {
    name: 'check-circle',
    size: 'font',
    children: 'Success',
  },
};

export const Sizes: Story = {
  args: {
    name: 'star',
  },
  render: () => (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <Icon name="star" size="xs" />
        <span className="text-xs text-muted-foreground">xs</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon name="star" size="sm" />
        <span className="text-xs text-muted-foreground">sm</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon name="star" size="md" />
        <span className="text-xs text-muted-foreground">md</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon name="star" size="lg" />
        <span className="text-xs text-muted-foreground">lg</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon name="star" size="xl" />
        <span className="text-xs text-muted-foreground">xl</span>
      </div>
    </div>
  ),
};

export const AllIcons: Story = {
  args: {
    name: 'star',
  },
  render: () => (
    <div className="max-w-6xl p-8">
      <h2 className="text-2xl font-bold mb-6">All Available Icons ({allIconNames.length})</h2>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
        {allIconNames.map((iconName) => (
          <div
            key={iconName}
            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group cursor-pointer border border-transparent hover:border-border"
            title={iconName}
          >
            <Icon name={iconName} size="lg" className="mb-2" />
            <span className="text-[10px] text-center text-muted-foreground group-hover:text-foreground break-all leading-tight">
              {iconName}
            </span>
          </div>
        ))}
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

export const IconCategories: Story = {
  args: {
    name: 'star',
  },
  render: () => {
    const categories = {
      Navigation: [
        'arrow-left',
        'arrow-right',
        'chevron-down',
        'chevron-left',
        'chevron-right',
        'chevron-up',
        'chevrons-left',
        'chevrons-right',
        'external-link',
        'link-2',
      ],
      Actions: [
        'check',
        'check-circle',
        'check-circled',
        'circle-check',
        'copy',
        'download',
        'edit',
        'pencil',
        'plus',
        'minus',
        'trash-2',
        'x',
        'send',
        'share-2',
        'refresh-cw',
        'undo-2',
      ],
      UI: [
        'menu',
        'hamburger-menu',
        'command',
        'search',
        'settings',
        'cog',
        'gear',
        'ellipsis',
        'ellipsis-vertical',
        'more-horizontal',
        'more-vertical',
        'grip-vertical',
        'panel-left',
      ],
      Communication: [
        'mail',
        'message-circle',
        'message-square',
        'chat-bubble',
        'bell',
        'paper-plane',
        'plane',
        'paperclip',
      ],
      Users: [
        'user',
        'users',
        'user-plus',
        'person',
      ],
      Security: [
        'lock',
        'unlock',
        'shield',
        'shield-check',
        'key',
        'passkey',
      ],
      Files: [
        'file-text',
        'folder',
        'folder-open',
        'image',
        'camera',
      ],
      Status: [
        'check-circle',
        'alert-triangle',
        'octagon-alert',
        'help-circle',
        'badge-question-mark',
        'ban',
        'loader',
        'activity',
        'activity-log',
      ],
      Integrations: [
        'github',
        'gitlab',
        'google',
        'slack',
        'asana',
        'clickup',
        'jira',
        'linear',
        'notion',
        'trello',
      ],
      Misc: [
        'star',
        'star-off',
        'calendar',
        'clock',
        'sun',
        'moon',
        'smile',
        'meh',
        'frown',
        'sparkles',
        'tag',
        'credit-card',
        'database',
        'laptop',
        'log-out',
        'logs',
        'plug',
        'pocket-knife',
        'sticky-note',
        'bot',
        'building',
        'blocks',
        'signal-high',
        'signal-medium',
        'signal-low',
        'trending-up',
        'trending-down',
        'height',
        'width',
      ],
    };

    return (
      <div className="max-w-6xl p-8">
        <h2 className="text-2xl font-bold mb-6">Icon Categories</h2>
        <div className="space-y-8">
          {Object.entries(categories).map(([category, icons]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-4">{category}</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
                {icons.map((iconName) => (
                  <div
                    key={iconName}
                    className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group cursor-pointer border border-transparent hover:border-border"
                    title={iconName}
                  >
                    <Icon name={iconName as IconName} size="lg" className="mb-2" />
                    <span className="text-[10px] text-center text-muted-foreground group-hover:text-foreground break-all leading-tight">
                      {iconName}
                    </span>
                  </div>
                ))}
              </div>
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
