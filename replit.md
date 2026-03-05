# Closana - Capsule Wardrobe Planning App

## Overview

Closana is a mobile-first web application designed to help users create personalized capsule wardrobes and jewelry collections. It allows users to define their wardrobe needs based on factors like season, climate, and style, and offers AI-powered recommendations for fabrics, colors, and outfit suggestions. Key features include a 3x3 Travel Grid System for efficient packing, the ability to manage multiple capsules, create shopping lists, and generate outfits manually or with AI assistance. Users can also share their creations and save items shared by others. The application guides new users through an onboarding process to set preferences for personalized AI experiences.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Item Ownership Model

Items belong to **wardrobes** (not capsules) and can be assigned to **multiple capsules** via the `capsuleItems` join table. This enables flexible wardrobe management where items are owned at the wardrobe level and shared across capsules.

- `items.wardrobeId` — required FK to the owning wardrobe
- `items.capsuleId` — deprecated, kept for backward compatibility only (no new writes)
- `items.price` — text, optional price field
- `items.wearCount` — integer, default 0, tracks how many times an item has been worn
- `items.lastWornAt` — timestamp, nullable, last time item was worn
- `capsuleItems` — join table with (capsuleId, itemId) unique constraint
- `maxItemsPerWardrobe` tier limits: Free: 50, Premium: 200, Family: 200, Professional: unlimited

**Key API routes:**
- `POST /api/items` — create item (requires wardrobeId, optional capsuleId + quantity)
- `POST /api/items/bulk` — bulk create items with per-item quantity
- `GET /api/items/recent?limit=5` — recently created items across user's wardrobes
- `POST /api/items/:id/wear` — increment wear count and set lastWornAt
- `POST /api/items/batch-delete` — batch delete with access control
- `GET /api/wardrobes/:wardrobeId/items` — all items with capsule badges
- `GET /api/wardrobes/:wardrobeId/items/unassigned` — items not in any capsule
- `GET /api/wardrobes/:wardrobeId/items/check-duplicate?name=X` — duplicate detection
- `POST /api/capsules/:capsuleId/items/:itemId/assign` — assign item to capsule
- `POST /api/capsules/:capsuleId/items/batch-assign` — batch assign multiple items
- `DELETE /api/capsules/:capsuleId/items/:itemId/unassign` — remove from capsule (keeps in wardrobe)
- `GET /api/items/:id/capsules` — which capsules an item belongs to

**Authorization helpers:**
- `canAccessWardrobe(userId, wardrobeId, storage)` — checks ownership, family manager access, or professional shopper access
- `canAccessCapsule(userId, capsuleId, storage)` — checks capsule ownership via its wardrobe

### Outfit Calendar

- `outfit_calendar` table: `id`, `userId`, `date`, `outfitPairingId` (FK), `capsuleId` (FK), `outfitName`, `itemNames` (text array), `notes`, `worn` (boolean), `createdAt`
- `GET /api/outfit-calendar?startDate=X&endDate=Y` — entries for date range
- `POST /api/outfit-calendar` — plan outfit for a date
- `PATCH /api/outfit-calendar/:id` — update planned outfit
- `DELETE /api/outfit-calendar/:id` — remove planned outfit
- `POST /api/outfit-calendar/:id/mark-worn` — marks worn and increments wearCount on associated items

### Retailer Dashboard

- `GET /api/retailer/analytics` — aggregated metrics for retailer user
- `GET /api/retailer/products` — retailer's products
- `GET /api/retailer/ads` — retailer's ad placements

### GDPR Data Export

- `GET /api/auth/user/export` — comprehensive JSON export of all user data (wardrobes, items, capsules, shopping lists, outfits, calendar entries, shared exports)

### Frontend Architecture

The frontend uses React 18 with TypeScript, Vite for fast development, and TanStack Query for server state management with an infinite stale time. It follows a mobile-first responsive design, utilizing Radix UI for accessible primitives and shadcn/ui (New York style) for components, styled with Tailwind CSS and a custom design system. State management relies on React hooks for local UI state and TanStack Query for server state, with a critical pattern of using `refetchQueries` instead of `invalidateQueries` in mutation success handlers due to the infinite stale time. Client-side routing is handled by `wouter`, featuring a bottom navigation pattern and an onboarding flow that integrates seamlessly without blocking other features.

**Key pages:**
- `Capsules` (`/capsules`) — main capsule list with recently added items, search (3+ capsules), type/season filter chips, keyboard-accessible filter badges
- `BulkAddItems` (`/wardrobes/:wardrobeId/bulk-add`) — three-tab (Quick Add, Scan Tags, Snap Photos) rapid item entry with smart category suggestions, duplicate detection, undo toasts, quantity support, tier limit enforcement, and client-side image compression
- `WardrobeItems` (`/items`) — all wardrobe items view with category grouping, capsule badges, multi-select batch assign/delete, sort options, search, statistics card (extracted to `WardrobeStatsCard`), underused items section, wear tracking (log wear, cost-per-wear), and role-aware wardrobe switching. Edit dialog extracted to shared `EditItemDialog` component.
- `CapsuleDetail` (`/capsule/:id`) — assign/unassign items, delete confirmation showing affected capsules, "Add from Wardrobe" picker, Bulk Add entry points, PDF export, wear tracking. Large dialogs extracted to `components/capsule/ExportDialogs.tsx`, `ItemDialogs.tsx`, `OutfitSection.tsx`, `StylePreferences.tsx`.
- `CreateCapsule` — "Start from Template" option with 5 seasonal templates (Summer Essentials, Winter Wardrobe, Work Week, Weekend Casual, Travel Light) or custom build
- `Outfits` — tabbed view with Calendar (week view, plan/edit/delete outfits, mark as worn) and Generator (AI outfit generation)
- `Profile` — includes Privacy section with "Download My Data" GDPR export button
- `ItemDetailModal` — consistent modal for viewing item details across all views (wardrobe, capsule, shopping list) with context-specific actions

**Error Handling:**
- `ErrorBoundary` component wraps authenticated app to catch render errors with recovery UI
- Shopping list and vault pages show error states with retry buttons on query failures
- All mutation delete operations include `onError` toast notifications

**Navigation:** Route-based navigation using wouter with paths: `/capsules`, `/items`, `/vault`, `/shopping`, `/outfits`, `/profile`. `/` redirects to `/capsules`. BottomNav derives active tab from current URL path. Browser back/forward works between tabs. BottomNav renders once in AuthenticatedApp layout, visible on all authenticated pages including detail views.

### Feature Gating by Tier

- **AI Features** (tag scanning, outfit generation): Gated by `fullAI` flag — Free tier returns 403 with upgrade prompt; Premium+ tiers have access
- **Item Limits**: Free: 50, Premium: 200, Family: 200, Professional: unlimited — enforced server-side with clear error messages
- **Onboarding**: Skippable via "Skip for now" on welcome step (sets reasonable defaults: 30s, Women's, Unknown undertone)
- **Vault/Outfit Generator/Shopping List**: Show helpful empty states with action buttons when no data exists

### Security

- **API Rate Limiting** via `express-rate-limit`:
  - General: 100 req/min for all API routes
  - AI endpoints: 10 req/min (scan tags, generate outfits)
  - Auth endpoints: 20 req/min
  - Export endpoints: 10 req/min
- All wardrobe/capsule routes use `canAccessWardrobe`/`canAccessCapsule` helpers for consistent access control
- Assign/unassign/batch-assign routes verify item belongs to same wardrobe as capsule
- Item name max 200 chars, description max 1000 chars (enforced in insert schema)
- Shared export links auto-expire after 30 days
- `items.wardrobeId` is non-nullable in schema (enforced at DB level)

### Backend Architecture

The backend is built with Express.js and TypeScript, using ESM for modules. It provides RESTful API endpoints for managing capsules, items, shopping lists, and outfits. Authentication is handled via Replit Auth using OpenID Connect and Passport.js, with session-based authentication stored in PostgreSQL. OpenAI API is integrated for AI-powered features. Key API endpoints support CRUD operations for all core entities, as well as features like generating recommendations, outfits, creating shareable links, and handling image uploads.

### Known Design Decisions

- **Price types are inconsistent by design**: `items.price` and `affiliate_products.price` use `text` (allows currency symbols/formatting), while `retailer_products.price` uses `integer` (cents). The PDF export handles parsing text prices via regex. Future work could normalize to integer cents across all tables.

### Data Layer

The application utilizes PostgreSQL via Neon serverless and Drizzle ORM for type-safe database access. The schema includes core tables for `users`, `sessions`, `wardrobes`, `capsules`, `shopping_lists`, `items`, `capsule_items`, `capsule_fabrics`, `capsule_colors`, `outfit_pairings`, `outfit_calendar`, `shared_exports`, and `saved_shared_items`. The `users` table stores user preferences and measurements. `capsules` can be for clothing or jewelry, with configurable `categorySlots`. Items belong to wardrobes and are assigned to capsules via the `capsule_items` join table. Relationships are designed with cascade deletes for user-owned data and SET NULL for items on shopping lists. Data access follows a repository pattern, and Zod schemas are used for runtime validation.

### Data Migration

`server/migrate.ts` runs idempotently on startup to migrate existing items from capsule-direct to wardrobe ownership, setting `wardrobeId` and creating `capsuleItems` join records.

### Smart Category Mapping

`client/src/lib/categoryMapping.ts` maps common clothing keywords to categories (e.g., "shirt"→Tops, "jeans"→Bottoms). Used by Bulk Add, AddItemForm, and tag scanning.

### Image Compression

`client/src/lib/imageCompression.ts` provides client-side image compression using Canvas API. Resizes to max 1200px on longest side, JPEG quality 0.8, max ~1MB output. Applied in ObjectUploader before upload and in tag scanning before base64 transmission.

### PDF Export

`client/src/lib/pdfExport.ts` generates PDFs for capsules and shopping lists using jspdf and jspdf-autotable. Available in CapsuleDetail and ShoppingListDetail export dialogs.

### Capsule Templates

`client/src/lib/capsuleTemplates.ts` defines 5 seasonal templates (Summer Essentials, Winter Wardrobe, Work Week, Weekend Casual, Travel Light) with pre-configured category slots, seasons, and use cases.

## External Dependencies

- **Replit Auth (OIDC)**: Primary authentication.
- **Neon Database**: Serverless PostgreSQL hosting.
- **OpenAI API**: AI-powered recommendations, outfit generation, and clothing tag scanning (vision).
- **Google Cloud Storage**: Object storage for user-uploaded images.
- **Google Fonts**: Inter and Playfair Display font families.
- **Drizzle Kit**: Database migration management.
- **NPM Packages**: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-zod`, `@tanstack/react-query`, `@radix-ui/*`, `openai`, `passport`, `openid-client`, `connect-pg-simple`, `@google-cloud/storage`, `@uppy/*`, `class-variance-authority`, `tailwindcss`, `zod`, `express-rate-limit`, `jspdf`, `jspdf-autotable`.
