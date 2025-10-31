# Closana - Capsule Wardrobe Planning App

## Overview

Closana is a mobile-first web application that helps users create thoughtful capsule wardrobes tailored to their lifestyle and environment. Users have immediate access to all features via bottom navigation (Capsules, Shopping, Outfits, Profile). The optional onboarding flow guides users through defining their wardrobe needs (season, climate, use case, style) when creating a new capsule, providing personalized AI recommendations. Users can manage multiple capsule wardrobes, maintain shopping lists, and receive AI-powered outfit suggestions.

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
- All tabs accessible immediately upon login - no forced onboarding
- Optional multi-step onboarding flow triggered by "+" button to create new capsules
- Onboarding renders as overlay, not blocking other features

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
- `/api/capsules` - CRUD operations for capsule wardrobes
- `/api/capsules/:id/items` - Manage items within capsules
- `/api/shopping-list` - Get items marked for shopping across all capsules
- `/api/ai/generate-outfit` - AI-powered outfit suggestions
- `/api/ai/recommendations` - Generate capsule recommendations based on user preferences

### Data Layer

**Database**
- PostgreSQL via Neon serverless (WebSocket-based connection)
- Drizzle ORM for type-safe database access and schema management
- Database schema defined in shared/schema.ts for type sharing between client and server

**Schema Design**

*Core Tables:*
- `users` - User profiles from Replit Auth (id, email, names, profile image)
- `sessions` - Express session storage for authentication
- `capsules` - Capsule wardrobe definitions with metadata (season, climate, useCase, style, capsuleType, totalSlots)
- `items` - Individual clothing items linked to capsules with categories, shopping list flag, and product links

*Relationships:*
- Users → Capsules (one-to-many with cascade delete)
- Capsules → Items (one-to-many with cascade delete)
- Items can be marked for shopping list across capsules

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