# Closana - Capsule Wardrobe Planning App

## Overview

Closana is a mobile-first web application designed to help users create personalized capsule wardrobes and jewelry collections. It allows users to define their wardrobe needs based on factors like season, climate, and style, and offers AI-powered recommendations for fabrics, colors, and outfit suggestions. Key features include a 3x3 Travel Grid System for efficient packing, the ability to manage multiple capsules, create shopping lists, and generate outfits manually or with AI assistance. Users can also share their creations and save items shared by others. The application guides new users through an onboarding process to set preferences for personalized AI experiences.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend uses React 18 with TypeScript, Vite for fast development, and TanStack Query for server state management with an infinite stale time. It follows a mobile-first responsive design, utilizing Radix UI for accessible primitives and shadcn/ui (New York style) for components, styled with Tailwind CSS and a custom design system. State management relies on React hooks for local UI state and TanStack Query for server state, with a critical pattern of using `refetchQueries` instead of `invalidateQueries` in mutation success handlers due to the infinite stale time. Client-side routing is handled by `wouter`, featuring a bottom navigation pattern and an onboarding flow that integrates seamlessly without blocking other features.

### Backend Architecture

The backend is built with Express.js and TypeScript, using ESM for modules. It provides RESTful API endpoints for managing capsules, items, shopping lists, and outfits. Authentication is handled via Replit Auth using OpenID Connect and Passport.js, with session-based authentication stored in PostgreSQL. OpenAI API is integrated for AI-powered features. Key API endpoints support CRUD operations for all core entities, as well as features like generating recommendations, outfits, creating shareable links, and handling image uploads.

### Data Layer

The application utilizes PostgreSQL via Neon serverless and Drizzle ORM for type-safe database access. The schema includes core tables for `users`, `sessions`, `capsules`, `shopping_lists`, `items`, `capsule_fabrics`, `capsule_colors`, `outfit_pairings`, `shared_exports`, and `saved_shared_items`. The `users` table stores user preferences and measurements. `capsules` can be for clothing or jewelry, with configurable `categorySlots`. Relationships are designed with cascade deletes for user-owned data and SET NULL for items on shopping lists. Data access follows a repository pattern, and Zod schemas are used for runtime validation.

## External Dependencies

- **Replit Auth (OIDC)**: Primary authentication.
- **Neon Database**: Serverless PostgreSQL hosting.
- **OpenAI API**: AI-powered recommendations, outfit generation, and clothing tag scanning (vision).
- **Google Cloud Storage**: Object storage for user-uploaded images.
- **Google Fonts**: Inter and Playfair Display font families.
- **Drizzle Kit**: Database migration management.
- **NPM Packages**: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-zod`, `@tanstack/react-query`, `@radix-ui/*`, `openai`, `passport`, `openid-client`, `connect-pg-simple`, `@google-cloud/storage`, `@uppy/*`, `class-variance-authority`, `tailwindcss`, `zod`.