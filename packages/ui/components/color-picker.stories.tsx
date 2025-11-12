import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ColorPicker } from './color-picker';
import { Label } from './label';

const meta = {
  title: 'Components/ColorPicker',
  component: ColorPicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [color, setColor] = useState('#6b7280');
    return <ColorPicker value={color} onChange={setColor} />;
  },
};

export const WithLabel: Story = {
  render: () => {
    const [color, setColor] = useState('#3b82f6');
    return (
      <div className="flex flex-col gap-2">
        <Label>Choose a color</Label>
        <ColorPicker value={color} onChange={setColor} />
      </div>
    );
  },
};

export const MultipleColors: Story = {
  render: () => {
    const [primary, setPrimary] = useState('#3b82f6');
    const [secondary, setSecondary] = useState('#10b981');
    const [accent, setAccent] = useState('#f59e0b');

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Label className="w-20">Primary</Label>
          <ColorPicker value={primary} onChange={setPrimary} />
          <span className="text-sm text-muted-foreground">{primary}</span>
        </div>
        <div className="flex items-center gap-2">
          <Label className="w-20">Secondary</Label>
          <ColorPicker value={secondary} onChange={setSecondary} />
          <span className="text-sm text-muted-foreground">{secondary}</span>
        </div>
        <div className="flex items-center gap-2">
          <Label className="w-20">Accent</Label>
          <ColorPicker value={accent} onChange={setAccent} />
          <span className="text-sm text-muted-foreground">{accent}</span>
        </div>
      </div>
    );
  },
};

export const WithPreview: Story = {
  render: () => {
    const [color, setColor] = useState('#8b5cf6');
    return (
      <div className="flex flex-col gap-4 items-center">
        <div
          className="w-32 h-32 rounded-lg border-2 border-border"
          style={{ backgroundColor: color }}
        />
        <div className="flex items-center gap-2">
          <ColorPicker value={color} onChange={setColor} />
          <span className="text-sm text-muted-foreground">{color}</span>
        </div>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => {
    const [color] = useState('#6b7280');
    return <ColorPicker value={color} onChange={() => {}} disabled />;
  },
};

export const ThemeCustomization: Story = {
  render: () => {
    const [bgColor, setBgColor] = useState('#ffffff');
    const [textColor, setTextColor] = useState('#000000');
    const [accentColor, setAccentColor] = useState('#3b82f6');

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Label className="w-32">Background</Label>
            <ColorPicker value={bgColor} onChange={setBgColor} />
            <span className="text-sm text-muted-foreground">{bgColor}</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="w-32">Text</Label>
            <ColorPicker value={textColor} onChange={setTextColor} />
            <span className="text-sm text-muted-foreground">{textColor}</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="w-32">Accent</Label>
            <ColorPicker value={accentColor} onChange={setAccentColor} />
            <span className="text-sm text-muted-foreground">{accentColor}</span>
          </div>
        </div>

        <div
          className="p-6 rounded-lg border-2"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          <h3 className="text-lg font-semibold mb-2">Preview</h3>
          <p className="mb-4">
            This is how your theme will look with the selected colors.
          </p>
          <button
            className="px-4 py-2 rounded-md font-medium"
            style={{ backgroundColor: accentColor, color: '#ffffff' }}
          >
            Action Button
          </button>
        </div>
      </div>
    );
  },
};
