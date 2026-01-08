import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertCapsuleSchema, insertItemSchema, insertShoppingListSchema, updateUserSchema, insertCapsuleFabricSchema, insertCapsuleColorSchema, insertWardrobeSchema, TIER_LIMITS, type SubscriptionTier } from "@shared/schema";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import OpenAI from "openai";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { getStripe, getStripeSync } from "./stripeClient";

// Lazy initialize OpenAI only when needed
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body
      const validation = updateUserSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      const updatedUser = await storage.updateUser(userId, validation.data);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Delete user account and all associated data (cascades will handle capsules, items, etc.)
      await storage.deleteUser(userId);
      
      // Log out the user
      req.logout(() => {
        res.json({ success: true });
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user account" });
    }
  });

  // Subscription routes
  app.get('/api/subscription/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const tier = (user.subscriptionTier || 'free') as SubscriptionTier;
      const tierConfig = TIER_LIMITS[tier] || TIER_LIMITS.free;

      res.json({
        tier: user.subscriptionTier || 'free',
        status: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt,
        features: tierConfig,
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  app.get('/api/subscription/plans', async (_req, res) => {
    try {
      let stripe;
      try {
        stripe = getStripe();
      } catch (initError) {
        console.error("Stripe not initialized:", initError);
        return res.status(503).json({ message: "Payment service temporarily unavailable" });
      }
      
      const products = await stripe.products.list({
        active: true,
        expand: ['data.default_price'],
      });

      const plans = await Promise.all(
        products.data
          .filter((p) => p.metadata.tier)
          .map(async (product) => {
            const prices = await stripe.prices.list({
              product: product.id,
              active: true,
            });

            return {
              id: product.id,
              name: product.name,
              description: product.description,
              tier: product.metadata.tier,
              features: TIER_LIMITS[product.metadata.tier as SubscriptionTier],
              prices: prices.data.map((price) => ({
                id: price.id,
                amount: price.unit_amount,
                currency: price.currency,
                interval: price.recurring?.interval,
                trialDays: price.recurring?.trial_period_days,
              })),
            };
          })
      );

      res.json(plans.sort((a, b) => {
        const order = ['free', 'premium', 'family', 'professional'];
        return order.indexOf(a.tier) - order.indexOf(b.tier);
      }));
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  app.post('/api/subscription/checkout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { priceId } = req.body;

      if (!priceId) {
        return res.status(400).json({ message: "Price ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let stripe;
      try {
        stripe = getStripe();
      } catch (initError) {
        console.error("Stripe not initialized:", initError);
        return res.status(503).json({ message: "Payment service temporarily unavailable" });
      }
      let customerId = user.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user.firstName || undefined,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;

        await storage.updateUserSubscription(userId, {
          stripeCustomerId: customerId,
        });
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        allow_promotion_codes: true,
        success_url: `${baseUrl}/profile?subscription=success`,
        cancel_url: `${baseUrl}/profile?subscription=cancelled`,
        metadata: {
          userId: user.id,
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post('/api/subscription/portal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: "No active subscription" });
      }

      let stripe;
      try {
        stripe = getStripe();
      } catch (initError) {
        console.error("Stripe not initialized:", initError);
        return res.status(503).json({ message: "Payment service temporarily unavailable" });
      }
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/profile`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ message: "Failed to create portal session" });
    }
  });

  // Object Storage routes for item images
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req: any, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.put("/api/item-images", isAuthenticated, async (req: any, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    const userId = req.user.claims.sub;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: userId,
          visibility: "public",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting item image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // The Vault - Affiliate Products routes
  app.get('/api/vault/products', isAuthenticated, async (req: any, res) => {
    try {
      const category = req.query.category as string | undefined;
      const products = await storage.getAffiliateProducts(category);
      res.json(products);
    } catch (error) {
      console.error("Error fetching vault products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/vault/products/:id/go', isAuthenticated, async (req: any, res) => {
    try {
      const product = await storage.getAffiliateProduct(req.params.id);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Track the click
      await storage.incrementAffiliateProductClicks(product.id);
      
      // Redirect to affiliate URL
      res.redirect(product.affiliateUrl);
    } catch (error) {
      console.error("Error redirecting to affiliate:", error);
      res.status(500).json({ message: "Failed to redirect" });
    }
  });

  // Wardrobe routes
  app.get('/api/wardrobes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wardrobes = await storage.getWardrobesByUserId(userId);
      
      // Add capsule counts to each wardrobe
      const wardrobesWithCounts = await Promise.all(
        wardrobes.map(async (wardrobe) => {
          const capsules = await storage.getCapsulesByWardrobeId(wardrobe.id);
          return {
            ...wardrobe,
            capsuleCount: capsules.length,
          };
        })
      );
      
      res.json(wardrobesWithCounts);
    } catch (error) {
      console.error("Error fetching wardrobes:", error);
      res.status(500).json({ message: "Failed to fetch wardrobes" });
    }
  });

  app.get('/api/wardrobes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const wardrobe = await storage.getWardrobe(req.params.id);
      
      if (!wardrobe) {
        return res.status(404).json({ message: "Wardrobe not found" });
      }

      // Verify ownership
      const userId = req.user.claims.sub;
      if (wardrobe.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json(wardrobe);
    } catch (error) {
      console.error("Error fetching wardrobe:", error);
      res.status(500).json({ message: "Failed to fetch wardrobe" });
    }
  });

  app.post('/api/wardrobes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body
      const validation = insertWardrobeSchema.safeParse({
        ...req.body,
        userId,
      });
      
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      const wardrobe = await storage.createWardrobe(validation.data);
      res.status(201).json(wardrobe);
    } catch (error) {
      console.error("Error creating wardrobe:", error);
      res.status(500).json({ message: "Failed to create wardrobe" });
    }
  });

  app.patch('/api/wardrobes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const wardrobe = await storage.getWardrobe(req.params.id);
      
      if (!wardrobe) {
        return res.status(404).json({ message: "Wardrobe not found" });
      }

      // Verify ownership
      const userId = req.user.claims.sub;
      if (wardrobe.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updated = await storage.updateWardrobe(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating wardrobe:", error);
      res.status(500).json({ message: "Failed to update wardrobe" });
    }
  });

  app.delete('/api/wardrobes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const wardrobe = await storage.getWardrobe(req.params.id);
      
      if (!wardrobe) {
        return res.status(404).json({ message: "Wardrobe not found" });
      }

      // Verify ownership
      const userId = req.user.claims.sub;
      if (wardrobe.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Don't allow deleting the default wardrobe
      if (wardrobe.isDefault) {
        return res.status(400).json({ message: "Cannot delete your default wardrobe" });
      }

      await storage.deleteWardrobe(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting wardrobe:", error);
      res.status(500).json({ message: "Failed to delete wardrobe" });
    }
  });

  // Get capsules for a specific wardrobe
  app.get('/api/wardrobes/:id/capsules', isAuthenticated, async (req: any, res) => {
    try {
      const wardrobe = await storage.getWardrobe(req.params.id);
      
      if (!wardrobe) {
        return res.status(404).json({ message: "Wardrobe not found" });
      }

      // Verify ownership
      const userId = req.user.claims.sub;
      if (wardrobe.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const capsules = await storage.getCapsulesByWardrobeId(req.params.id);
      
      // Add item counts to each capsule
      const capsulesWithCounts = await Promise.all(
        capsules.map(async (capsule) => {
          const items = await storage.getItemsByCapsuleId(capsule.id);
          return {
            ...capsule,
            itemCount: items.length,
          };
        })
      );
      
      res.json(capsulesWithCounts);
    } catch (error) {
      console.error("Error fetching wardrobe capsules:", error);
      res.status(500).json({ message: "Failed to fetch capsules" });
    }
  });

  // Capsule routes
  app.get('/api/capsules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const capsules = await storage.getCapsulesByUserId(userId);
      
      // Add item counts to each capsule
      const capsulesWithCounts = await Promise.all(
        capsules.map(async (capsule) => {
          const items = await storage.getItemsByCapsuleId(capsule.id);
          return {
            ...capsule,
            itemCount: items.length,
          };
        })
      );
      
      // Prevent 304 caching issues in tests
      res.set('Cache-Control', 'no-store');
      res.json(capsulesWithCounts);
    } catch (error) {
      console.error("Error fetching capsules:", error);
      res.status(500).json({ message: "Failed to fetch capsules" });
    }
  });

  app.get('/api/capsules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const capsule = await storage.getCapsule(req.params.id);
      
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }

      // Verify ownership
      const userId = req.user.claims.sub;
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json(capsule);
    } catch (error) {
      console.error("Error fetching capsule:", error);
      res.status(500).json({ message: "Failed to fetch capsule" });
    }
  });

  app.post('/api/capsules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validation = insertCapsuleSchema.safeParse({ ...req.body, userId });
      
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      const capsule = await storage.createCapsule(validation.data);
      
      // Mark onboarding as complete for first-time users
      await storage.markOnboardingComplete(userId);
      
      res.json(capsule);
    } catch (error) {
      console.error("Error creating capsule:", error);
      res.status(500).json({ message: "Failed to create capsule" });
    }
  });

  app.patch('/api/capsules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const capsule = await storage.getCapsule(req.params.id);
      
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }

      const userId = req.user.claims.sub;
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Whitelist allowed fields - prevent userId and id changes
      const allowedFields = ['name', 'season', 'climate', 'useCase', 'style', 'capsuleType', 'totalSlots', 'categorySlots'];
      const updateData: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      const updated = await storage.updateCapsule(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating capsule:", error);
      res.status(500).json({ message: "Failed to update capsule" });
    }
  });

  app.delete('/api/capsules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const capsule = await storage.getCapsule(req.params.id);
      
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }

      const userId = req.user.claims.sub;
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteCapsule(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting capsule:", error);
      res.status(500).json({ message: "Failed to delete capsule" });
    }
  });

  app.post('/api/capsules/:id/copy', isAuthenticated, async (req: any, res) => {
    try {
      const capsule = await storage.getCapsule(req.params.id);
      
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }

      const userId = req.user.claims.sub;
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get all items from the original capsule
      const originalItems = await storage.getItemsByCapsuleId(capsule.id);

      // Create a copy of the capsule
      const copiedCapsule = await storage.createCapsule({
        userId,
        name: `${capsule.name} (Copy)`,
        capsuleCategory: capsule.capsuleCategory,
        season: capsule.season,
        climate: capsule.climate,
        useCase: capsule.useCase,
        style: capsule.style,
        capsuleType: capsule.capsuleType,
        totalSlots: capsule.totalSlots,
        categorySlots: capsule.categorySlots as any,
      });

      // Copy all items to the new capsule
      await Promise.all(
        originalItems.map(item =>
          storage.createItem({
            capsuleId: copiedCapsule.id,
            category: item.category,
            name: item.name,
            description: item.description,
            imageUrl: item.imageUrl,
            productLink: item.productLink,
            shoppingListId: null, // Don't copy shopping list assignments
          })
        )
      );

      res.json(copiedCapsule);
    } catch (error) {
      console.error("Error copying capsule:", error);
      res.status(500).json({ message: "Failed to copy capsule" });
    }
  });

  app.get('/api/capsules/:id/export', isAuthenticated, async (req: any, res) => {
    try {
      const capsule = await storage.getCapsule(req.params.id);
      
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }

      const userId = req.user.claims.sub;
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const items = await storage.getItemsByCapsuleId(capsule.id);
      const includeMeasurements = req.query.includeMeasurements === 'true';

      const exportData: any = {
        capsule,
        items,
        exportedAt: new Date().toISOString(),
      };

      // Only include measurements if explicitly requested and they belong to the authenticated user
      if (includeMeasurements) {
        const user = await storage.getUser(userId);
        // Double-check we're only including the authenticated user's own measurements
        if (user && user.id === userId && user.measurements) {
          exportData.measurements = user.measurements;
        }
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="capsule-${capsule.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting capsule:", error);
      res.status(500).json({ message: "Failed to export capsule" });
    }
  });

  // Item routes
  app.get('/api/capsules/:capsuleId/items', isAuthenticated, async (req: any, res) => {
    try {
      const capsule = await storage.getCapsule(req.params.capsuleId);
      
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }

      const userId = req.user.claims.sub;
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const items = await storage.getItemsByCapsuleId(req.params.capsuleId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });

  app.post('/api/items', isAuthenticated, async (req: any, res) => {
    try {
      const validation = insertItemSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      // Verify capsule ownership
      const capsule = await storage.getCapsule(validation.data.capsuleId);
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }

      const userId = req.user.claims.sub;
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const item = await storage.createItem(validation.data);
      res.json(item);
    } catch (error) {
      console.error("Error creating item:", error);
      res.status(500).json({ message: "Failed to create item" });
    }
  });

  app.patch('/api/items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const item = await storage.getItem(req.params.id);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      // Verify ownership through capsule
      const capsule = await storage.getCapsule(item.capsuleId);
      const userId = req.user.claims.sub;
      if (!capsule || capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // If trying to change capsuleId, verify ownership of the new capsule too
      if (req.body.capsuleId && req.body.capsuleId !== item.capsuleId) {
        const newCapsule = await storage.getCapsule(req.body.capsuleId);
        if (!newCapsule || newCapsule.userId !== userId) {
          return res.status(403).json({ message: "Cannot move item to a capsule you don't own" });
        }
      }

      // Whitelist allowed fields - prevent id changes
      const allowedFields = ['capsuleId', 'shoppingListId', 'category', 'name', 'description', 'imageUrl', 'productLink'];
      const updateData: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      const updated = await storage.updateItem(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating item:", error);
      res.status(500).json({ message: "Failed to update item" });
    }
  });

  app.delete('/api/items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const item = await storage.getItem(req.params.id);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      // Verify ownership through capsule
      const capsule = await storage.getCapsule(item.capsuleId);
      const userId = req.user.claims.sub;
      if (!capsule || capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting item:", error);
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  app.post('/api/items/:id/copy', isAuthenticated, async (req: any, res) => {
    try {
      const item = await storage.getItem(req.params.id);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      // Verify ownership of source capsule
      const sourceCapsule = await storage.getCapsule(item.capsuleId);
      const userId = req.user.claims.sub;
      if (!sourceCapsule || sourceCapsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get target capsule ID from request body (optional)
      const targetCapsuleId = req.body.targetCapsuleId || item.capsuleId;

      // If target capsule is different, verify ownership of target capsule
      if (targetCapsuleId !== item.capsuleId) {
        const targetCapsule = await storage.getCapsule(targetCapsuleId);
        if (!targetCapsule || targetCapsule.userId !== userId) {
          return res.status(403).json({ message: "Forbidden - target capsule not found or not owned by user" });
        }
      }

      // Create a copy of the item
      const copiedItem = await storage.createItem({
        capsuleId: targetCapsuleId,
        category: item.category,
        name: `${item.name} (Copy)`,
        description: item.description,
        imageUrl: item.imageUrl,
        productLink: item.productLink,
        shoppingListId: null, // Don't copy shopping list assignment
      });

      res.json(copiedItem);
    } catch (error) {
      console.error("Error copying item:", error);
      res.status(500).json({ message: "Failed to copy item" });
    }
  });

  app.get('/api/items/:id/export', isAuthenticated, async (req: any, res) => {
    try {
      const item = await storage.getItem(req.params.id);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      // Verify ownership through capsule
      const capsule = await storage.getCapsule(item.capsuleId);
      const userId = req.user.claims.sub;
      if (!capsule || capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const exportData = {
        item,
        capsule: {
          id: capsule.id,
          name: capsule.name,
        },
        exportedAt: new Date().toISOString(),
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="item-${item.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting item:", error);
      res.status(500).json({ message: "Failed to export item" });
    }
  });

  // Shopping list routes
  app.get('/api/shopping-lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const lists = await storage.getShoppingListsByUserId(userId);
      
      // Add item counts to each shopping list
      const listsWithCounts = await Promise.all(
        lists.map(async (list) => {
          const items = await storage.getItemsByShoppingListId(list.id);
          return {
            ...list,
            itemCount: items.length,
          };
        })
      );
      
      res.json(listsWithCounts);
    } catch (error) {
      console.error("Error fetching shopping lists:", error);
      res.status(500).json({ message: "Failed to fetch shopping lists" });
    }
  });

  app.get('/api/shopping-lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const list = await storage.getShoppingList(req.params.id);
      
      if (!list) {
        return res.status(404).json({ message: "Shopping list not found" });
      }

      const userId = req.user.claims.sub;
      if (list.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json(list);
    } catch (error) {
      console.error("Error fetching shopping list:", error);
      res.status(500).json({ message: "Failed to fetch shopping list" });
    }
  });

  app.post('/api/shopping-lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validation = insertShoppingListSchema.safeParse({ ...req.body, userId });
      
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      const list = await storage.createShoppingList(validation.data);
      res.json(list);
    } catch (error) {
      console.error("Error creating shopping list:", error);
      res.status(500).json({ message: "Failed to create shopping list" });
    }
  });

  app.patch('/api/shopping-lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const list = await storage.getShoppingList(req.params.id);
      
      if (!list) {
        return res.status(404).json({ message: "Shopping list not found" });
      }

      const userId = req.user.claims.sub;
      if (list.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const allowedFields = ['name'];
      const updateData: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      const updated = await storage.updateShoppingList(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating shopping list:", error);
      res.status(500).json({ message: "Failed to update shopping list" });
    }
  });

  app.delete('/api/shopping-lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const list = await storage.getShoppingList(req.params.id);
      
      if (!list) {
        return res.status(404).json({ message: "Shopping list not found" });
      }

      const userId = req.user.claims.sub;
      if (list.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteShoppingList(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shopping list:", error);
      res.status(500).json({ message: "Failed to delete shopping list" });
    }
  });

  app.post('/api/shopping-lists/:id/copy', isAuthenticated, async (req: any, res) => {
    try {
      const list = await storage.getShoppingList(req.params.id);
      
      if (!list) {
        return res.status(404).json({ message: "Shopping list not found" });
      }

      const userId = req.user.claims.sub;
      if (list.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Create a copy of the shopping list
      const copiedList = await storage.createShoppingList({
        userId,
        name: `${list.name} (Copy)`,
      });

      res.json(copiedList);
    } catch (error) {
      console.error("Error copying shopping list:", error);
      res.status(500).json({ message: "Failed to copy shopping list" });
    }
  });

  app.get('/api/shopping-lists/:id/export', isAuthenticated, async (req: any, res) => {
    try {
      const list = await storage.getShoppingList(req.params.id);
      
      if (!list) {
        return res.status(404).json({ message: "Shopping list not found" });
      }

      const userId = req.user.claims.sub;
      if (list.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const items = await storage.getItemsByShoppingListId(req.params.id);
      const includeMeasurements = req.query.includeMeasurements === 'true';

      const exportData: any = {
        shoppingList: list,
        items,
        exportedAt: new Date().toISOString(),
      };

      // Only include measurements if explicitly requested and they belong to the authenticated user
      if (includeMeasurements) {
        const user = await storage.getUser(userId);
        // Double-check we're only including the authenticated user's own measurements
        if (user && user.id === userId && user.measurements) {
          exportData.measurements = user.measurements;
        }
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="shopping-list-${list.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting shopping list:", error);
      res.status(500).json({ message: "Failed to export shopping list" });
    }
  });

  // Shared exports - create a shareable link
  app.post('/api/shared-exports', isAuthenticated, async (req: any, res) => {
    try {
      // Validate export type
      const exportTypeSchema = z.enum(['capsule', 'shopping_list']);
      const exportTypeValidation = exportTypeSchema.safeParse(req.body.exportType);
      
      if (!exportTypeValidation.success) {
        return res.status(400).json({ message: "Invalid export type. Must be 'capsule' or 'shopping_list'" });
      }

      const exportType = exportTypeValidation.data;
      const { exportData } = req.body;

      if (!exportData || typeof exportData !== 'object') {
        return res.status(400).json({ message: "Export data must be a valid object" });
      }

      // Validate export data structure based on type
      if (exportType === 'capsule') {
        if (!exportData.capsule || !exportData.items || !Array.isArray(exportData.items)) {
          return res.status(400).json({ message: "Invalid capsule export data structure" });
        }
      } else if (exportType === 'shopping_list') {
        if (!exportData.shoppingList || !exportData.items || !Array.isArray(exportData.items)) {
          return res.status(400).json({ message: "Invalid shopping list export data structure" });
        }
      }

      // Prevent oversized payloads (limit to reasonable JSON size)
      const jsonSize = JSON.stringify(exportData).length;
      const maxSize = 1024 * 1024; // 1MB limit
      if (jsonSize > maxSize) {
        return res.status(413).json({ message: "Export data too large. Maximum size is 1MB" });
      }

      const userId = req.user.claims.sub;
      
      const sharedExport = await storage.createSharedExport({
        userId,
        exportType,
        exportData,
        expiresAt: null,
      });

      res.json({
        id: sharedExport.id,
        shareUrl: `/shared/${sharedExport.id}`,
      });
    } catch (error) {
      console.error("Error creating shared export:", error);
      res.status(500).json({ message: "Failed to create shared export" });
    }
  });

  // Shared exports - get shared data (no authentication required)
  app.get('/api/shared-exports/:id', async (req, res) => {
    try {
      const sharedExport = await storage.getSharedExport(req.params.id);
      
      if (!sharedExport) {
        return res.status(404).json({ message: "Shared export not found" });
      }

      // Check if expired
      if (sharedExport.expiresAt && new Date(sharedExport.expiresAt) < new Date()) {
        return res.status(410).json({ message: "This share link has expired" });
      }

      res.json({
        exportType: sharedExport.exportType,
        exportData: sharedExport.exportData,
        createdAt: sharedExport.createdAt,
      });
    } catch (error) {
      console.error("Error retrieving shared export:", error);
      res.status(500).json({ message: "Failed to retrieve shared export" });
    }
  });

  // Saved shared items - get all saved items for the authenticated user
  app.get('/api/saved-shared-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const savedItems = await storage.getSavedSharedItemsByUserId(userId);
      res.json(savedItems);
    } catch (error) {
      console.error("Error fetching saved shared items:", error);
      res.status(500).json({ message: "Failed to fetch saved shared items" });
    }
  });

  // Saved shared items - save a shared item
  app.post('/api/saved-shared-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sharedExportId, itemType, itemData, sourceUserName } = req.body;

      // Validate required fields
      if (!sharedExportId || !itemType || !itemData) {
        return res.status(400).json({ message: "Missing required fields: sharedExportId, itemType, itemData" });
      }

      // Check if shared export exists
      const sharedExport = await storage.getSharedExport(sharedExportId);
      if (!sharedExport) {
        return res.status(404).json({ message: "Shared export not found" });
      }

      // Check if user has already saved this shared item
      const existingSave = await storage.getSavedSharedItem(userId, sharedExportId);
      if (existingSave) {
        return res.status(409).json({ message: "You have already saved this item" });
      }

      // Create saved shared item
      const savedItem = await storage.createSavedSharedItem({
        userId,
        sharedExportId,
        itemType,
        itemData,
        sourceUserName: sourceUserName || null,
      });

      res.status(201).json(savedItem);
    } catch (error) {
      console.error("Error saving shared item:", error);
      res.status(500).json({ message: "Failed to save shared item" });
    }
  });

  // Saved shared items - delete a saved item
  app.delete('/api/saved-shared-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const savedItems = await storage.getSavedSharedItemsByUserId(userId);
      const savedItem = savedItems.find(item => item.id === req.params.id);

      if (!savedItem) {
        return res.status(404).json({ message: "Saved item not found" });
      }

      if (savedItem.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteSavedSharedItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting saved shared item:", error);
      res.status(500).json({ message: "Failed to delete saved shared item" });
    }
  });

  app.get('/api/shopping-lists/:id/items', isAuthenticated, async (req: any, res) => {
    try {
      const list = await storage.getShoppingList(req.params.id);
      
      if (!list) {
        return res.status(404).json({ message: "Shopping list not found" });
      }

      const userId = req.user.claims.sub;
      if (list.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const items = await storage.getItemsByShoppingListId(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching shopping list items:", error);
      res.status(500).json({ message: "Failed to fetch shopping list items" });
    }
  });

  // AI outfit generation
  app.post('/api/outfits/generate', isAuthenticated, async (req: any, res) => {
    try {
      const { capsuleId } = req.body;
      
      if (!capsuleId) {
        return res.status(400).json({ message: "Capsule ID is required" });
      }

      const capsule = await storage.getCapsule(capsuleId);
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }

      const userId = req.user.claims.sub;
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const items = await storage.getItemsByCapsuleId(capsuleId);
      
      if (items.length === 0) {
        return res.status(400).json({ message: "Cannot generate outfits from an empty capsule" });
      }

      // Check if OpenAI is configured
      if (!process.env.OPENAI_API_KEY) {
        // Return mock outfits if OpenAI is not configured
        const mockOutfits = [
          {
            id: '1',
            name: 'Casual Day Out',
            occasion: 'Perfect for weekend activities',
            items: items.slice(0, 3).map(item => item.name),
          },
          {
            id: '2',
            name: 'Smart Casual',
            occasion: 'Great for dinner or meetings',
            items: items.slice(0, 4).map(item => item.name),
          },
        ];
        return res.json(mockOutfits);
      }

      // Create a prompt for OpenAI
      const itemsList = items.map(item => `${item.category}: ${item.name}${item.description ? ` (${item.description})` : ''}`).join('\n');
      
      const prompt = `Based on the following capsule wardrobe items, suggest 3 stylish outfit combinations. For each outfit, provide:
1. A creative outfit name
2. The occasion it's suitable for
3. Which items from the list to combine

Capsule wardrobe items:
${itemsList}

Respond in JSON format as an array of objects with: name, occasion, and items (array of item names from the list).`;

      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a professional fashion stylist helping users create outfit combinations from their capsule wardrobe." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      const parsed = JSON.parse(content);
      const outfits = parsed.outfits || [];
      
      res.json(outfits);
    } catch (error) {
      console.error("Error generating outfits:", error);
      res.status(500).json({ message: "Failed to generate outfits" });
    }
  });

  // Onboarding recommendations
  app.post('/api/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { capsuleCategory, season, climate, useCase, style, metalType } = req.body;
      
      // Get user preferences for personalized recommendations
      const user = await storage.getUser(userId);
      const userPreferences = {
        ageRange: user?.ageRange || null,
        stylePreference: user?.stylePreference || null,
        undertone: user?.undertone || null,
      };
      
      const isJewelry = capsuleCategory === 'Jewelry';
      
      // Generate recommendations based on user inputs and preferences
      const recommendations = {
        fabrics: isJewelry ? getMetalTypeRecommendations(metalType) : getFabricRecommendations(season, climate),
        colors: getColorRecommendations(season || 'All', style, userPreferences.stylePreference, userPreferences.undertone),
        structure: isJewelry ? getJewelryStructureRecommendation(useCase) : getStructureRecommendation(useCase),
        userPreferences, // Include for frontend context
      };
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  // Capsule fabric routes
  app.get('/api/capsules/:capsuleId/fabrics', isAuthenticated, async (req: any, res) => {
    try {
      const capsuleId = req.params.capsuleId;
      const userId = req.user.claims.sub;
      
      // Verify capsule ownership
      const capsule = await storage.getCapsule(capsuleId);
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const fabrics = await storage.getFabricsByCapsuleId(capsuleId);
      res.json(fabrics);
    } catch (error) {
      console.error("Error fetching fabrics:", error);
      res.status(500).json({ message: "Failed to fetch fabrics" });
    }
  });

  app.post('/api/capsules/:capsuleId/fabrics', isAuthenticated, async (req: any, res) => {
    try {
      const capsuleId = req.params.capsuleId;
      const userId = req.user.claims.sub;
      
      // Verify capsule ownership
      const capsule = await storage.getCapsule(capsuleId);
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const validation = insertCapsuleFabricSchema.safeParse({ ...req.body, capsuleId });
      
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }
      
      const fabric = await storage.createFabric(validation.data);
      res.json(fabric);
    } catch (error) {
      console.error("Error creating fabric:", error);
      res.status(500).json({ message: "Failed to create fabric" });
    }
  });

  app.delete('/api/fabrics/:id', isAuthenticated, async (req: any, res) => {
    try {
      const fabricId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Get the fabric to verify ownership via its capsule
      const fabric = await storage.getFabric(fabricId);
      if (!fabric) {
        return res.status(404).json({ message: "Fabric not found" });
      }
      
      // Verify capsule ownership
      const capsule = await storage.getCapsule(fabric.capsuleId);
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteFabric(fabricId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting fabric:", error);
      res.status(500).json({ message: "Failed to delete fabric" });
    }
  });

  // Capsule color routes
  app.get('/api/capsules/:capsuleId/colors', isAuthenticated, async (req: any, res) => {
    try {
      const capsuleId = req.params.capsuleId;
      const userId = req.user.claims.sub;
      
      // Verify capsule ownership
      const capsule = await storage.getCapsule(capsuleId);
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const colors = await storage.getColorsByCapsuleId(capsuleId);
      res.json(colors);
    } catch (error) {
      console.error("Error fetching colors:", error);
      res.status(500).json({ message: "Failed to fetch colors" });
    }
  });

  app.post('/api/capsules/:capsuleId/colors', isAuthenticated, async (req: any, res) => {
    try {
      const capsuleId = req.params.capsuleId;
      const userId = req.user.claims.sub;
      
      // Verify capsule ownership
      const capsule = await storage.getCapsule(capsuleId);
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const validation = insertCapsuleColorSchema.safeParse({ ...req.body, capsuleId });
      
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }
      
      const color = await storage.createColor(validation.data);
      res.json(color);
    } catch (error) {
      console.error("Error creating color:", error);
      res.status(500).json({ message: "Failed to create color" });
    }
  });

  app.delete('/api/colors/:id', isAuthenticated, async (req: any, res) => {
    try {
      const colorId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Get the color to verify ownership via its capsule
      const color = await storage.getColor(colorId);
      if (!color) {
        return res.status(404).json({ message: "Color not found" });
      }
      
      // Verify capsule ownership
      const capsule = await storage.getCapsule(color.capsuleId);
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteColor(colorId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting color:", error);
      res.status(500).json({ message: "Failed to delete color" });
    }
  });

  // Generate fabric and color recommendations for a specific capsule
  app.get('/api/capsules/:capsuleId/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const capsuleId = req.params.capsuleId;
      const userId = req.user.claims.sub;
      
      // Verify capsule ownership
      const capsule = await storage.getCapsule(capsuleId);
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get preferences: prioritize wardrobe preferences, fall back to user preferences per field
      let stylePreference: string | null | undefined = null;
      let undertone: string | null | undefined = null;
      
      if (capsule.wardrobeId) {
        const wardrobe = await storage.getWardrobe(capsule.wardrobeId);
        if (wardrobe && wardrobe.userId === userId) {
          stylePreference = wardrobe.stylePreference;
          undertone = wardrobe.undertone;
        }
      }
      
      // Fall back to user preferences individually for each missing field
      const user = await storage.getUser(userId);
      if (user) {
        if (!stylePreference) {
          stylePreference = user.stylePreference;
        }
        if (!undertone) {
          undertone = user.undertone;
        }
      }
      
      // Generate recommendations based on capsule parameters and wardrobe/user preferences
      const recommendations = {
        fabrics: getFabricRecommendations(capsule.season || 'Spring', capsule.climate || 'Temperate'),
        colors: getColorRecommendations(capsule.season || 'Spring', capsule.style || 'Casual', stylePreference, undertone),
      };
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating capsule recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  // Outfit pairing routes
  app.get('/api/capsules/:capsuleId/outfit-pairings', isAuthenticated, async (req: any, res) => {
    try {
      const capsuleId = req.params.capsuleId;
      const userId = req.user.claims.sub;
      
      // Verify capsule ownership
      const capsule = await storage.getCapsule(capsuleId);
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const pairings = await storage.getOutfitPairingsByCapsuleId(capsuleId);
      res.json(pairings);
    } catch (error) {
      console.error("Error fetching outfit pairings:", error);
      res.status(500).json({ message: "Failed to fetch outfit pairings" });
    }
  });

  app.post('/api/capsules/:capsuleId/outfit-pairings', isAuthenticated, async (req: any, res) => {
    try {
      const capsuleId = req.params.capsuleId;
      const userId = req.user.claims.sub;
      
      // Verify capsule ownership
      const capsule = await storage.getCapsule(capsuleId);
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const pairing = await storage.createOutfitPairing({
        capsuleId,
        name: req.body.name,
        outfitData: req.body.outfitData,
      });
      res.json(pairing);
    } catch (error) {
      console.error("Error creating outfit pairing:", error);
      res.status(500).json({ message: "Failed to create outfit pairing" });
    }
  });

  app.delete('/api/outfit-pairings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const pairingId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Get the pairing to verify ownership via its capsule
      const pairing = await storage.getOutfitPairing(pairingId);
      if (!pairing) {
        return res.status(404).json({ message: "Outfit pairing not found" });
      }
      
      // Verify capsule ownership
      const capsule = await storage.getCapsule(pairing.capsuleId);
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteOutfitPairing(pairingId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting outfit pairing:", error);
      res.status(500).json({ message: "Failed to delete outfit pairing" });
    }
  });

  app.get('/api/outfit-pairings/:id/export', isAuthenticated, async (req: any, res) => {
    try {
      const pairingId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Get the pairing to verify ownership via its capsule
      const pairing = await storage.getOutfitPairing(pairingId);
      if (!pairing) {
        return res.status(404).json({ message: "Outfit pairing not found" });
      }
      
      // Verify capsule ownership
      const capsule = await storage.getCapsule(pairing.capsuleId);
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const exportData: any = {
        outfit: pairing,
        capsule: {
          id: capsule.id,
          name: capsule.name,
        },
        exportedAt: new Date().toISOString(),
      };

      // Include measurements if requested
      if (req.query.includeMeasurements === 'true') {
        const user = await storage.getUser(userId);
        if (user?.measurements) {
          exportData.measurements = user.measurements;
        }
      }

      const outfitData = pairing.outfitData as any;
      const outfitName = outfitData?.name || 'outfit';
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="outfit-${outfitName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting outfit:", error);
      res.status(500).json({ message: "Failed to export outfit" });
    }
  });

  // Generate outfit suggestions based on capsule items
  app.post('/api/capsules/:capsuleId/generate-outfit', isAuthenticated, async (req: any, res) => {
    try {
      const capsuleId = req.params.capsuleId;
      const userId = req.user.claims.sub;
      
      // Verify capsule ownership
      const capsule = await storage.getCapsule(capsuleId);
      if (!capsule) {
        return res.status(404).json({ message: "Capsule not found" });
      }
      if (capsule.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get preferences: prioritize wardrobe preferences, fall back to user preferences per field
      let ageRange: string | null | undefined = null;
      let stylePreference: string | null | undefined = null;
      
      if (capsule.wardrobeId) {
        const wardrobe = await storage.getWardrobe(capsule.wardrobeId);
        if (wardrobe && wardrobe.userId === userId) {
          ageRange = wardrobe.ageRange;
          stylePreference = wardrobe.stylePreference;
        }
      }
      
      // Fall back to user preferences individually for each missing field
      const user = await storage.getUser(userId);
      if (user) {
        if (!ageRange) {
          ageRange = user.ageRange;
        }
        if (!stylePreference) {
          stylePreference = user.stylePreference;
        }
      }
      
      const preferences = {
        ageRange: ageRange || null,
        stylePreference: stylePreference || null,
      };
      
      // Get items from the capsule
      const items = await storage.getItemsByCapsuleId(capsuleId);
      
      if (items.length === 0) {
        return res.status(400).json({ message: "Capsule has no items. Add items to generate outfit suggestions." });
      }
      
      // Generate outfit suggestions using AI with wardrobe/user preferences
      const outfits = await generateOutfitSuggestions(capsule, items, preferences);
      res.json(outfits);
    } catch (error) {
      console.error("Error generating outfits:", error);
      res.status(500).json({ message: "Failed to generate outfits" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function getFabricRecommendations(season: string, climate: string): string[] {
  const fabricMap: Record<string, string[]> = {
    'Spring-Temperate': ['Cotton', 'Linen', 'Light Denim', 'Chambray'],
    'Spring-Cold': ['Wool Blend', 'Cotton', 'Fleece', 'Denim'],
    'Spring-Tropical': ['Linen', 'Cotton', 'Rayon', 'Light Silk'],
    'Summer-Tropical': ['Linen', 'Cotton', 'Rayon', 'Bamboo'],
    'Summer-Temperate': ['Cotton', 'Linen', 'Jersey', 'Light Denim'],
    'Summer-Cold': ['Cotton', 'Denim', 'Light Wool', 'Fleece'],
    'Fall-Temperate': ['Wool', 'Denim', 'Cotton', 'Corduroy'],
    'Fall-Cold': ['Wool', 'Cashmere', 'Fleece', 'Heavy Denim'],
    'Fall-Tropical': ['Cotton', 'Linen Blend', 'Light Wool', 'Rayon'],
    'Winter-Cold': ['Wool', 'Cashmere', 'Down', 'Fleece'],
    'Winter-Temperate': ['Wool Blend', 'Cotton', 'Denim', 'Fleece'],
    'Winter-Tropical': ['Cotton', 'Linen', 'Light Wool', 'Silk'],
  };
  
  return fabricMap[`${season}-${climate}`] || ['Cotton', 'Denim', 'Wool', 'Linen'];
}

function getColorRecommendations(season: string, style: string, stylePreference?: string | null, undertone?: string | null): string[] {
  // Base colors by season and style
  const colorMap: Record<string, string[]> = {
    'Spring-Casual': ['Navy', 'White', 'Light Blue', 'Beige', 'Olive'],
    'Spring-Business': ['Navy', 'White', 'Light Gray', 'Burgundy', 'Black'],
    'Spring-Formal': ['Black', 'Navy', 'White', 'Gray', 'Burgundy'],
    'Summer-Casual': ['White', 'Navy', 'Khaki', 'Light Blue', 'Coral'],
    'Summer-Business': ['White', 'Navy', 'Tan', 'Light Gray', 'Black'],
    'Summer-Formal': ['White', 'Black', 'Navy', 'Ivory', 'Gray'],
    'Fall-Casual': ['Olive', 'Burgundy', 'Brown', 'Navy', 'Cream'],
    'Fall-Business': ['Navy', 'Charcoal', 'Brown', 'White', 'Burgundy'],
    'Fall-Formal': ['Black', 'Navy', 'Charcoal', 'White', 'Burgundy'],
    'Winter-Casual': ['Black', 'Gray', 'Navy', 'Burgundy', 'Cream'],
    'Winter-Business': ['Charcoal', 'Navy', 'Black', 'White', 'Burgundy'],
    'Winter-Formal': ['Black', 'Navy', 'Charcoal', 'White', 'Silver'],
  };
  
  let colors = colorMap[`${season}-${style}`] || ['Navy', 'White', 'Black', 'Gray', 'Beige'];
  
  // Undertone-specific color recommendations
  const undertoneAccents: Record<string, string[]> = {
    'Warm': ['Terracotta', 'Mustard', 'Olive', 'Coral', 'Camel', 'Rust', 'Golden Yellow', 'Peach'],
    'Cool': ['Lavender', 'Ice Blue', 'Rose', 'Silver', 'Emerald', 'Berry', 'Fuchsia', 'Plum'],
    'Neutral': ['Dusty Rose', 'Sage', 'Soft Navy', 'Taupe', 'Muted Teal', 'Blush', 'Mauve', 'Slate'],
    'Unknown': ['Navy', 'White', 'Black', 'Gray', 'Burgundy', 'Forest Green'], // Universal flattering colors
  };

  // Add undertone-specific accent colors (prioritize over general accents)
  if (undertone && undertoneAccents[undertone]) {
    const accents = undertoneAccents[undertone].slice(0, 2);
    colors = [...colors.slice(0, 4), ...accents];
  }
  
  // Add style-preference specific accent colors
  if (stylePreference === "Women's" && (!undertone || undertone === 'Unknown')) {
    colors = [...colors, 'Blush', 'Sage'];
  } else if (stylePreference === "Men's" && (!undertone || undertone === 'Unknown')) {
    colors = [...colors, 'Slate', 'Forest'];
  }
  
  return colors.slice(0, 6); // Return max 6 colors
}

function getStructureRecommendation(useCase: string) {
  if (useCase === 'Travel') {
    return {
      type: 'Travel Capsule',
      total: 18,
      breakdown: [
        { category: 'Tops', count: 3 },
        { category: 'Bottoms', count: 3 },
        { category: 'Layering Pieces', count: 3 },
        { category: 'Outerwear', count: 2 },
        { category: 'Shoes', count: 3 },
        { category: 'Accessories', count: 2 },
        { category: 'Extras', count: 2 },
      ],
      categorySlots: { Tops: 3, Bottoms: 3, 'Layering Pieces': 3, Outerwear: 2, Shoes: 3, Accessories: 2, Extras: 2 }
    };
  }
  
  return {
    type: 'Seasonal Capsule',
    total: 33,
    breakdown: [
      { category: 'Tops', count: 10 },
      { category: 'Bottoms', count: 6 },
      { category: 'Layering Pieces', count: 3 },
      { category: 'Dresses', count: 2 },
      { category: 'Outerwear', count: 4 },
      { category: 'Shoes', count: 4 },
      { category: 'Accessories', count: 2 },
      { category: 'Extras', count: 2 },
    ],
    categorySlots: { Tops: 10, Bottoms: 6, 'Layering Pieces': 3, Dresses: 2, Outerwear: 4, Shoes: 4, Accessories: 2, Extras: 2 }
  };
}

function getMetalTypeRecommendations(metalType: string): string[] {
  const metalMap: Record<string, string[]> = {
    'Silver': ['Sterling Silver', 'White Gold', 'Platinum', 'Stainless Steel'],
    'Gold': ['Yellow Gold', 'Gold Vermeil', 'Gold Plated', '14K Gold'],
    'Rose Gold': ['Rose Gold', 'Rose Gold Vermeil', 'Rose Gold Plated', '14K Rose Gold'],
    'Mixed Metals': ['Silver', 'Gold', 'Rose Gold', 'Two-Tone'],
  };
  
  return metalMap[metalType] || ['Sterling Silver', 'Gold', 'Rose Gold', 'Mixed Metals'];
}

function getJewelryStructureRecommendation(useCase: string) {
  // All jewelry capsules use the same default structure
  const defaultStructure = {
    breakdown: [
      { category: 'Rings', count: 2 },
      { category: 'Necklaces', count: 2 },
      { category: 'Bracelets', count: 2 },
      { category: 'Earrings', count: 2 },
      { category: 'Watches', count: 1 },
      { category: 'Cuff & Tie Accessories', count: 0 },
      { category: 'Statement Pieces', count: 1 },
    ],
    categorySlots: { 
      Rings: 2, 
      Necklaces: 2, 
      Bracelets: 2, 
      Earrings: 2, 
      Watches: 1, 
      'Cuff & Tie Accessories': 0, 
      'Statement Pieces': 1 
    }
  };

  if (useCase === 'Everyday') {
    return {
      type: 'Everyday Jewelry',
      total: 10,
      ...defaultStructure
    };
  }
  
  if (useCase === 'Special Events') {
    return {
      type: 'Special Occasion Jewelry',
      total: 10,
      ...defaultStructure
    };
  }
  
  return {
    type: 'Classic Jewelry Collection',
    total: 10,
    ...defaultStructure
  };
}

async function generateOutfitSuggestions(capsule: any, items: any[], userPreferences?: { ageRange?: string | null; stylePreference?: string | null }) {
  const isJewelry = capsule.capsuleCategory === 'Jewelry';
  
  // Group items by category
  const itemsByCategory: Record<string, string[]> = {};
  items.forEach(item => {
    if (!itemsByCategory[item.category]) {
      itemsByCategory[item.category] = [];
    }
    itemsByCategory[item.category].push(item.name);
  });

  const itemList = Object.entries(itemsByCategory)
    .map(([category, itemNames]) => `${category}: ${itemNames.join(', ')}`)
    .join('\n');

  // Build user context for AI
  const userContext = userPreferences?.ageRange || userPreferences?.stylePreference
    ? `\nUser Profile:
- Age Range: ${userPreferences.ageRange || 'Not specified'}
- Style Preference: ${userPreferences.stylePreference || 'Not specified'}`
    : '';

  const prompt = isJewelry
    ? `You are a jewelry stylist. Based on this jewelry collection, create 3 versatile outfit pairings.

Jewelry Collection:
${itemList}

Capsule Details:
- Use Case: ${capsule.useCase || 'Everyday'}
- Style: ${capsule.style || 'Casual'}${userContext}

For each pairing, suggest:
1. A creative name
2. The occasion/context
3. Which pieces to wear together (use the exact item names from the list)

Return your response as a JSON array of 3 outfit suggestions, each with:
{
  "name": "string",
  "occasion": "string",
  "items": ["item1", "item2", ...]
}`
    : `You are a fashion stylist. Based on this capsule wardrobe, create 3 versatile outfit combinations.

Wardrobe Items:
${itemList}

Capsule Details:
- Season: ${capsule.season || 'All-season'}
- Climate: ${capsule.climate || 'Temperate'}
- Use Case: ${capsule.useCase || 'Everyday'}
- Style: ${capsule.style || 'Casual'}${userContext}

For each outfit, suggest:
1. A creative name
2. The occasion/context
3. Which pieces to wear together (use the exact item names from the list)

Return your response as a JSON array of 3 outfit suggestions, each with:
{
  "name": "string",
  "occasion": "string",
  "items": ["item1", "item2", ...]
}`;

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: isJewelry 
            ? "You are a professional jewelry stylist who creates elegant and wearable jewelry pairings."
            : "You are a professional fashion stylist who creates practical, stylish outfit combinations."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(response);
    
    // Handle different possible response structures
    const outfits = parsed.outfits || parsed.suggestions || parsed;
    
    if (Array.isArray(outfits)) {
      return outfits.map((outfit: any, index: number) => ({
        id: `outfit-${index + 1}`,
        name: outfit.name,
        occasion: outfit.occasion,
        items: outfit.items
      }));
    }
    
    throw new Error("Invalid response format from OpenAI");
  } catch (error) {
    console.error("OpenAI error:", error);
    
    // Fallback: return simple random combinations
    const fallbackOutfits = [];
    const categories = Object.keys(itemsByCategory);
    
    for (let i = 0; i < 3; i++) {
      const selectedItems: string[] = [];
      categories.forEach(category => {
        const categoryItems = itemsByCategory[category];
        if (categoryItems.length > 0) {
          const randomItem = categoryItems[Math.floor(Math.random() * categoryItems.length)];
          selectedItems.push(randomItem);
        }
      });
      
      fallbackOutfits.push({
        id: `outfit-${i + 1}`,
        name: `${isJewelry ? 'Jewelry Pairing' : 'Outfit'} ${i + 1}`,
        occasion: isJewelry ? 'Versatile jewelry combination' : 'Versatile outfit combination',
        items: selectedItems
      });
    }
    
    return fallbackOutfits;
  }
}
