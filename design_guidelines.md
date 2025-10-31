# Closana Design Guidelines

## Design Approach

**Reference-Based Approach:** Drawing inspiration from Pinterest's visual organization, Instagram's clean image-focused aesthetic, and Notion's elegant categorization systems. This app prioritizes visual storytelling and intuitive content organization for fashion-conscious users.

**Core Design Principles:**
- Visual-first hierarchy: Images and visual content lead, text supports
- Touch-optimized interactions for mobile-first experience
- Breathing room: Generous spacing for elegant, uncluttered feel
- Consistent visual language across all screens and flows

---

## Typography

**Font Families:**
- Primary: 'Inter' (400, 500, 600) - UI elements, body text, labels
- Display: 'Playfair Display' (600, 700) - Page titles, section headers for elegant touch

**Type Scale:**
- Display titles: text-4xl to text-5xl (Playfair Display, font-semibold)
- Section headers: text-2xl to text-3xl (Playfair Display, font-semibold)
- Subsection headers: text-xl (Inter, font-semibold)
- Body/labels: text-base (Inter, font-normal)
- Small labels/metadata: text-sm (Inter, font-medium)
- Micro text: text-xs (Inter, font-normal)

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 3, 4, 6, 8, 12, 16, 20, 24
- Micro spacing (gaps, padding within components): p-2, gap-3, space-y-2
- Component spacing: p-4, p-6, gap-4
- Section spacing: p-8, py-12, gap-8
- Page margins: px-4 (mobile), px-6 (tablet), px-8 (desktop)
- Vertical rhythm: space-y-8, space-y-12 between major sections

**Grid Systems:**
- Capsule item grid: grid-cols-2 (mobile), grid-cols-3 (tablet), grid-cols-5 (desktop)
- Category sections: Single column stacking on mobile, consider 2-column on larger screens where appropriate
- Shopping list: Single column throughout for easy scanning

**Container Strategy:**
- Max width: max-w-7xl for main content areas
- Mobile: Full width with px-4 padding
- Cards/Items: Aspect ratio cards (aspect-square for clothing items, aspect-[4/5] for outfit cards)

---

## Component Library

### Navigation
**Mobile Navigation (Primary):**
- Bottom tab bar with 4-5 main sections (Home/Capsules, Shopping List, Outfits, Profile)
- Icons + labels, always visible, sticky positioning
- Active state: Bold icon + text, subtle indicator line or fill

**Top Bar:**
- Simple header with back button (left), page title (center), action button (right)
- Transparent or minimal background, subtle shadow on scroll

### Cards & Content Blocks

**Capsule Summary Card:**
- Large card with capsule name, item count, last updated
- Visual preview: 4-6 mini thumbnails in a small grid
- Tap entire card to enter capsule
- Border radius: rounded-2xl, subtle shadow

**Item Slot Card:**
- Square or 4:5 aspect ratio
- Empty state: Dashed border, centered "+" icon
- Filled state: Image fills card, subtle overlay on bottom third with item name
- Corner badge for "shopping list" flag (shopping bag icon)
- Tap to view/edit details

**Outfit Suggestion Card:**
- Vertical card layout (aspect-[3/4])
- Collage of 3-4 outfit pieces arranged aesthetically
- Bottom section: Outfit name/occasion, small "heart" or "save" action

**Shopping List Item:**
- Horizontal card: Image (left, square thumbnail ~80px), details (right)
- Details: Item name, capsule source, product link button
- Swipe actions: Remove, mark as purchased

### Forms & Inputs

**Onboarding Question Cards:**
- Full-width cards with question at top
- Multiple choice: Large touch-friendly buttons (min height h-12), clear selected state
- Stacked vertically with gap-3
- Progress indicator at top (step dots or bar)

**Item Detail Form:**
- Image upload area: Large drop zone (min-h-48), dashed border when empty
- Text inputs: Standard height h-12, rounded-lg, clear focus states
- Product link: Input with "link" icon prefix
- Toggle for "Add to shopping list": Switch component, right-aligned

### Buttons & Actions

**Primary Action:**
- Solid fill, rounded-full or rounded-xl
- Height: h-12 (mobile), h-14 (larger screens)
- Full width on mobile (w-full), auto width with px-8 on larger screens
- Font: font-semibold, text-base

**Secondary Action:**
- Outlined style, same dimensions as primary
- Stroke width: border-2

**Icon Buttons:**
- Circular (rounded-full), w-10 h-10 or w-12 h-12
- Icons centered, appropriate sizing (w-5 h-5 or w-6 h-6)

**Buttons on Images:**
- Backdrop blur effect: backdrop-blur-md
- Semi-transparent background
- White or light text
- No hover states (mobile-first)

### Data Display

**Stats/Counts:**
- Horizontal row of stat blocks
- Each: Number (large, text-2xl, font-bold), label (text-sm below)
- Even spacing with gap-6 or gap-8

**Empty States:**
- Centered content (flex flex-col items-center)
- Icon (large, decorative)
- Heading + descriptive text
- Primary action button below

### Modals & Overlays

**Item Detail View:**
- Full screen modal (mobile)
- Header with close button, title
- Scrollable content area
- Fixed bottom action bar with save/delete buttons

**AI Outfit Generator:**
- Sheet/drawer from bottom (mobile)
- "Generate" button triggers loading state
- Results appear as scrollable horizontal carousel of outfit cards

---

## Images

**Image Strategy:**
This app is heavily image-driven. Every clothing item slot should support user-uploaded photos.

**Image Placement:**
1. **Capsule Builder Screen:** Grid of item slot cards - each can contain a user-uploaded clothing photo
2. **Item Detail Modal:** Large featured image area at top (aspect-[4/5], occupies ~50% of viewport)
3. **Outfit Suggestions:** AI-generated outfit cards display 3-4 clothing items arranged in a visually appealing collage
4. **Shopping List:** Small square thumbnails (80x80px) next to each item
5. **Empty Capsule State:** Illustration or decorative graphic showing example wardrobe organization

**Hero Section:**
- **Onboarding Welcome Screen:** Yes - include a hero image showcasing a beautifully organized minimalist wardrobe or lifestyle imagery (aspect-video, occupies top 40% of screen)
- Hero text overlay: Blurred backdrop (backdrop-blur-md), white text, centered
- CTA button with blur background

**Image Handling:**
- User uploads: Object-fit cover to maintain aspect ratios
- Placeholders: Light background with centered icon for empty states
- Loading: Skeleton loaders matching aspect ratios

---

## Accessibility

- Touch targets: Minimum 44x44px (h-11 or larger)
- Color contrast: WCAG AA compliant (checked for all text/background combinations)
- Focus indicators: Visible ring on all interactive elements (focus:ring-2)
- Form labels: Always visible, proper association with inputs
- Icon buttons: Include sr-only text for screen readers
- Tap feedback: Active states with subtle scale or opacity change (active:scale-95)

---

## Animations

**Minimal, Purposeful Motion:**
- Page transitions: Smooth fade/slide (duration-200)
- Card interactions: Subtle scale on tap (scale-95), quick spring back
- Loading states: Simple spinner or pulsing skeleton
- Modal appearance: Slide up from bottom (mobile), fade in (desktop)
- NO complex scroll animations, parallax, or decorative motion

---

## Mobile-First Specifics

**Responsive Breakpoints:**
- Mobile (base): 0-640px - primary design target
- Tablet (md:): 768px+ - 2-3 column grids where appropriate
- Desktop (lg:): 1024px+ - Maximum 5 columns for capsule grids

**Touch Interactions:**
- Swipe gestures: Shopping list items (swipe to delete/mark complete)
- Pull to refresh: Capsule list, outfit suggestions
- Long press: Item cards for quick actions menu
- No hover states (mobile-first) - use active states instead

**Bottom Sheet Pattern:**
- Filters, quick actions, AI generator interface
- Rounded top corners (rounded-t-3xl)
- Drag handle at top (centered, subtle)
- Overlay background: Semi-transparent dark (bg-black/50)