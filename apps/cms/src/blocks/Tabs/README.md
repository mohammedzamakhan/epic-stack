# Tabs Block

A flexible tabs component that allows you to display content in an interactive tabbed interface. Perfect for showcasing features, services, or any content that benefits from organized presentation.

## Features

- **Interactive Tabs**: Click-based navigation between different content panels
- **Flexible Content**: Support for both images and videos in tab panels
- **Responsive Design**: Adapts to different screen sizes with mobile-first approach
- **Customizable Icons**: SVG icons for each tab with hover effects
- **Action Buttons**: Primary and secondary call-to-action buttons
- **Smooth Animations**: CSS transitions for tab switching and hover effects

## Configuration

### Basic Fields

- **Title**: Main heading for the tabs section
- **Subtitle/Tagline**: Small text above the title (displayed with monospace font)
- **Description**: Descriptive text below the title

### Tabs Array

Each tab can contain:

- **Title**: Tab heading
- **Description**: Tab description (shown when tab is active)
- **Icon**: SVG icon code for the tab
- **Content Type**: Choose between 'image' or 'video'
- **Image URL**: URL for image content (when content type is 'image')
- **Video URL**: URL for video content (when content type is 'video')

### Action Buttons

- **Primary Button**: Text and URL for the main call-to-action
- **Secondary Button**: Text and URL for the secondary action (displayed as a link with arrow)

## Usage Example

The tabs block is perfect for:

- Feature showcases with different product capabilities
- Service offerings with detailed explanations
- Product demos with images and videos
- Step-by-step processes or workflows
- Before/after comparisons

## Technical Implementation

- Built with Astro components following the app's design system
- Uses CSS Grid and Flexbox for responsive layouts
- JavaScript for tab interaction and state management
- Follows the app's color scheme and typography
- Includes hover effects and smooth transitions
- Supports keyboard navigation (can be enhanced further)

## Styling

The component follows the app's design system:

- Uses `GridDesign` component for background patterns
- Follows the established color palette (`primary`, `muted-foreground`, etc.)
- Responsive breakpoints for mobile, tablet, and desktop
- Consistent spacing and typography with other blocks
- Border styling with dashed borders matching the app's aesthetic

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- JavaScript required for tab functionality
- Graceful degradation for users with JavaScript disabled