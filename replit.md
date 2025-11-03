# Closana - Capsule Wardrobe Planning App

## Overview

Closana is a mobile-first web application that helps users create thoughtful capsule wardrobes and jewelry collections tailored to their lifestyle and environment. Users can create both clothing capsules and jewelry capsules. For clothing capsules, users define their wardrobe needs (season, climate, use case, style), while jewelry capsules focus on metal types (Silver, Gold, Rose Gold, Mixed Metals) and use cases. New users are guided through a one-time onboarding flow to create their first capsule with personalized AI recommendations. After initial onboarding, users have immediate access to all features via bottom navigation (Capsules, Shopping, Outfits, Profile) and can create additional capsules anytime. Users can manage multiple capsule wardrobes, maintain shopping lists, and create outfit combinations. The app offers two ways to create outfits: manually select items from within a capsule to build custom outfits, or use AI-powered outfit generation to get intelligent suggestions based on capsule items.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework and Tooling**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR (Hot Module Replacement)
- TanStack Query (React Query) for server state management with infinite stale time to reduce unnecessary refetches
- Mobile-first responsive design philosophy

**UI Component System**
- Radix UI primitives for accessible, unstyled component foundations
- shadcn/ui component library (New York style variant) for consistent, customizable UI components
- Tailwind CSS for utility-first styling with custom design tokens
- Custom design system featuring Inter (UI) and Playfair Display (display headings) font families
- Dark mode support with theme toggle functionality

**State Management Strategy**
- Server state: TanStack Query with centralized queryClient
- Local UI state: React hooks (useState, useEffect)
- Authentication state: Custom useAuth hook wrapping TanStack Query
- No global state management library (Redux, Zustand) - keeping it simple with React Query and local state

**Routing and Navigation**
- Client-side routing via wouter with routes: `/` (home), `/capsule/:id` (detail)
- Bottom navigation pattern for mobile-first experience with four main tabs: Capsules, Shopping, Outfits, Profile
- First-time users see automatic onboarding to create their initial capsule
- After completing onboarding once, all tabs become accessible immediately
- Users can create additional capsules anytime via "+" button which triggers onboarding flow
- Onboarding renders as overlay, not blocking access to other features

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for REST API endpoints
- ESM (ECMAScript Modules) instead of CommonJS
- Custom middleware for request logging and JSON body parsing with raw body capture

**API Design**
- RESTful endpoints following resource-based URL patterns
- Authentication required for all `/api/*` routes except auth endpoints
- Error responses include status codes and descriptive messages
- OpenAI integration for AI-powered features (outfit generation, recommendations)

**Authentication System**
- Replit Auth using OpenID Connect (OIDC) protocol
- Passport.js strategy for authentication flow
- Session-based authentication with PostgreSQL session store (connect-pg-simple)
- Session TTL: 7 days with httpOnly, secure cookies
- Token refresh mechanism for maintaining user sessions

**Key API Endpoints**
- `/api/auth/user` - Get authenticated user profile
- `/api/capsules` - CRUD operations for capsule wardrobes (GET all, GET by id, POST create, PATCH update name/categorySlots, DELETE)
- `/api/capsules/:id/items` - Get items within a capsule
- `/api/items` - CRUD operations for items (POST create, PATCH update including shoppingListId, DELETE)
- `/api/shopping-lists` - CRUD operations for named shopping lists (GET all, POST create, PATCH update name, DELETE)
- `/api/shopping-lists/:id` - Get specific shopping list details
- `/api/shopping-lists/:id/items` - Get items in a specific shopping list
- `/api/capsules/:capsuleId/fabrics` - Get/create fabrics for a capsule
- `/api/fabrics/:id` - Delete fabric with ownership verification
- `/api/capsules/:capsuleId/colors` - Get/create colors for a capsule
- `/api/colors/:id` - Delete color with ownership verification
- `/api/capsules/:capsuleId/recommendations` - Generate fabric and color recommendations based on capsule parameters
- `/api/capsules/:capsuleId/generate-outfit` - Generate AI-powered outfit suggestions from capsule items (uses OpenAI with fallback to random combinations)
- `/api/capsules/:capsuleId/outfit-pairings` - Get/create saved favorite outfit pairings for a capsule
- `/api/outfit-pairings/:id` - Delete a favorite outfit pairing with ownership verification
- `/api/ai/recommendations` - Generate capsule recommendations based on user preferences

### Data Layer

**Database**
- PostgreSQL via Neon serverless (WebSocket-based connection)
- Drizzle ORM for type-safe database access and schema management
- Database schema defined in shared/schema.ts for type sharing between client and server

**Schema Design**

*Core Tables:*
- `users` - User profiles from Replit Auth (id, email, names, profile image, hasCompletedOnboarding flag, measurements JSONB)
  - **measurements** - JSONB field storing user's body measurements and preferred clothing sizes
    - Body measurements: height, weight, chest, waist, hips, inseam, neck, sleeve, shoulder
    - Accessory sizes: shoeSize, ringSize
    - Preferred clothing sizes: topSize, bottomSize, dressSize, jacketSize
    - Each measurement stored as: { value: string, unit: string }
    - Units are configurable (in/cm for dimensions, lbs/kg for weight, US/EU/UK for sizes)
    - Users can add, edit, and share their measurements from Profile page
- `sessions` - Express session storage for authentication
- `capsules` - Capsule wardrobe/jewelry definitions with metadata (capsuleCategory, season, climate, useCase, style, capsuleType, totalSlots, categorySlots)
  - **capsuleCategory** - Distinguishes between "Clothing" and "Jewelry" capsules (default: "Clothing")
  - **categorySlots** - JSONB field storing configurable slot allocations per category
    - Clothing capsules: {Tops: 6, Bottoms: 4, Dresses: 2, Outerwear: 2, Shoes: 2, Accessories: 2, Extras: 2}
    - Jewelry capsules: {Rings: 2, Necklaces: 2, Bracelets: 2, Earrings: 2, Watches: 1, 'Cuff & Tie Accessories': 0, 'Statement Pieces': 1}
  - **Clothing Categories**: Tops, Bottoms, Dresses, Outerwear, Shoes, Accessories, Extras
  - **Jewelry Categories**: Rings, Necklaces, Bracelets, Earrings, Watches, Cuff & Tie Accessories, Statement Pieces
  - Users can adjust slot counts per category using +/- controls in the capsule detail UI
- `shopping_lists` - Named shopping lists created by users (id, userId, name, timestamps)
- `items` - Individual items (clothing or jewelry) linked to capsules with categories, optional shopping list assignment, and product links
- `capsule_fabrics` - Material recommendations for capsules - fabrics for clothing, metal types for jewelry (id, capsuleId, name, timestamps)
- `capsule_colors` - Color recommendations and custom colors for capsules (id, capsuleId, name, timestamps)
- `outfit_pairings` - Saved favorite outfit suggestions for capsules (id, capsuleId, name, outfitData JSONB, createdAt)

*Relationships:*
- Users → Capsules (one-to-many with cascade delete)
- Users → Shopping Lists (one-to-many with cascade delete)
- Capsules → Items (one-to-many with cascade delete)
- Capsules → Fabrics (one-to-many with cascade delete)
- Capsules → Colors (one-to-many with cascade delete)
- Capsules → Outfit Pairings (one-to-many with cascade delete)
- Shopping Lists → Items (one-to-many with SET NULL on delete, allowing items to exist without being on a shopping list)
- Items belong to exactly one capsule but can optionally be added to one shopping list
- Fabrics and colors are generated based on capsule parameters (season, climate, style) and can be customized by users
- Outfit pairings store favorite outfit suggestions generated from capsule items via AI or random combinations

**Data Access Patterns**
- Repository pattern via DbStorage class implementing IStorage interface
- CRUD operations abstracted into storage layer methods
- Zod schemas for runtime validation using drizzle-zod integration

### External Dependencies

**Third-Party Services**
- **Replit Auth (OIDC)** - Primary authentication provider with OpenID Connect
- **Neon Database** - Serverless PostgreSQL hosting with WebSocket support
- **OpenAI API** - AI-powered features for outfit generation and wardrobe recommendations
- **Google Fonts** - Inter and Playfair Display font families

**Development Tools**
- **Replit-specific plugins** - Cartographer, dev banner, runtime error overlay for Replit development environment
- **Drizzle Kit** - Database migration management and schema push capabilities

**Key NPM Dependencies**
- @neondatabase/serverless - PostgreSQL client optimized for serverless environments
- drizzle-orm & drizzle-zod - Type-safe ORM with Zod schema generation
- @tanstack/react-query - Server state management
- @radix-ui/* - Headless UI component primitives (20+ components)
- openai - Official OpenAI API client
- passport & openid-client - Authentication flow management
- connect-pg-simple - PostgreSQL session store
- class-variance-authority - Type-safe variant styling for components
- tailwindcss - Utility-first CSS framework
- zod - Runtime type validation

**Asset Management**
- Static assets stored in attached_assets directory
- Generated images for onboarding hero sections
- Vite alias configuration for @assets path resolution