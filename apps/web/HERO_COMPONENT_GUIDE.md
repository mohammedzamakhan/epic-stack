# Flexible Hero Component Guide

The Hero component in Epic Stack has been enhanced to support a wide variety of layouts and design options. This guide explains how to configure it through the CMS.

## Overview

The Hero component now supports:
- **Multiple asset types**: Image, Video, or Text-only
- **Flexible positioning**: Left, Right, or Center aligned assets and text
- **Visual effects**: Shadows, 3D perspectives, background glows
- **Video controls**: Autoplay, loop, muted, controls
- **Responsive design**: Optimized for mobile and desktop

## Configuration Options

### Basic Options

#### Asset Type
Choose what type of media to display (or none for text-only):
- **None (Text Only)**: Display only text content with no media
- **Image**: Display a static image
- **Video**: Display a video with customizable controls

#### Text Alignment
- **Left**: Text aligns to the left (default)
- **Center**: Text centers horizontally with centered buttons

#### Asset Position (when asset is present)
- **Left**: Asset appears on the left, text on the right
- **Right**: Asset appears on the right, text on the left (default)
- **Center**: Asset appears below the text content

### Design Options

#### Color Variant
- **Primary**: Uses primary color scheme for backgrounds and glows
- **Secondary**: Uses secondary color scheme

#### Visual Effects
- **Show Background**: Adds a subtle colored background to the entire section
- **Background Glow Effect**: Adds a large gradient glow behind the asset
- **Asset Shadow**: Choose shadow style for images/videos
  - **None**: No shadow
  - **Soft**: Subtle shadow
  - **Hard**: Strong, dramatic shadow (default)

#### Image Perspective (3D Effect)
Apply 3D transformations to images for a modern look:
- **None**: Standard flat image (default)
- **Left**: Rotates image slightly to the left
- **Right**: Rotates image slightly to the right
- **Bottom**: Tilts image from the bottom
- **Bottom Large**: More pronounced bottom tilt
- **Paper**: Subtle 3D paper-like effect

#### Minimum Height
Set the minimum height of the hero section in pixels (default: 350px)

### Video-Specific Options

When **Asset Type** is set to **Video**, these additional options become available:

- **Video URL**: Direct URL to the video file (MP4, WebM, etc.)
- **Video Poster Image**: Thumbnail image shown before the video plays
- **Auto Play**: Automatically start playing when page loads
- **Loop**: Continuously loop the video
- **Muted**: Start video with audio muted (recommended for autoplay)
- **Show Controls**: Display video player controls

## Example Configurations

### 1. Standard Hero with Image (Right-aligned)
```
Asset Type: Image
Asset Position: Right
Text Alignment: Left
Asset Shadow: Hard
Image Perspective: None
```
**Use case**: Traditional hero section with text on left, image on right.

### 2. Centered Hero with Video
```
Asset Type: Video
Asset Position: Center
Text Alignment: Center
Video URL: https://example.com/video.mp4
Auto Play: Yes
Loop: Yes
Muted: Yes
Show Controls: No
Background Glow Effect: Yes
```
**Use case**: Attention-grabbing homepage hero with looping video.

### 3. Text-Only Hero (Announcement Style)
```
Asset Type: None
Text Alignment: Center
Show Background: Yes
Variant: Primary
```
**Use case**: Product announcements, minimal landing pages.

### 4. Image with 3D Effect
```
Asset Type: Image
Asset Position: Right
Image Perspective: Paper
Asset Shadow: Hard
Background Glow Effect: Yes
```
**Use case**: Modern SaaS product showcase with depth.

### 5. Video with Poster and Controls
```
Asset Type: Video
Asset Position: Left
Video URL: https://example.com/demo.mp4
Video Poster: [Select uploaded image]
Auto Play: No
Show Controls: Yes
Muted: No
```
**Use case**: Product demo video that users can control.

## CMS Workflow

1. **Navigate to Pages** in Payload CMS
2. **Select or create a page**
3. **Go to the Hero tab**
4. **Configure basic content**:
   - Add Rich Text (heading and description)
   - Add Links (CTA buttons)
5. **Expand "Layout & Design Options"** section
6. **Configure layout**:
   - Choose Asset Type
   - Set Text and Asset Positions
   - Select Variant
   - Enable visual effects
7. **Add media** (if using Image):
   - Upload or select an image in the "Image" field
8. **Expand "Video Settings"** (if using Video):
   - Enter Video URL
   - Upload Video Poster (optional)
   - Configure video behavior

## Technical Details

### Props Interface

```typescript
interface HeroProps {
  // Content
  richText?: any          // Lexical rich text content
  links?: any[]           // CTA button links

  // Layout
  assetType?: 'none' | 'image' | 'video'
  assetPosition?: 'left' | 'right' | 'center'
  textPosition?: 'left' | 'center'

  // Style
  variant?: 'primary' | 'secondary'
  withBackground?: boolean
  withBackgroundGlow?: boolean
  assetShadow?: 'none' | 'soft' | 'hard'
  imagePerspective?: 'none' | 'left' | 'right' | 'bottom' | 'bottom-lg' | 'paper'
  minHeight?: number

  // Image
  media?: any            // Image upload

  // Video
  videoSrc?: string
  videoPoster?: any      // Image upload for poster
  videoAutoPlay?: boolean
  videoLoop?: boolean
  videoMuted?: boolean
  videoControls?: boolean
}
```

### CSS Classes

The component uses Tailwind CSS with custom perspective transforms defined in scoped styles.

### Responsive Behavior

- **Mobile**: All layouts stack vertically
- **Tablet (lg)**: Two-column grid for left/right layouts
- **Desktop**: Full effects including 3D perspectives

## Best Practices

1. **Images**: Use high-quality images (1000x1000px or larger)
2. **Videos**:
   - Keep under 5MB for fast loading
   - Use MP4 format for best compatibility
   - Always provide a poster image
   - Mute autoplay videos (required by most browsers)
3. **Text**: Keep headlines concise (under 60 characters)
4. **Buttons**: Limit to 2 CTA buttons maximum
5. **Accessibility**:
   - Add descriptive alt text for images
   - Include captions/transcripts for videos with important content

## Browser Support

All features are supported in modern browsers (Chrome, Firefox, Safari, Edge). The 3D perspective effects gracefully degrade on older browsers.

## Troubleshooting

**Issue**: Video doesn't autoplay
- **Solution**: Ensure video is muted and browser allows autoplay

**Issue**: 3D perspective doesn't appear
- **Solution**: Perspective effects only apply on screens ≥1024px (lg breakpoint)

**Issue**: Background glow not visible
- **Solution**: Ensure "Background Glow Effect" is enabled and screen is ≥1024px

## Migration from Old Hero

The new Hero component is backward compatible. Old configurations will continue to work with defaults:
- Existing `media` field → Maps to image asset type
- Existing layout → Maps to left text, right image
- All new features default to OFF, so existing pages won't change appearance

To take advantage of new features, edit your page in the CMS and configure the new options.
