# Score Ocean - Design Specification

## 1. Design Philosophy

### 1.1 Core Principles
- **Modern & Clean**: Minimalist interface with focus on content
- **Mobile-First**: Optimized for smartphone usage
- **Sports-Centric**: Dynamic, energetic visual language
- **Data-Driven**: Clear visualization of statistics and performance
- **Accessible**: Inclusive design for all users

### 1.2 Design Goals
- Reduce cognitive load with clear information hierarchy
- Create emotional connection through sports imagery
- Enable quick actions with minimal taps/clicks
- Build trust through professional, polished UI
- Ensure consistency across all platforms

## 2. Visual Design System

### 2.1 Color Palette

**Primary Colors:**
- Ocean Blue: `#0066FF` - Primary actions, headers
- Deep Blue: `#0047AB` - Hover states, emphasis
- Light Blue: `#E6F2FF` - Backgrounds, subtle highlights

**Secondary Colors:**
- Victory Green: `#00C853` - Success, wins, positive stats
- Energy Orange: `#FF6B35` - CTAs, highlights, live indicators
- Warning Amber: `#FFA726` - Warnings, pending states

**Neutral Colors:**
- Dark: `#1A1A1A` - Primary text
- Medium Gray: `#666666` - Secondary text
- Light Gray: `#F5F5F5` - Backgrounds
- White: `#FFFFFF` - Cards, surfaces

**Sport-Specific Accent Colors:**
- Cricket: `#4CAF50` (Green pitch)
- Football: `#2196F3` (Blue)
- Kabaddi: `#FF5722` (Orange/Red)
- Volleyball: `#FFD700` (Gold)

### 2.2 Typography

**Font Family:**
- Primary: Inter (clean, modern, excellent readability)
- Secondary: Poppins (headings, bold statements)
- Monospace: JetBrains Mono (statistics, numbers)

**Type Scale:**

- H1: 32px/40px (bold) - Page titles
- H2: 24px/32px (semibold) - Section headers
- H3: 20px/28px (semibold) - Card titles
- H4: 18px/24px (medium) - Subsections
- Body Large: 16px/24px (regular) - Primary content
- Body: 14px/20px (regular) - Secondary content
- Caption: 12px/16px (regular) - Labels, metadata
- Button: 16px/24px (medium) - Action buttons

### 2.3 Spacing System
Based on 8px grid system:
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

### 2.4 Elevation & Shadows
- Level 0: No shadow (flat surfaces)
- Level 1: `0 2px 4px rgba(0,0,0,0.08)` - Cards
- Level 2: `0 4px 8px rgba(0,0,0,0.12)` - Dropdowns, tooltips
- Level 3: `0 8px 16px rgba(0,0,0,0.16)` - Modals, dialogs
- Level 4: `0 16px 32px rgba(0,0,0,0.20)` - Navigation drawer

### 2.5 Border Radius
- Small: 4px - Buttons, inputs
- Medium: 8px - Cards
- Large: 16px - Modals, images
- Full: 9999px - Pills, avatars

### 2.6 Iconography
- Icon Library: Lucide Icons / Heroicons
- Size: 16px, 20px, 24px, 32px
- Style: Outline for navigation, Solid for actions
- Consistent stroke width: 2px

## 3. Component Design

### 3.1 Navigation

**Top Navigation Bar (Web)**
- Fixed position, 64px height
- Logo on left
- Primary navigation links (center)
- User profile dropdown (right)
- Notification bell icon
- Search bar (expandable)
- Glassmorphism effect on scroll

**Bottom Navigation (Mobile)**
- Fixed bottom, 56px height
- 5 primary tabs: Home, Tournaments, Teams, Profile, More
- Active state with icon + label
- Inactive state with icon only
- Smooth transitions

**Sidebar Navigation (Web - Dashboard)**
- 240px width (collapsible to 64px)
- Grouped menu items
- Active state highlight
- Hover effects
- Icons + labels

### 3.2 Cards

**Player Card**
- Profile photo (circular, 80px)
- Name (H3)
- Position badge
- Primary sport icon
- Key stats (3-4 metrics)
- SOR rating badge
- CTA button
- Hover: Lift effect + shadow

**Team Card**
- Team logo (square, 64px)
- Team name (H3)
- Location + sport icon
- Member count
- Win rate indicator
- Recent form (W/L/D badges)
- Hover: Scale + glow effect

**Tournament Card**
- Sport-specific gradient background
- Tournament name (H3)
- Date range
- Location
- Teams registered / max teams
- Registration status badge
- Prize pool (if applicable)
- Register button

**Match Card**
- Team 1 vs Team 2 layout
- Team logos (48px each)
- Score display (large, bold)
- Match status (Live/Upcoming/Completed)
- Date/time
- Venue
- View details link

### 3.3 Buttons

**Primary Button**
- Background: Ocean Blue
- Text: White
- Padding: 12px 24px
- Border radius: 8px
- Hover: Darker blue + lift
- Active: Scale down slightly

**Secondary Button**
- Border: 2px Ocean Blue
- Text: Ocean Blue
- Background: Transparent
- Hover: Light blue background

**Ghost Button**
- Text: Ocean Blue
- Background: Transparent
- Hover: Light background

**Icon Button**
- 40px × 40px
- Circular
- Icon centered
- Hover: Background color

**Floating Action Button (FAB)**
- 56px × 56px
- Circular
- Energy Orange background
- Fixed bottom-right
- Shadow level 3
- Primary action (e.g., Create Tournament)

### 3.4 Forms

**Input Fields**
- Height: 48px
- Border: 1px Light Gray
- Border radius: 8px
- Padding: 12px 16px
- Focus: Ocean Blue border + shadow
- Error: Red border + error message below
- Success: Green border + checkmark icon
- Label: Above input, 14px, Medium Gray
- Placeholder: Light Gray

**Dropdown/Select**
- Same styling as input
- Chevron icon on right
- Dropdown menu: White background, shadow level 2
- Options: Hover background Light Gray
- Selected: Ocean Blue background

**Radio Buttons & Checkboxes**
- Custom styled
- 20px × 20px
- Ocean Blue when selected
- Smooth animation

**File Upload**
- Drag & drop zone
- Dashed border
- Upload icon + text
- Preview thumbnails
- Progress bar during upload

### 3.5 Data Visualization

**Statistics Cards**
- Large number display (H1, bold)
- Label below (Caption)
- Icon or trend indicator
- Color-coded (green for positive, red for negative)
- Compact layout

**Progress Bars**
- Height: 8px
- Border radius: Full
- Background: Light Gray
- Fill: Gradient (Ocean Blue to Deep Blue)
- Animated on load

**Charts & Graphs**
- Library: Chart.js / Recharts
- Line charts: Performance trends
- Bar charts: Comparisons
- Pie charts: Distribution
- Radar charts: Player attributes
- Color scheme: Brand colors
- Tooltips on hover
- Responsive

**Points Table**
- Zebra striping (alternate row colors)
- Fixed header on scroll
- Highlight user's team
- Sortable columns
- Responsive (horizontal scroll on mobile)

### 3.6 Badges & Tags

**Status Badges**
- Pill shape (border radius: full)
- Small padding: 4px 12px
- Font size: 12px
- Colors:
  - Live: Red background, white text, pulsing animation
  - Upcoming: Blue background
  - Completed: Gray background
  - Registered: Green background
  - Pending: Amber background

**Sport Tags**
- Icon + label
- Rounded corners
- Sport-specific colors
- Small size: 24px height

**Achievement Badges**
- Circular or shield shape
- Gradient backgrounds
- Icon centered
- Glow effect
- Tooltip with description

### 3.7 Modals & Dialogs

**Modal Structure**
- Centered on screen
- Max width: 600px
- White background
- Shadow level 4
- Border radius: 16px
- Close button (top-right)
- Backdrop: Dark overlay (60% opacity)
- Animation: Fade in + scale

**Confirmation Dialog**
- Icon at top (warning/success)
- Title (H3)
- Description text
- Two buttons: Cancel (secondary) + Confirm (primary)

**Bottom Sheet (Mobile)**
- Slides up from bottom
- Rounded top corners
- Drag handle at top
- Swipe down to dismiss

### 3.8 Lists & Tables

**List Items**
- 64px height (minimum)
- Left: Icon or avatar
- Center: Primary text + secondary text
- Right: Action or metadata
- Divider between items
- Hover: Background color change

**Data Tables**
- Header: Bold, background Light Gray
- Rows: 48px height
- Borders: Subtle, Light Gray
- Sortable columns (arrow icons)
- Pagination at bottom
- Actions column (right)
- Responsive: Card view on mobile

### 3.9 Empty States

**No Data Illustration**
- Custom illustration (sports-themed)
- Heading: "No [content] yet"
- Description: Helpful text
- CTA button: Primary action
- Centered layout

### 3.10 Loading States

**Skeleton Screens**
- Animated gradient shimmer
- Match content structure
- Light Gray background
- Smooth transition to actual content

**Spinners**
- Circular spinner (Ocean Blue)
- Size: 24px (inline), 48px (full page)
- Smooth rotation animation

**Progress Indicators**
- Linear progress bar
- Percentage display
- Step indicators for multi-step forms

## 4. Page Layouts

### 4.1 Landing Page (Public)

**Hero Section**
- Full viewport height
- Gradient background (Ocean Blue to Deep Blue)
- Large heading: "Your Sports Journey Starts Here"
- Subheading: Value proposition
- CTA buttons: "Get Started" + "Learn More"
- Hero image/animation (sports action)

**Features Section**
- 3-column grid (responsive)
- Icon + heading + description per feature
- Alternating image + text sections

**Statistics Section**
- 4 key metrics (users, tournaments, teams, matches)
- Animated counters
- Dark background

**Testimonials**
- Carousel of user testimonials
- Profile photo + quote + name + role

**CTA Section**
- Strong call-to-action
- Sign up form or button
- Background: Energy Orange

**Footer**
- Links: About, Contact, Terms, Privacy
- Social media icons
- Copyright

### 4.2 Dashboard (Role-Specific)

**Player Dashboard**
- Welcome banner with profile summary
- Quick stats cards (4 metrics)
- Recent matches list
- Upcoming tournaments
- Performance chart
- Activity feed
- Sidebar navigation

**Team Dashboard**
- Team header (logo, name, stats)
- Active tournaments section
- Team roster grid
- Upcoming matches
- Team performance chart
- Recent activity

**Organization Dashboard**
- Overview metrics (tournaments, revenue, teams)
- Active tournaments list
- Pending approvals
- Revenue chart
- Quick actions (Create Tournament)

### 4.3 Profile Pages

**Player Profile**
- Cover photo (optional)
- Profile photo (large, centered)
- Name + verification badge
- Location + age
- Primary sport + position
- Bio
- Tabs: Stats, History, Achievements, Teams
- Edit button (own profile)
- Connect button (other profiles)

**Team Profile**
- Team banner
- Logo (large)
- Team info section
- Tabs: Overview, Roster, Matches, Stats
- Join/Leave button

**Organization Profile**
- Organization banner
- Logo
- Info section
- Tabs: About, Tournaments, Reviews
- Contact button

### 4.4 Tournament Pages

**Tournament Listing**
- Filters sidebar (sport, location, date, status)
- Search bar
- Sort options
- Grid of tournament cards
- Pagination

**Tournament Detail**
- Tournament header (name, dates, location)
- Registration status
- Tabs: Overview, Teams, Fixtures, Points Table, Results
- Register button (prominent)
- Share button

**Live Match View**
- Score display (large, centered)
- Team logos and names
- Match timeline/commentary
- Player stats
- Live indicator (pulsing)

### 4.5 Forms & Wizards

**Multi-Step Tournament Creation**
- Progress indicator at top
- Step 1: Basic Info
- Step 2: Format & Rules
- Step 3: Registration Settings
- Step 4: Review & Publish
- Back/Next buttons
- Save as draft option

## 5. Responsive Design

### 5.1 Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px
- Large Desktop: > 1440px

### 5.2 Mobile Adaptations
- Single column layouts
- Bottom navigation instead of top
- Hamburger menu for secondary nav
- Swipeable carousels
- Touch-friendly targets (min 44px)
- Simplified tables (card view)
- Collapsible sections

### 5.3 Tablet Adaptations
- 2-column grids
- Sidebar navigation (collapsible)
- Optimized for both portrait and landscape

## 6. Animations & Transitions

### 6.1 Micro-interactions
- Button hover: Scale 1.02 + shadow
- Card hover: Lift + shadow increase
- Input focus: Border color + subtle glow
- Toggle switches: Smooth slide
- Checkbox: Checkmark draw animation
- Loading: Skeleton shimmer

### 6.2 Page Transitions
- Fade in: 200ms
- Slide in: 300ms ease-out
- Modal: Fade + scale 250ms

### 6.3 Live Updates
- Score change: Pulse animation
- New notification: Slide in from top
- Real-time data: Smooth number transitions

## 7. Accessibility

### 7.1 Standards
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader optimization
- Focus indicators
- Alt text for images
- ARIA labels

### 7.2 Color Contrast
- Text: Minimum 4.5:1 ratio
- Large text: Minimum 3:1 ratio
- Interactive elements: Clear visual feedback

### 7.3 Inclusive Design
- Scalable text (up to 200%)
- No color-only information
- Captions for videos
- Clear error messages
- Sufficient touch targets

## 8. Design Patterns

### 8.1 Information Architecture
- Clear hierarchy
- Logical grouping
- Breadcrumbs for deep navigation
- Search functionality
- Contextual help

### 8.2 User Flows
- Minimal steps to complete actions
- Clear progress indicators
- Confirmation for destructive actions
- Undo options where applicable
- Smart defaults

### 8.3 Feedback & Validation
- Inline validation (real-time)
- Success messages (toast notifications)
- Error messages (clear, actionable)
- Loading states
- Empty states

## 9. Branding Elements

### 9.1 Logo
- Primary: Full logo with text
- Icon: Wave symbol (ocean theme)
- Variations: Light and dark versions
- Clear space: Minimum padding

### 9.2 Imagery Style
- High-quality sports photography
- Action shots
- Diverse representation
- Consistent color grading
- Authentic, not stock-looking

### 9.3 Illustrations
- Custom sports-themed illustrations
- Flat design style
- Brand color palette
- Used for empty states, onboarding

### 9.4 Voice & Tone
- Energetic but professional
- Encouraging and supportive
- Clear and concise
- Avoid jargon
- Celebrate achievements

## 10. Platform-Specific Considerations

### 10.1 Web Application
- Progressive Web App (PWA)
- Offline capability for key features
- Desktop-optimized layouts
- Keyboard shortcuts
- Browser notifications

### 10.2 Mobile Application
- Native feel with React Native
- Platform-specific patterns (iOS/Android)
- Gesture controls
- Push notifications
- Camera integration for profile photos
- Location services

### 10.3 Performance
- Lazy loading images
- Code splitting
- Optimized assets
- CDN for static content
- Caching strategies

## 11. Design Deliverables

### 11.1 Design System
- Component library (Figma/Storybook)
- Style guide documentation
- Icon set
- Pattern library

### 11.2 Mockups
- High-fidelity designs for all key screens
- Mobile and desktop versions
- Interactive prototypes
- User flow diagrams

### 11.3 Assets
- Logo files (SVG, PNG)
- Icon set
- Illustrations
- Image templates
- Brand guidelines PDF

## 12. Technical Implementation

### 12.1 Frontend Stack
- **Framework:** React 18+ with TypeScript
- **Styling:** Tailwind CSS v3+
- **Build Tool:** Vite
- **State Management:** Zustand + React Query
- **Routing:** React Router v6
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts / Chart.js
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **HTTP Client:** Axios

### 12.2 Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#E6F2FF',
          100: '#CCE5FF',
          200: '#99CCFF',
          300: '#66B2FF',
          400: '#3399FF',
          500: '#0066FF', // Primary
          600: '#0052CC',
          700: '#0047AB', // Deep Blue
          800: '#003D99',
          900: '#003366',
        },
        victory: {
          500: '#00C853',
        },
        energy: {
          500: '#FF6B35',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      boxShadow: {
        'card': '0 2px 4px rgba(0,0,0,0.08)',
        'card-hover': '0 4px 8px rgba(0,0,0,0.12)',
        'modal': '0 16px 32px rgba(0,0,0,0.20)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

### 12.3 Component Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Badge.tsx
│   ├── layout/          # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── player/          # Player-specific components
│   ├── team/            # Team-specific components
│   └── tournament/      # Tournament-specific components
├── pages/               # Page components
├── hooks/               # Custom React hooks
├── services/            # API services
├── store/               # State management
├── utils/               # Utility functions
├── types/               # TypeScript types
└── styles/              # Global styles
```

### 12.4 Tailwind Utility Classes

**Common Patterns:**

```jsx
// Card Component
<div className="bg-white rounded-lg shadow-card hover:shadow-card-hover transition-shadow p-6">

// Primary Button
<button className="bg-ocean-500 hover:bg-ocean-600 text-white font-medium px-6 py-3 rounded-lg transition-colors">

// Input Field
<input className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none transition-all" />

// Badge
<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-victory-500 text-white">

// Grid Layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```
