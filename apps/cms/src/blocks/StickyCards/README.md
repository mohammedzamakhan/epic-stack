# Sticky Cards Block

A visually engaging sticky cards component that creates a layered scrolling effect where cards stick to the viewport as users scroll. Perfect for showcasing features, services, or step-by-step processes with alternating layouts.

## Features

- **Sticky Scroll Effect**: Cards stick to the viewport during scroll, creating an engaging layered effect
- **Alternating Layouts**: Cards alternate between left-content/right-image and right-content/left-image layouts
- **Responsive Design**: Adapts to different screen sizes with mobile-first approach
- **Flexible Content**: Each card supports custom taglines, titles, descriptions, and images
- **Action Buttons**: Primary and secondary call-to-action buttons for each card
- **Smooth Animations**: CSS transitions and optional scroll-based animations

## Configuration

### Basic Fields

- **Title**: Main heading for the sticky cards section
- **Subtitle/Tagline**: Small text above the title (displayed with monospace font)
- **Description**: Descriptive text below the title

### Cards Array

Each card can contain:

- **Tagline**: Small tagline text for the card
- **Title**: Card heading
- **Description**: Card description text
- **Image**: URL for the card image
- **Primary Button**: Text and URL for the main call-to-action
- **Secondary Button**: Text and URL for the secondary action (displayed as a link with arrow)

## Layout Behavior

- **Card 1**: Content on left, image on right
- **Card 2**: Image on left, content on right
- **Card 3**: Content on left, image on right
- **Card 4**: Image on left, content on right
- And so on...

## Usage Example

The sticky cards block is perfect for:

- Feature showcases with detailed explanations
- Step-by-step process walkthroughs
- Service offerings with visual examples
- Product benefits with supporting imagery
- Timeline-based content presentation
- Before/after comparisons

## Technical Implementation

- Built with Astro components following the app's design system
- Uses CSS `position: sticky` for the scroll effect
- CSS Grid for responsive card layouts
- JavaScript for optional scroll-based animations
- Follows the app's color scheme and typography
- Z-index stacking for proper layering effect

## Responsive Behavior

- **Desktop**: Two-column layout with sticky positioning
- **Tablet**: Maintains two-column with adjusted spacing
- **Mobile**: Single column layout with static positioning (no sticky effect)

## Styling

The component follows the app's design system:

- Uses `GridDesign` component for background patterns
- Follows the established color palette (`primary`, `muted-foreground`, etc.)
- Responsive breakpoints for mobile, tablet, and desktop
- Consistent spacing and typography with other blocks
- Border styling with dashed borders matching the app's aesthetic
- Proper z-index management for stacking effect

## Performance Considerations

- Images are lazy-loaded for better performance
- Sticky positioning is disabled on mobile to improve performance
- Minimal JavaScript for optional enhancements
- CSS-based animations for smooth performance

## Browser Support

- Modern browsers with CSS Grid and `position: sticky` support
- Graceful degradation for older browsers (falls back to static positioning)
- Optional JavaScript enhancements for scroll-based animations

## Accessibility

- Proper heading hierarchy (h2 for main title, h3 for card titles)
- Alt text support for images
- Keyboard navigation support for buttons
- Screen reader friendly structure