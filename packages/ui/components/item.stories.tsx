import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';
import { Button } from './button';
import { Icon } from './icon';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from './item';

const meta = {
  title: 'Components/Item',
  component: Item,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Item>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Item>
      <ItemMedia variant="icon">
        <Icon name="file-text" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Document Title</ItemTitle>
        <ItemDescription>This is a brief description of the document.</ItemDescription>
      </ItemContent>
    </Item>
  ),
};

export const WithActions: Story = {
  render: () => (
    <Item>
      <ItemMedia variant="icon">
        <Icon name="file-text" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Important Document</ItemTitle>
        <ItemDescription>
          A document that requires your attention and review.
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button variant="ghost" size="sm">
          <Icon name="pencil" />
        </Button>
        <Button variant="ghost" size="sm">
          <Icon name="trash" />
        </Button>
      </ItemActions>
    </Item>
  ),
};

export const WithImage: Story = {
  render: () => (
    <Item>
      <ItemMedia variant="image">
        <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=100&fit=crop" alt="Item" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Beautiful Landscape</ItemTitle>
        <ItemDescription>A stunning view of nature at its finest.</ItemDescription>
      </ItemContent>
    </Item>
  ),
};

export const WithHeaderAndFooter: Story = {
  render: () => (
    <Item variant="outline">
      <ItemHeader>
        <ItemTitle>Project Name</ItemTitle>
        <Badge>Active</Badge>
      </ItemHeader>
      <ItemContent>
        <ItemDescription>
          This project is currently in active development and requires your attention.
        </ItemDescription>
      </ItemContent>
      <ItemFooter>
        <span className="text-xs text-muted-foreground">Last updated: 2 hours ago</span>
        <Button variant="outline" size="sm">
          View Details
        </Button>
      </ItemFooter>
    </Item>
  ),
};

export const ItemList: Story = {
  render: () => (
    <ItemGroup>
      <Item>
        <ItemMedia variant="icon">
          <Icon name="folder" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Documents</ItemTitle>
          <ItemDescription>All your important documents</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="sm">
            <Icon name="arrow-right" />
          </Button>
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia variant="icon">
          <Icon name="folder" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Images</ItemTitle>
          <ItemDescription>Photo gallery and assets</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="sm">
            <Icon name="arrow-right" />
          </Button>
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia variant="icon">
          <Icon name="folder" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Videos</ItemTitle>
          <ItemDescription>Video files and recordings</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="sm">
            <Icon name="arrow-right" />
          </Button>
        </ItemActions>
      </Item>
    </ItemGroup>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="space-y-4">
      <Item variant="default">
        <ItemContent>
          <ItemTitle>Default Variant</ItemTitle>
        </ItemContent>
      </Item>
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Outline Variant</ItemTitle>
        </ItemContent>
      </Item>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>Muted Variant</ItemTitle>
        </ItemContent>
      </Item>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <Item size="sm">
        <ItemMedia variant="icon">
          <Icon name="file-text" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Small Size</ItemTitle>
          <ItemDescription>Compact item layout</ItemDescription>
        </ItemContent>
      </Item>
      <Item size="default">
        <ItemMedia variant="icon">
          <Icon name="file-text" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Default Size</ItemTitle>
          <ItemDescription>Standard item layout</ItemDescription>
        </ItemContent>
      </Item>
    </div>
  ),
};

export const ComplexList: Story = {
  render: () => (
    <ItemGroup className="max-w-2xl">
      {[
        {
          title: 'Website Redesign',
          description: 'Complete overhaul of the company website',
          status: 'In Progress',
          date: '2 days ago',
        },
        {
          title: 'Mobile App Development',
          description: 'Build native iOS and Android applications',
          status: 'Planning',
          date: '1 week ago',
        },
        {
          title: 'API Documentation',
          description: 'Write comprehensive API documentation',
          status: 'Completed',
          date: '3 weeks ago',
        },
      ].map((project, index) => (
        <div key={index}>
          <Item variant="outline">
            <ItemHeader>
              <ItemTitle>{project.title}</ItemTitle>
              <Badge variant={project.status === 'Completed' ? 'default' : 'secondary'}>
                {project.status}
              </Badge>
            </ItemHeader>
            <ItemContent>
              <ItemDescription>{project.description}</ItemDescription>
            </ItemContent>
            <ItemFooter>
              <span className="text-xs text-muted-foreground">Updated {project.date}</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">Edit</Button>
                <Button variant="ghost" size="sm">View</Button>
              </div>
            </ItemFooter>
          </Item>
          {index < 2 && <ItemSeparator />}
        </div>
      ))}
    </ItemGroup>
  ),
};
