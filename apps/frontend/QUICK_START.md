# Quick Start Guide - Modern UI Components

## Installation
All components are already set up in `src/components/ui/`. No additional installation needed!

## Basic Usage

### 1. Import Components
```tsx
import { Button, Card, Badge, Input, Modal, LoadingSpinner } from '@/components/ui';
```

### 2. Use Components

#### Button
```tsx
// Primary button
<Button variant="primary" onClick={handleClick}>
  Click Me
</Button>

// With loading state
<Button variant="ocean" loading={isLoading}>
  Submit
</Button>

// With icon
<Button variant="success" icon={<span>✓</span>}>
  Save
</Button>

// Different sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

#### Card
```tsx
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui';

<Card hover>
  <CardHeader>
    <h3 className="font-bold">Card Title</h3>
  </CardHeader>
  <CardBody>
    <p>Card content goes here</p>
  </CardBody>
  <CardFooter>
    <Button variant="primary">Action</Button>
  </CardFooter>
</Card>
```

#### Input
```tsx
<Input
  label="Email Address"
  type="email"
  placeholder="you@example.com"
  error={errors.email}
  required
/>

// With icon
<Input
  label="Search"
  icon={<SearchIcon />}
  placeholder="Search..."
/>
```

#### Badge
```tsx
<Badge variant="player">Player</Badge>
<Badge variant="success" icon={<span>✓</span>}>
  Active
</Badge>
<Badge variant="warning" size="lg">
  Pending
</Badge>
```

#### Modal
```tsx
const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  size="md"
  footer={
    <>
      <Button variant="ghost" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSave}>
        Save
      </Button>
    </>
  }
>
  <p>Modal content goes here</p>
</Modal>
```

#### Loading States
```tsx
// Spinner
<LoadingSpinner size="md" color="primary" />

// Full screen loading
<LoadingSpinner fullScreen />

// Skeleton loader
<SkeletonLoader type="card" count={3} />
<SkeletonLoader type="text" count={5} />
```

#### Empty State
```tsx
<EmptyState
  icon="📭"
  title="No results found"
  description="Try adjusting your search criteria"
  action={{
    label: "Clear Filters",
    onClick: handleClearFilters
  }}
/>
```

## Utility Classes

### Quick Styling
```tsx
// Cards
<div className="card p-6">Basic card</div>
<div className="card-hover p-6">Hoverable card</div>
<div className="card-interactive p-6">Interactive card</div>

// Buttons (if not using component)
<button className="btn-primary">Primary</button>
<button className="btn-ocean">Ocean</button>
<button className="btn-outline">Outline</button>

// Inputs (if not using component)
<input className="input-field" />

// Badges (if not using component)
<span className="badge-player">Player</span>
<span className="badge-success">Success</span>

// Glass effects
<div className="glass p-6">Glass morphism</div>
<div className="glass-white p-6">White glass</div>

// Gradient text
<h1 className="gradient-text">Gradient Title</h1>

// Animations
<div className="animate-fade-in-up">Fade in from bottom</div>
<div className="animate-slide-in-left animate-delay-200">
  Delayed slide in
</div>

// Hover effects
<div className="hover-lift">Lifts on hover</div>
<div className="hover-scale">Scales on hover</div>
<div className="hover-glow">Glows on hover</div>
```

## Common Patterns

### Form with Validation
```tsx
<form onSubmit={handleSubmit} className="space-y-5">
  <Input
    label="Full Name"
    name="name"
    value={formData.name}
    onChange={handleChange}
    error={errors.name}
    required
  />
  
  <Input
    label="Email"
    type="email"
    name="email"
    value={formData.email}
    onChange={handleChange}
    error={errors.email}
    required
  />
  
  <Button 
    type="submit" 
    variant="primary" 
    fullWidth 
    loading={isSubmitting}
  >
    Submit
  </Button>
</form>
```

### Stats Grid
```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  {stats.map((stat) => (
    <div key={stat.label} className="card-hover p-6">
      <div className="stat-icon bg-gradient-primary">
        {stat.icon}
      </div>
      <div className="text-3xl font-black text-primary-600 mb-1">
        {stat.value}
      </div>
      <div className="text-sm text-gray-500 font-medium">
        {stat.label}
      </div>
    </div>
  ))}
</div>
```

### Action Cards
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {actions.map((action) => (
    <Card key={action.id} interactive onClick={action.onClick}>
      <CardBody>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center text-2xl mb-4`}>
          {action.icon}
        </div>
        <h3 className="font-bold text-gray-900 mb-2">
          {action.title}
        </h3>
        <p className="text-sm text-gray-500">
          {action.description}
        </p>
      </CardBody>
    </Card>
  ))}
</div>
```

### Loading State
```tsx
{loading ? (
  <SkeletonLoader type="card" count={3} />
) : data.length > 0 ? (
  <div className="space-y-4">
    {data.map(item => (
      <Card key={item.id}>
        {/* Content */}
      </Card>
    ))}
  </div>
) : (
  <EmptyState
    icon="📭"
    title="No data available"
    description="Get started by adding your first item"
    action={{
      label: "Add Item",
      onClick: handleAdd
    }}
  />
)}
```

### Modal with Form
```tsx
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Create New Item"
  footer={
    <>
      <Button 
        variant="ghost" 
        onClick={() => setIsModalOpen(false)}
      >
        Cancel
      </Button>
      <Button 
        variant="primary" 
        onClick={handleSubmit}
        loading={isSubmitting}
      >
        Create
      </Button>
    </>
  }
>
  <div className="space-y-4">
    <Input
      label="Name"
      value={formData.name}
      onChange={(e) => setFormData({...formData, name: e.target.value})}
      required
    />
    <Input
      label="Description"
      value={formData.description}
      onChange={(e) => setFormData({...formData, description: e.target.value})}
    />
  </div>
</Modal>
```

## Tips & Best Practices

1. **Use semantic variants**: Choose button/badge variants based on action meaning
2. **Consistent spacing**: Use `gap-4`, `gap-6`, `space-y-4` for consistent spacing
3. **Loading states**: Always show loading feedback for async operations
4. **Empty states**: Provide helpful empty states with actions
5. **Animations**: Use subtle animations with delays for staggered effects
6. **Responsive**: Test on mobile, tablet, and desktop
7. **Accessibility**: Ensure keyboard navigation and screen reader support

## Color Reference

### When to Use Each Color
- **Primary (Indigo)**: Main actions, links, brand elements
- **Ocean (Cyan)**: Secondary actions, accents
- **Success (Green)**: Confirmations, positive actions
- **Warning (Amber)**: Cautions, warnings
- **Error (Red)**: Errors, destructive actions

### Sport Colors
- **Cricket**: Green (`#16a34a`)
- **Football**: Blue (`#2563eb`)
- **Kabaddi**: Amber (`#d97706`)
- **Volleyball**: Red (`#dc2626`)

## Need Help?

- Check `DESIGN_SYSTEM.md` for complete design system documentation
- See `UI_IMPROVEMENTS.md` for detailed improvement summary
- Look at existing pages (Home, Login, PlayerDashboard) for examples
