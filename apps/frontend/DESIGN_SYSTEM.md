# Score Ocean Design System

## Overview
A modern, clean, and professional design system built with Tailwind CSS, featuring glass morphism effects, smooth animations, and a deep ocean-inspired color palette.

## Color Palette

### Primary Colors
- **Ocean Deep (Navy)**: Used for backgrounds and depth
  - `primary-900` to `primary-950`: #03045E (Midnight deep sea)
  - `primary-800`: #023e8a
  - `primary-700`: #005f8e

- **Ocean Blue**: Main brand color for primary actions
  - `primary-600`: #0077B6 (Ocean blue)
  - `primary-500`: #0096c7
  - `primary-400`: #00B4D8 (Tropical cyan)

- **Cyan/Aqua**: Secondary brand color for accents and highlights
  - `primary-300`: #48cae4
  - `primary-200`: #90E0EF (Shallow water)
  - `primary-100`: #CAF0F8 (Sea foam)
  - `primary-50`: #e6f9ff

### Ocean Semantic Colors
- **Deep**: `#03045E` - Midnight ocean, backgrounds
- **Mid**: `#0077B6` - Ocean blue, primary actions
- **Cyan**: `#00B4D8` - Tropical cyan, highlights
- **Shallow**: `#90E0EF` - Light accents
- **Foam**: `#CAF0F8` - Subtle highlights

### Semantic Colors
- **Success**: `#22c55e` (Green) - Confirmations, success states
- **Warning**: `#fbbf24` (Yellow) - Warnings, cautions
- **Error**: `#ef4444` (Red) - Errors, destructive actions

### Sport-Specific Colors
- **Cricket**: `#00B4D8` (Cyan)
- **Football**: `#0077B6` (Ocean Blue)
- **Kabaddi**: `#90E0EF` (Shallow)
- **Volleyball**: `#48cae4` (Light Cyan)

## Typography

### Font Families
- **Body**: Barlow (300-700 weights)
- **Display/Headings**: Barlow Condensed (300-900 weights)

### Font Sizes
- `text-xs`: 0.75rem (12px)
- `text-sm`: 0.875rem (14px)
- `text-base`: 1rem (16px)
- `text-lg`: 1.125rem (18px)
- `text-xl`: 1.25rem (20px)
- `text-2xl`: 1.5rem (24px)
- `text-3xl`: 1.875rem (30px)
- `text-4xl`: 2.25rem (36px)
- `text-5xl`: 3rem (48px)

## Components

### Buttons

#### Variants
```tsx
<button className="btn-primary">Primary Button</button>
<button className="btn-ocean">Ocean Button</button>
<button className="btn-success">Success Button</button>
<button className="btn-outline">Outline Button</button>
<button className="btn-ghost">Ghost Button</button>
```

#### Sizes
```tsx
<button className="btn-primary btn-sm">Small</button>
<button className="btn-primary">Medium (default)</button>
<button className="btn-primary btn-lg">Large</button>
```

#### Features
- Smooth hover animations with scale and shadow effects
- Active state with scale-down effect
- Disabled state with reduced opacity
- Loading state support

### Cards

#### Variants
```tsx
<div className="card">Basic Card</div>
<div className="card-hover">Hoverable Card</div>
<div className="card-interactive">Interactive Card</div>
<div className="card-gradient">Gradient Card</div>
<div className="card-glass">Glass Morphism Card</div>
```

#### Features
- Rounded corners (2xl = 16px)
- Subtle shadows with hover effects
- Border and background variations
- Smooth transitions

### Inputs

```tsx
<input className="input-field" placeholder="Enter text" />
<input className="input-field-error" placeholder="With error" />
```

#### Features
- Focus ring with primary color
- Error state styling
- Icon support with `input-with-icon` class
- Smooth transitions

### Badges

```tsx
<span className="badge-player">Player</span>
<span className="badge-team">Team</span>
<span className="badge-org">Organization</span>
<span className="badge-success">Success</span>
<span className="badge-warning">Warning</span>
<span className="badge-error">Error</span>
```

#### Sizes
- Default: `badge`
- Large: `badge-lg`

### Modals

```tsx
<div className="modal-overlay">
  <div className="modal-content">
    <div className="modal-header">Header</div>
    <div className="modal-body">Content</div>
    <div className="modal-footer">Footer</div>
  </div>
</div>
```

#### Features
- Backdrop blur effect
- Smooth fade-in animation
- Keyboard (ESC) support
- Click outside to close
- Responsive sizing

## Effects

### Glass Morphism
```tsx
<div className="glass">Transparent glass effect</div>
<div className="glass-dark">Dark glass effect</div>
<div className="glass-white">White glass effect</div>
<div className="glass-card">Card with glass effect</div>
```

### Gradient Text
```tsx
<span className="gradient-text">Ocean gradient (animated)</span>
<span className="gradient-text-cyan">Cyan gradient</span>
<span className="gradient-text-ocean">Ocean blue gradient</span>
```

### Shadows
- `shadow-soft`: Subtle shadow
- `shadow-medium`: Medium shadow
- `shadow-strong`: Strong shadow
- `shadow-card`: Card shadow
- `shadow-card-hover`: Card hover shadow
- `shadow-glow`: Glow effect (cyan)
- `shadow-glow-ocean`: Glow effect (ocean blue)
- `shadow-glow-deep`: Glow effect (deep navy)

## Animations

### Available Animations
- `animate-fade-in`: Fade in
- `animate-fade-in-up`: Fade in from bottom
- `animate-fade-in-down`: Fade in from top
- `animate-slide-in-left`: Slide in from left
- `animate-slide-in-right`: Slide in from right
- `animate-slide-up`: Slide up
- `animate-scale-in`: Scale in
- `animate-float`: Floating animation
- `animate-shimmer`: Shimmer effect
- `animate-skeleton`: Skeleton loading
- `animate-glow`: Glow pulse
- `animate-pulse-slow`: Slow pulse
- `animate-bounce-slow`: Slow bounce

### Animation Delays
```tsx
<div className="animate-fade-in-up animate-delay-100">Delayed 100ms</div>
<div className="animate-fade-in-up animate-delay-200">Delayed 200ms</div>
// Available: 100, 200, 300, 400, 500, 600, 700, 800ms
```

## Loading States

### Spinner
```tsx
<LoadingSpinner size="sm" color="primary" />
<LoadingSpinner size="md" color="ocean" />
<LoadingSpinner size="lg" color="white" />
<LoadingSpinner fullScreen />
```

### Skeleton
```tsx
<SkeletonLoader type="text" count={3} />
<SkeletonLoader type="title" />
<SkeletonLoader type="avatar" />
<SkeletonLoader type="card" />
<SkeletonLoader type="stat" />
```

## Empty States

```tsx
<EmptyState
  icon="📭"
  title="No items found"
  description="Try adjusting your filters"
  action={{
    label: "Add Item",
    onClick: () => {}
  }}
/>
```

## Responsive Design

### Breakpoints
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Grid Layouts
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Responsive grid */}
</div>
```

## Best Practices

### Spacing
- Use consistent spacing: `gap-3`, `gap-4`, `gap-6`, `gap-8`
- Padding: `p-4`, `p-6`, `p-8` for cards and containers
- Margins: `mb-4`, `mb-6`, `mb-8` for vertical spacing

### Colors
- Use semantic colors for actions (success, warning, error)
- Maintain contrast ratios for accessibility
- Use sport-specific colors only for sport-related content

### Animations
- Keep animations subtle and purposeful
- Use delays for staggered animations
- Avoid excessive motion

### Accessibility
- Include focus states on interactive elements
- Use semantic HTML
- Provide alt text for images
- Ensure sufficient color contrast
- Support keyboard navigation

## Dark Mode Support

Dark mode classes are available with the `dark:` prefix:
```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Content
</div>
```

To enable dark mode, add `class="dark"` to the `<html>` element.

## Component Library

All UI components are available in `src/components/ui/`:
- Button
- Card (with Header, Body, Footer)
- Badge
- Input
- Modal
- LoadingSpinner
- EmptyState
- SkeletonLoader
- Toast

Import them using:
```tsx
import { Button, Card, Badge, Input, Modal } from '@/components/ui';
```

## Performance Tips

1. Use CSS classes instead of inline styles
2. Leverage Tailwind's JIT compiler
3. Minimize custom CSS
4. Use skeleton loaders for perceived performance
5. Optimize animations for 60fps
6. Lazy load images and heavy components

## Future Enhancements

- [ ] Complete dark mode implementation
- [ ] Add more animation presets
- [ ] Create form validation components
- [ ] Add data table components
- [ ] Implement toast notification system
- [ ] Create dropdown/select components
- [ ] Add chart/graph components
- [ ] Implement drag-and-drop utilities
