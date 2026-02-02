# Smart Adaptive Tourism Assistant (SATA) - Design Guidelines

## Design Approach
**Reference-Based Approach** drawing inspiration from:
- **Airbnb**: Card-based layouts, visual storytelling, generous imagery
- **Google Maps**: Functional clarity, intuitive navigation tools
- **Booking.com**: Balanced information density with visual appeal

**Key Principles**: Exploratory discovery, visual richness, trustworthy data presentation, seamless wayfinding

---

## Typography System

**Font Families** (via Google Fonts CDN):
- **Primary**: Inter (headings, UI elements, body text)
- **Accent**: Space Grotesk (hero headlines, feature callouts)

**Hierarchy**:
- Hero Headlines: Space Grotesk, 56-64px, bold
- Section Headings: Inter, 36-42px, semibold
- Card Titles: Inter, 20-24px, medium
- Body Text: Inter, 16px, regular
- Captions/Meta: Inter, 14px, regular
- Button Text: Inter, 15px, medium

---

## Layout System

**Spacing Primitives** (Tailwind units):
- Core spacing: `2, 4, 6, 8, 12, 16, 24`
- Section padding: `py-16 md:py-24` for desktop, `py-12` for mobile
- Card padding: `p-6`
- Component gaps: `gap-6` or `gap-8`

**Container Strategy**:
- Full-width sections with inner `max-w-7xl mx-auto px-6`
- Content sections: `max-w-6xl`
- Text-heavy content: `max-w-4xl`

**Grid Patterns**:
- Feature cards: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Attraction listings: `grid-cols-1 lg:grid-cols-2 gap-8`
- Event cards: `grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6`

---

## Core Components

### Navigation
- Fixed top navigation with glass-morphism effect (`backdrop-blur-md`)
- Logo left, main nav center, CTA right
- Mobile: Hamburger menu with slide-out drawer
- Include: Home, Forecast, Route Planner, Reviews, Events

### Hero Section (Home Page)
- Full-width, 85vh height
- **Large hero image**: Stunning destination panorama with travelers/landmarks
- Overlay gradient for text readability
- Center-aligned headline + subheadline
- Primary CTA: "Plan Your Smart Journey" with blurred background button (`backdrop-blur-sm bg-white/20`)
- Search bar below CTA: Destination input + Date picker + "Get Forecast" button

### Cards
**Attraction Cards**:
- Image top (16:9 ratio), rounded corners (`rounded-xl`)
- Content padding `p-6`
- Title, location icon + city, crowd meter visualization
- "View Forecast" button bottom-right

**Event Cards**:
- Compact design with left-aligned date badge
- Event image (square ratio)
- Title, tags (pill-shaped), venue info
- "Learn More" link

**Review Cards** (Blockchain):
- Verified badge icon (shield with checkmark)
- User avatar + name + verification status
- Star rating display (5-star system)
- Review text with "Read More" for long content
- Blockchain hash displayed subtly at bottom
- Transaction ID as monospace text

### Route Planner Interface
- Two-column layout: Map (60% width) | Sidebar (40% width)
- Sidebar contains:
  - Multi-stop destination inputs (drag to reorder)
  - Route optimization toggle
  - Weather/traffic indicators
  - "Generate Route" button
  - Route summary (distance, time, crowd warnings)
- Map: Full-height, interactive with custom markers

### Forecast Dashboard
- Hero stat cards in 4-column grid: Total Attractions, Avg Crowd Level, Weather Alerts, Recommendations
- Chart section: Line chart showing predicted visitor counts over 7 days
- Attraction selection dropdown + date picker
- Crowd level indicator: Visual gauge (empty → moderate → crowded)
- Weather impact badges

### Cultural Events Section
- Filter bar: City selector, date range, category tags
- Masonry grid layout for varied event card heights
- Featured event: Large card spanning 2 columns
- "AI Recommended for You" badge on personalized suggestions

### Analytics Dashboard (Bonus)
- Grid layout: 2x2 for key metrics
- Donut chart: Visitor distribution by attraction
- Bar chart: Route efficiency comparison
- Real-time activity feed (scrollable list)

---

## Images

**Hero Image**: 
- Panoramic destination shot (beach, mountains, or city skyline with tourists)
- High-quality, vibrant, aspirational travel photography
- Position: Full-width hero section

**Attraction Cards**: 
- Landscape photos of tourist destinations
- 16:9 ratio, high resolution

**Event Cards**: 
- Cultural event photos (festivals, performances, local cuisine)
- Square ratio preferred

**Review Section**: 
- Optional: User avatars (can use placeholders or initials)

**About/Trust Section**:
- Team photos or technology visualization (blockchain network, AI processing)

---

## Icons
**Library**: Heroicons (via CDN)
- Navigation: outline variants
- Cards/Features: solid variants for emphasis
- Interface actions: outline variants
- Size: `w-5 h-5` for inline, `w-8 h-8` for feature icons, `w-12 h-12` for section headers

---

## Interaction Patterns
- Hover states: Subtle scale (`hover:scale-105`) on cards
- Buttons: No custom hover interactions (use default Button component)
- Smooth scrolling between sections
- Loading states: Skeleton screens for forecast/route data
- Form validation: Inline error messages below inputs

---

## Accessibility
- Minimum contrast ratios met for all text
- Focus indicators on all interactive elements
- ARIA labels for icons and complex components
- Keyboard navigation support throughout
- Alt text for all images

---

**Final Note**: Create a visually stunning, trustworthy travel companion that balances beautiful imagery with functional data presentation. Every section should feel purposeful and polished, inspiring users to explore with confidence.