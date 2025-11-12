import type { Meta, StoryObj } from '@storybook/react';
import { useState, useEffect } from 'react';
import { Button } from './button';
import { ImageCropper } from './image-cropper';

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
  args: {},
  render: () => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [croppedImage, setCroppedImage] = useState<string | null>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        setDialogOpen(true);
      }
    };

    const handleCropComplete = (croppedImageBlob: Blob) => {
      const url = URL.createObjectURL(croppedImageBlob);
      setCroppedImage(url);
      setDialogOpen(false);
    };

    useEffect(() => {
      return () => {
        if (croppedImage) {
          URL.revokeObjectURL(croppedImage);
        }
      };
    }, [croppedImage]);

    return (
      <div className="flex flex-col gap-4 items-center">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="image-upload"
        />
        <label htmlFor="image-upload">
          <Button asChild>
            <span>Select Image</span>
          </Button>
        </label>

        {croppedImage && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Cropped Image:</p>
            <img
              src={croppedImage}
              alt="Cropped"
              className="max-w-xs rounded-lg border"
            />
          </div>
        )}

        <ImageCropper
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          selectedFile={selectedFile}
          onCropComplete={handleCropComplete}
        >
          <Button>Open Cropper</Button>
        </ImageCropper>
      </div>
    );
  },
};

export const SquareAspect: Story = {
  args: {},
  render: () => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [croppedImage, setCroppedImage] = useState<string | null>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        setDialogOpen(true);
      }
    };

    const handleCropComplete = (croppedImageBlob: Blob) => {
      const url = URL.createObjectURL(croppedImageBlob);
      setCroppedImage(url);
      setDialogOpen(false);
    };

    useEffect(() => {
      return () => {
        if (croppedImage) {
          URL.revokeObjectURL(croppedImage);
        }
      };
    }, [croppedImage]);

    return (
      <div className="flex flex-col gap-4 items-center">
        <p className="text-sm text-muted-foreground">1:1 Square Aspect Ratio</p>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="image-upload-square"
        />
        <label htmlFor="image-upload-square">
          <Button asChild>
            <span>Select Image</span>
          </Button>
        </label>

        {croppedImage && (
          <div className="mt-4">
            <img
              src={croppedImage}
              alt="Cropped"
              className="size-48 rounded-lg border object-cover"
            />
          </div>
        )}

        <ImageCropper
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          selectedFile={selectedFile}
          onCropComplete={handleCropComplete}
          aspect={1}
        >
          <Button>Open Cropper</Button>
        </ImageCropper>
      </div>
    );
  },
};

export const WideAspect: Story = {
  args: {},
  render: () => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [croppedImage, setCroppedImage] = useState<string | null>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        setDialogOpen(true);
      }
    };

    const handleCropComplete = (croppedImageBlob: Blob) => {
      const url = URL.createObjectURL(croppedImageBlob);
      setCroppedImage(url);
      setDialogOpen(false);
    };

    useEffect(() => {
      return () => {
        if (croppedImage) {
          URL.revokeObjectURL(croppedImage);
        }
      };
    }, [croppedImage]);

    return (
      <div className="flex flex-col gap-4 items-center">
        <p className="text-sm text-muted-foreground">16:9 Wide Aspect Ratio</p>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="image-upload-wide"
        />
        <label htmlFor="image-upload-wide">
          <Button asChild>
            <span>Select Image</span>
          </Button>
        </label>

        {croppedImage && (
          <div className="mt-4">
            <img
              src={croppedImage}
              alt="Cropped"
              className="max-w-md rounded-lg border"
            />
          </div>
        )}

        <ImageCropper
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          selectedFile={selectedFile}
          onCropComplete={handleCropComplete}
          aspect={16 / 9}
        >
          <Button>Open Cropper</Button>
        </ImageCropper>
      </div>
    );
  },
};
