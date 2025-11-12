import type { Meta, StoryObj } from '@storybook/react';
import { ImageCropper } from './image-cropper';
import { Button } from './button';
import { useState } from 'react';

const meta = {
  title: 'Components/ImageCropper',
  component: ImageCropper,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ImageCropper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    dialogOpen: false,
    setDialogOpen: () => {},
    selectedFile: null,
    onCropComplete: () => {},
    children: null,
  },
  render: () => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [croppedImage, setCroppedImage] = useState<string | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        setDialogOpen(true);
      }
    };

    const handleCropComplete = (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      setCroppedImage(url);
    };

    return (
      <div className="space-y-4">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="image-upload"
        />
        <ImageCropper
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          selectedFile={selectedFile}
          onCropComplete={handleCropComplete}
        >
          <Button asChild>
            <label htmlFor="image-upload" className="cursor-pointer">
              Select Image to Crop
            </label>
          </Button>
        </ImageCropper>
        {croppedImage && (
          <div className="mt-4">
            <p className="text-sm mb-2">Cropped Image:</p>
            <img
              src={croppedImage}
              alt="Cropped"
              className="max-w-xs rounded border"
            />
          </div>
        )}
      </div>
    );
  },
};

export const CustomAspectRatio: Story = {
  args: {
    dialogOpen: false,
    setDialogOpen: () => {},
    selectedFile: null,
    onCropComplete: () => {},
    children: null,
  },
  render: () => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [croppedImage, setCroppedImage] = useState<string | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        setDialogOpen(true);
      }
    };

    const handleCropComplete = (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      setCroppedImage(url);
    };

    return (
      <div className="space-y-4">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="image-upload-16-9"
        />
        <ImageCropper
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          selectedFile={selectedFile}
          onCropComplete={handleCropComplete}
          aspect={16 / 9}
        >
          <Button asChild>
            <label htmlFor="image-upload-16-9" className="cursor-pointer">
              Select Image (16:9 Aspect)
            </label>
          </Button>
        </ImageCropper>
        {croppedImage && (
          <div className="mt-4">
            <p className="text-sm mb-2">Cropped Image (16:9):</p>
            <img
              src={croppedImage}
              alt="Cropped"
              className="max-w-md rounded border"
            />
          </div>
        )}
      </div>
    );
  },
};
