import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
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

      const actualTier = (user.subscriptionTier || 'free') as SubscriptionTier;
      const previewTier = user.previewTier as SubscriptionTier | null;
      const effectiveTier = (user.isAdmin && previewTier) ? previewTier : actualTier;
      const tierConfig = TIER_LIMITS[effectiveTier] || TIER_LIMITS.free;

      // Get family membership info
      const familyMembership = await storage.getFamilyMembershipByUserId(userId);
      let familyInfo = null;
      
      if (familyMembership) {
        const familyAccount = await storage.getFamilyAccount(familyMembership.familyAccountId);
        familyInfo = {
          isFamilyMember: true,
          role: familyMembership.role,
          familyAccountId: familyMembership.familyAccountId,
          familyName: familyAccount?.name || 'Family',
          isPrimaryManager: familyAccount?.primaryManagerId === userId,
        };
      }

      // Admin family view mode override
      const adminFamilyViewMode = user.isAdmin ? (user.adminFamilyViewMode as 'manager' | 'member' | null) : null;
      const adminProfessionalViewMode = user.isAdmin ? (user.adminProfessionalViewMode as 'shopper' | 'client' | null) : null;
      
      // If admin is using family view mode and has family tier or higher, simulate family experience
      if (user.isAdmin && adminFamilyViewMode && (effectiveTier === 'family' || effectiveTier === 'professional')) {
        familyInfo = {
          isFamilyMember: true,
          role: adminFamilyViewMode,
          familyAccountId: 'admin-preview',
          familyName: 'Family',
          isPrimaryManager: adminFamilyViewMode === 'manager',
        };
      }

      // Get professional client info (if user is a client of a professional shopper)
      let professionalInfo = null;
      const professionalClient = await storage.getProfessionalClientByUserId(userId);
      if (professionalClient) {
        const professionalAccount = await storage.getProfessionalAccount(professionalClient.professionalAccountId);
        professionalInfo = {
          isClient: true,
          clientId: professionalClient.id,
          professionalAccountId: professionalClient.professionalAccountId,
          businessName: professionalAccount?.businessName || 'Professional Shopper',
        };
      }

      // If admin is using professional view mode and has professional tier, simulate professional experience
      if (user.isAdmin && adminProfessionalViewMode && effectiveTier === 'professional') {
        if (adminProfessionalViewMode === 'client') {
          professionalInfo = {
            isClient: true,
            clientId: 'admin-preview',
            professionalAccountId: 'admin-preview',
            businessName: 'Preview Professional Shopper',
          };
        }
      }

      res.json({
        tier: effectiveTier,
        actualTier: actualTier,
        previewTier: user.isAdmin ? previewTier : null,
        isPreviewing: user.isAdmin && !!previewTier,
        adminFamilyViewMode: adminFamilyViewMode,
        adminProfessionalViewMode: adminProfessionalViewMode,
        status: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt,
        features: tierConfig,
        family: familyInfo,
        professional: professionalInfo,
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  // Admin tier preview endpoints - Zod schemas for validation
  const adminTierSchema = z.object({
    tier: z.enum(['free', 'premium', 'family', 'professional']),
  });
  const adminPreviewTierSchema = z.object({
    tier: z.enum(['free', 'premium', 'family', 'professional']).optional(),
  });

  app.post('/api/admin/preview-tier', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validation = adminPreviewTierSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      const tier = validation.data.tier || null;
      await storage.updateUser(userId, { previewTier: tier } as any);
      res.json({ success: true, previewTier: tier });
    } catch (error) {
      console.error("Error setting preview tier:", error);
      res.status(500).json({ message: "Failed to set preview tier" });
    }
  });

  app.delete('/api/admin/preview-tier', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.updateUser(userId, { previewTier: null } as any);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing preview tier:", error);
      res.status(500).json({ message: "Failed to clear preview tier" });
    }
  });

  // Admin can set their actual subscription tier without payment
  app.post('/api/admin/set-tier', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validation = adminTierSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      const tier = validation.data.tier;
      await storage.updateUserSubscription(userId, { 
        subscriptionTier: tier,
        subscriptionStatus: tier === 'free' ? null : 'active'
      });
      res.json({ success: true, tier });
    } catch (error) {
      console.error("Error setting admin tier:", error);
      res.status(500).json({ message: "Failed to set tier" });
    }
  });

  // Admin family view mode - allows viewing manager or member experience
  const adminFamilyViewSchema = z.object({
    mode: z.enum(['manager', 'member']).nullable(),
  });

  app.post('/api/admin/family-view-mode', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validation = adminFamilyViewSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      const mode = validation.data.mode;
      await storage.updateUser(userId, { adminFamilyViewMode: mode } as any);
      res.json({ success: true, adminFamilyViewMode: mode });
    } catch (error) {
      console.error("Error setting admin family view mode:", error);
      res.status(500).json({ message: "Failed to set family view mode" });
    }
  });

  app.delete('/api/admin/family-view-mode', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.updateUser(userId, { adminFamilyViewMode: null } as any);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing admin family view mode:", error);
      res.status(500).json({ message: "Failed to clear family view mode" });
    }
  });

  // Admin professional view mode - allows viewing shopper or client experience
  const adminProfessionalViewSchema = z.object({
    mode: z.enum(['shopper', 'client']),
  });

  app.post('/api/admin/professional-view-mode', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validation = adminProfessionalViewSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      const mode = validation.data.mode;
      await storage.updateUser(userId, { adminProfessionalViewMode: mode } as any);
      res.json({ success: true, adminProfessionalViewMode: mode });
    } catch (error) {
      console.error("Error setting admin professional view mode:", error);
      res.status(500).json({ message: "Failed to set professional view mode" });
    }
  });

  app.delete('/api/admin/professional-view-mode', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.updateUser(userId, { adminProfessionalViewMode: null } as any);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing admin professional view mode:", error);
      res.status(500).json({ message: "Failed to clear professional view mode" });
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
      const demographic = req.query.demographic as string | undefined;
      const products = await storage.getAffiliateProducts(category, demographic);
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

  // Sponsor Analytics routes
  app.post('/api/sponsor-analytics/track', async (req: any, res) => {
    try {
      const { sponsorId, placement, eventType } = req.body;
      
      if (!sponsorId || !placement || !eventType) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      if (!['impression', 'click'].includes(eventType)) {
        return res.status(400).json({ message: "Invalid event type" });
      }
      
      const userId = req.user?.claims?.sub || null;
      
      await storage.trackSponsorEvent({
        sponsorId,
        placement,
        eventType,
        userId,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking sponsor event:", error);
      res.status(500).json({ message: "Failed to track event" });
    }
  });

  app.get('/api/sponsor-analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const analytics = await storage.getSponsorAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching sponsor analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Admin Vault Management routes
  app.get('/api/admin/vault/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const products = await storage.getAllAffiliateProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching admin vault products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post('/api/admin/vault/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { name, brand, categories, demographics, description, price, imageUrl, affiliateUrl, isFeatured, isActive } = req.body;
      
      if (!name || !categories || categories.length === 0 || !affiliateUrl) {
        return res.status(400).json({ message: "Name, at least one category, and affiliate URL are required" });
      }
      
      const product = await storage.createAffiliateProduct({
        name,
        brand,
        categories,
        demographics: demographics || [],
        description,
        price,
        imageUrl,
        affiliateUrl,
        isFeatured: isFeatured ?? false,
        isActive: isActive ?? true,
      });
      
      res.json(product);
    } catch (error) {
      console.error("Error creating vault product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put('/api/admin/vault/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { name, brand, categories, demographics, description, price, imageUrl, affiliateUrl, isFeatured, isActive } = req.body;
      
      const product = await storage.updateAffiliateProduct(req.params.id, {
        name,
        brand,
        categories,
        demographics,
        description,
        price,
        imageUrl,
        affiliateUrl,
        isFeatured,
        isActive,
      });
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error updating vault product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/admin/vault/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      await storage.deleteAffiliateProduct(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vault product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Admin Retailer Management Routes
  app.get('/api/admin/retailers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const retailers = await storage.getAllRetailers();
      res.json(retailers);
    } catch (error) {
      console.error("Error fetching retailers:", error);
      res.status(500).json({ message: "Failed to fetch retailers" });
    }
  });

  app.get('/api/admin/retailers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const retailer = await storage.getRetailer(req.params.id);
      if (!retailer) {
        return res.status(404).json({ message: "Retailer not found" });
      }
      
      res.json(retailer);
    } catch (error) {
      console.error("Error fetching retailer:", error);
      res.status(500).json({ message: "Failed to fetch retailer" });
    }
  });

  app.patch('/api/admin/retailers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { revenueSharePercent, status, notes } = req.body;
      const retailer = await storage.updateRetailer(req.params.id, {
        revenueSharePercent,
        status,
        notes,
      });
      
      if (!retailer) {
        return res.status(404).json({ message: "Retailer not found" });
      }
      
      res.json(retailer);
    } catch (error) {
      console.error("Error updating retailer:", error);
      res.status(500).json({ message: "Failed to update retailer" });
    }
  });

  app.delete('/api/admin/retailers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      await storage.deleteRetailer(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting retailer:", error);
      res.status(500).json({ message: "Failed to delete retailer" });
    }
  });

  // Retailer Applications (Admin)
  app.get('/api/admin/retailer-applications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const applications = await storage.getAllRetailerApplications();
      res.json(applications);
    } catch (error) {
      console.error("Error fetching retailer applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.patch('/api/admin/retailer-applications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { status, revenueSharePercent, reviewNotes } = req.body;
      const application = await storage.getRetailerApplication(req.params.id);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // If approving, create the retailer account
      if (status === 'approved' && application.status === 'pending') {
        const retailer = await storage.createRetailer({
          businessName: application.businessName,
          contactEmail: application.contactEmail,
          contactName: application.contactName,
          website: application.website,
          ecommercePlatform: application.ecommercePlatform,
          description: application.description,
          revenueSharePercent: revenueSharePercent || 15,
          status: 'active',
          notes: reviewNotes,
        });
        
        await storage.updateRetailerApplication(req.params.id, {
          status: 'approved',
          reviewedAt: new Date(),
          reviewedBy: userId,
          reviewNotes,
        });
        
        res.json({ application: { ...application, status: 'approved' }, retailer });
      } else {
        const updated = await storage.updateRetailerApplication(req.params.id, {
          status,
          reviewedAt: new Date(),
          reviewedBy: userId,
          reviewNotes,
        });
        res.json({ application: updated });
      }
    } catch (error) {
      console.error("Error processing retailer application:", error);
      res.status(500).json({ message: "Failed to process application" });
    }
  });

  // Retailer Invites (Admin)
  app.get('/api/admin/retailer-invites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const invites = await storage.getPendingRetailerInvites();
      res.json(invites);
    } catch (error) {
      console.error("Error fetching retailer invites:", error);
      res.status(500).json({ message: "Failed to fetch invites" });
    }
  });

  app.post('/api/admin/retailer-invites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { contactEmail, businessName, proposedRevenueShare, message } = req.body;
      
      if (!contactEmail || !businessName) {
        return res.status(400).json({ message: "Email and business name are required" });
      }
      
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const invite = await storage.createRetailerInvite({
        contactEmail,
        businessName,
        proposedRevenueShare: proposedRevenueShare || 15,
        message,
        token,
        expiresAt,
        invitedBy: userId,
      });
      
      res.json(invite);
    } catch (error) {
      console.error("Error creating retailer invite:", error);
      res.status(500).json({ message: "Failed to create invite" });
    }
  });

  app.delete('/api/admin/retailer-invites/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      await storage.deleteRetailerInvite(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting retailer invite:", error);
      res.status(500).json({ message: "Failed to delete invite" });
    }
  });

  // Retailer Metrics (Admin view)
  app.get('/api/admin/retailers/:id/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
      const metrics = await storage.getRetailerMetrics(req.params.id, startDate);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching retailer metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // Retailer Products (Admin view)
  app.get('/api/admin/retailers/:id/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const products = await storage.getRetailerProductsByRetailerId(req.params.id);
      res.json(products);
    } catch (error) {
      console.error("Error fetching retailer products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Retailer Ads (Admin management)
  app.get('/api/admin/retailer-ads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const retailerId = req.query.retailerId;
      let ads;
      if (retailerId) {
        ads = await storage.getRetailerAdsByRetailerId(retailerId as string);
      } else {
        ads = await storage.getActiveRetailerAds();
      }
      res.json(ads);
    } catch (error) {
      console.error("Error fetching retailer ads:", error);
      res.status(500).json({ message: "Failed to fetch ads" });
    }
  });

  app.patch('/api/admin/retailer-ads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { isActive, type, startDate, endDate, title, description, imageUrl, linkUrl } = req.body;
      const ad = await storage.updateRetailerAd(req.params.id, {
        isActive,
        type,
        title,
        description,
        imageUrl,
        linkUrl,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
      
      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }
      
      res.json(ad);
    } catch (error) {
      console.error("Error updating retailer ad:", error);
      res.status(500).json({ message: "Failed to update ad" });
    }
  });

  // Public Retailer Application (no auth required)
  app.post('/api/retailer-applications', async (req, res) => {
    try {
      const { businessName, contactEmail, contactName, website, description, ecommercePlatform, expectedProductCount } = req.body;
      
      if (!businessName || !contactEmail) {
        return res.status(400).json({ message: "Business name and email are required" });
      }
      
      const application = await storage.createRetailerApplication({
        businessName,
        contactEmail,
        contactName,
        website,
        description,
        ecommercePlatform,
        expectedProductCount,
      });
      
      res.json({ success: true, applicationId: application.id });
    } catch (error) {
      console.error("Error creating retailer application:", error);
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  // Retailer Invite Acceptance
  app.get('/api/retailer-invites/:token', async (req, res) => {
    try {
      const invite = await storage.getRetailerInviteByToken(req.params.token);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      if (invite.acceptedAt) {
        return res.status(400).json({ message: "Invite already accepted" });
      }
      
      if (new Date() > invite.expiresAt) {
        return res.status(400).json({ message: "Invite has expired" });
      }
      
      res.json({
        businessName: invite.businessName,
        contactEmail: invite.contactEmail,
        proposedRevenueShare: invite.proposedRevenueShare,
        message: invite.message,
      });
    } catch (error) {
      console.error("Error fetching retailer invite:", error);
      res.status(500).json({ message: "Failed to fetch invite" });
    }
  });

  app.post('/api/retailer-invites/:token/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invite = await storage.getRetailerInviteByToken(req.params.token);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      if (invite.acceptedAt) {
        return res.status(400).json({ message: "Invite already accepted" });
      }
      
      if (new Date() > invite.expiresAt) {
        return res.status(400).json({ message: "Invite has expired" });
      }
      
      // Create the retailer account
      const retailer = await storage.createRetailer({
        businessName: invite.businessName,
        contactEmail: invite.contactEmail,
        contactName: invite.contactName,
        revenueSharePercent: invite.proposedRevenueShare || 15,
        status: 'active',
        approvedAt: new Date(),
        approvedBy: invite.invitedBy,
      });
      
      // Link the user to the retailer
      await storage.createRetailerUser({
        retailerId: retailer.id,
        userId,
        role: 'admin',
      });
      
      // Mark invite as accepted
      await storage.updateRetailerInvite(invite.id, {
        acceptedAt: new Date(),
        retailerId: retailer.id,
      });
      
      res.json({ success: true, retailerId: retailer.id });
    } catch (error) {
      console.error("Error accepting retailer invite:", error);
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });

  // Wardrobe routes
  app.get('/api/wardrobes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user is a professional client - they only see wardrobes created for them
      const professionalClient = await storage.getProfessionalClientByUserId(userId);
      
      let wardrobes;
      if (professionalClient) {
        // Professional clients only see wardrobes linked to their client relationship
        wardrobes = await storage.getWardrobesByProfessionalClientId(professionalClient.id);
      } else {
        // Regular users see their own wardrobes (excluding any professional client wardrobes)
        const allWardrobes = await storage.getWardrobesByUserId(userId);
        wardrobes = allWardrobes.filter(w => !w.professionalClientId);
      }
      
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

      const userId = req.user.claims.sub;
      
      // Check if user is a professional client accessing their linked wardrobe
      if (wardrobe.professionalClientId) {
        const professionalClient = await storage.getProfessionalClientByUserId(userId);
        if (professionalClient && professionalClient.id === wardrobe.professionalClientId) {
          return res.json(wardrobe);
        }
        // Also allow the professional shopper to access
        const professionalAccount = await storage.getProfessionalAccount(
          (await storage.getProfessionalClient(wardrobe.professionalClientId))?.professionalAccountId || ''
        );
        if (professionalAccount && professionalAccount.shopperId === userId) {
          return res.json(wardrobe);
        }
      }
      
      // Verify ownership for regular wardrobes
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
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { clientId, ...wardrobeData } = req.body;
      
      // Check if this is a professional creating a wardrobe for a client
      if (clientId) {
        const professionalAccount = await storage.getProfessionalAccountByShopper(userId);
        if (!professionalAccount) {
          return res.status(403).json({ 
            message: "Only professional shoppers can create wardrobes for clients",
            code: 'NOT_PROFESSIONAL'
          });
        }
        
        // Verify the client belongs to this professional
        const client = await storage.getProfessionalClient(clientId);
        if (!client || client.professionalAccountId !== professionalAccount.id) {
          return res.status(403).json({ 
            message: "This client does not belong to your professional account",
            code: 'CLIENT_NOT_FOUND'
          });
        }
        
        // Create wardrobe for the client
        const validation = insertWardrobeSchema.safeParse({
          ...wardrobeData,
          userId: client.userId,
          professionalClientId: clientId,
        });
        
        if (!validation.success) {
          return res.status(400).json({ message: fromError(validation.error).toString() });
        }

        const wardrobe = await storage.createWardrobe(validation.data);
        return res.status(201).json(wardrobe);
      }
      
      // Check if user is a professional client (restricted from creating wardrobes)
      const professionalClient = await storage.getProfessionalClientByUserId(userId);
      if (professionalClient) {
        return res.status(403).json({ 
          message: "As a professional client, your wardrobe is managed by your professional shopper.",
          code: 'CLIENT_RESTRICTED'
        });
      }
      
      // Check if user is a family member (non-manager) - restricted from creating wardrobes
      const familyMembership = await storage.getFamilyMembershipByUserId(userId);
      if (familyMembership && familyMembership.role !== 'manager') {
        return res.status(403).json({ 
          message: "Family members cannot create wardrobes. Your wardrobe is managed by the family manager.",
          code: 'MEMBER_RESTRICTED'
        });
      }
      
      // Calculate effective tier (respecting preview mode for admins)
      const actualTier = (user.subscriptionTier || 'free') as SubscriptionTier;
      const previewTier = user.previewTier as SubscriptionTier | null;
      const effectiveTier = (user.isAdmin && previewTier) ? previewTier : actualTier;
      const tierConfig = TIER_LIMITS[effectiveTier] || TIER_LIMITS.free;
      
      // Check wardrobe limits (skip if unlimited = -1)
      if (tierConfig.maxWardrobes !== -1) {
        const existingWardrobes = await storage.getWardrobesByUserId(userId);
        // Only count non-client wardrobes
        const ownWardrobes = existingWardrobes.filter(w => !w.professionalClientId);
        if (ownWardrobes.length >= tierConfig.maxWardrobes) {
          return res.status(403).json({ 
            message: `You've reached the maximum of ${tierConfig.maxWardrobes} wardrobe${tierConfig.maxWardrobes === 1 ? '' : 's'} for your ${effectiveTier} plan. Upgrade to create more wardrobes.`,
            code: 'WARDROBE_LIMIT_REACHED'
          });
        }
      }
      
      // Validate request body
      const validation = insertWardrobeSchema.safeParse({
        ...wardrobeData,
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

      const userId = req.user.claims.sub;
      let canEdit = false;
      
      // Check if user is the owner
      if (wardrobe.userId === userId) {
        canEdit = true;
      }
      
      // Check if user is a professional client editing their linked wardrobe
      if (wardrobe.professionalClientId) {
        const professionalClient = await storage.getProfessionalClientByUserId(userId);
        if (professionalClient && professionalClient.id === wardrobe.professionalClientId) {
          canEdit = true;
        }
        // Also allow the professional shopper to edit
        const client = await storage.getProfessionalClient(wardrobe.professionalClientId);
        if (client) {
          const professionalAccount = await storage.getProfessionalAccount(client.professionalAccountId);
          if (professionalAccount && professionalAccount.shopperId === userId) {
            canEdit = true;
          }
        }
      }
      
      if (!canEdit) {
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

      const userId = req.user.claims.sub;
      let canDelete = false;
      
      // Check if this is a professional client wardrobe
      if (wardrobe.professionalClientId) {
        // Only the professional shopper can delete client wardrobes
        const client = await storage.getProfessionalClient(wardrobe.professionalClientId);
        if (client) {
          const professionalAccount = await storage.getProfessionalAccount(client.professionalAccountId);
          if (professionalAccount && professionalAccount.shopperId === userId) {
            canDelete = true;
          }
        }
        // Clients cannot delete their own wardrobes
        const professionalClient = await storage.getProfessionalClientByUserId(userId);
        if (professionalClient && professionalClient.id === wardrobe.professionalClientId) {
          return res.status(403).json({ 
            message: "As a professional client, your wardrobe is managed by your professional shopper.",
            code: 'CLIENT_RESTRICTED'
          });
        }
      } else {
        // Regular wardrobe - verify ownership
        if (wardrobe.userId === userId) {
          canDelete = true;
        }
      }
      
      if (!canDelete) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Check if user is a family member (non-manager) - restricted from deleting wardrobes
      const familyMembership = await storage.getFamilyMembershipByUserId(userId);
      if (familyMembership && familyMembership.role !== 'manager') {
        return res.status(403).json({ 
          message: "Family members cannot delete wardrobes. Your wardrobe is managed by the family manager.",
          code: 'MEMBER_RESTRICTED'
        });
      }

      // Don't allow deleting the default wardrobe (only for non-client wardrobes)
      if (wardrobe.isDefault && !wardrobe.professionalClientId) {
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

      // Get user's effective tier for limit checking
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const actualTier = (user.subscriptionTier || 'free') as SubscriptionTier;
      const previewTier = user.previewTier as SubscriptionTier | null;
      const effectiveTier = (user.isAdmin && previewTier) ? previewTier : actualTier;
      const tierConfig = TIER_LIMITS[effectiveTier] || TIER_LIMITS.free;
      
      // Determine if this is a jewelry capsule
      const isJewelry = validation.data.capsuleCategory === 'Jewelry';
      const maxLimit = isJewelry ? tierConfig.maxJewelryCapsulesPerWardrobe : tierConfig.maxClothingCapsulesPerWardrobe;
      
      // Check capsule limits (skip if unlimited = -1)
      if (maxLimit !== -1) {
        const wardrobeId = validation.data.wardrobeId;
        const existingCapsules = await storage.getCapsulesByUserId(userId);
        
        // Count capsules in this wardrobe by category
        const capsulesInWardrobe = existingCapsules.filter(c => 
          c.wardrobeId === wardrobeId && 
          (isJewelry ? c.capsuleCategory === 'Jewelry' : c.capsuleCategory !== 'Jewelry')
        );
        
        if (capsulesInWardrobe.length >= maxLimit) {
          const capsuleType = isJewelry ? 'jewelry' : 'clothing';
          return res.status(403).json({ 
            message: `You've reached your limit of ${maxLimit} ${capsuleType} capsules per wardrobe. Upgrade your plan for more capsules.`,
            code: 'CAPSULE_LIMIT_REACHED',
            limit: maxLimit,
            current: capsulesInWardrobe.length,
            capsuleType
          });
        }
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

      // Get user's effective tier for limit checking
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const actualTier = (user.subscriptionTier || 'free') as SubscriptionTier;
      const previewTier = user.previewTier as SubscriptionTier | null;
      const effectiveTier = (user.isAdmin && previewTier) ? previewTier : actualTier;
      const tierConfig = TIER_LIMITS[effectiveTier] || TIER_LIMITS.free;
      
      // Determine if this is a jewelry capsule
      const isJewelry = capsule.capsuleCategory === 'Jewelry';
      const maxLimit = isJewelry ? tierConfig.maxJewelryCapsulesPerWardrobe : tierConfig.maxClothingCapsulesPerWardrobe;
      
      // Check capsule limits (skip if unlimited = -1)
      if (maxLimit !== -1) {
        const wardrobeId = capsule.wardrobeId;
        const existingCapsules = await storage.getCapsulesByUserId(userId);
        
        // Count capsules in this wardrobe by category
        const capsulesInWardrobe = existingCapsules.filter(c => 
          c.wardrobeId === wardrobeId && 
          (isJewelry ? c.capsuleCategory === 'Jewelry' : c.capsuleCategory !== 'Jewelry')
        );
        
        if (capsulesInWardrobe.length >= maxLimit) {
          const capsuleType = isJewelry ? 'jewelry' : 'clothing';
          return res.status(403).json({ 
            message: `You've reached your limit of ${maxLimit} ${capsuleType} capsules per wardrobe. Upgrade your plan for more capsules.`,
            code: 'CAPSULE_LIMIT_REACHED',
            limit: maxLimit,
            current: capsulesInWardrobe.length,
            capsuleType
          });
        }
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

  // ===== FAMILY ACCOUNT MANAGEMENT =====
  
  // Get current user's family status (membership, account, or nothing)
  app.get('/api/family/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Handle admin preview mode - return simulated family data
      const adminFamilyViewMode = user.isAdmin ? user.adminFamilyViewMode as 'manager' | 'member' | null : null;
      if (user.isAdmin && adminFamilyViewMode) {
        const isPreviewManager = adminFamilyViewMode === 'manager';
        return res.json({
          isFamilyMember: true,
          familyAccount: {
            id: 'admin-preview',
            name: 'Family',
            maxMembers: 5,
          },
          membership: {
            id: 'admin-preview-membership',
            role: adminFamilyViewMode,
            joinedAt: new Date().toISOString(),
          },
          members: isPreviewManager ? [{
            id: 'admin-preview-member',
            userId: userId,
            role: 'manager',
            joinedAt: new Date().toISOString(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            profileImageUrl: user.profileImageUrl,
          }] : [],
          pendingInvites: [],
          isAdminPreview: true,
        });
      }
      
      // Check if user is a member of any family
      const membership = await storage.getFamilyMembershipByUserId(userId);
      
      if (!membership) {
        // Check for pending invites
        const pendingInvites = user.email ? await storage.getPendingFamilyInvitesByEmail(user.email) : [];
        return res.json({ 
          isFamilyMember: false, 
          familyAccount: null, 
          membership: null,
          members: [],
          pendingInvites: pendingInvites.map(inv => ({
            id: inv.id,
            token: inv.token,
            wardrobeName: inv.wardrobeName,
            role: inv.role,
            expiresAt: inv.expiresAt,
          })),
        });
      }
      
      // Get family account details
      const familyAccount = await storage.getFamilyAccount(membership.familyAccountId);
      if (!familyAccount) {
        return res.status(404).json({ message: "Family account not found" });
      }
      
      // Get all family members if user is a manager
      let members: any[] = [];
      let pendingInvites: any[] = [];
      
      if (membership.role === 'manager') {
        const memberships = await storage.getFamilyMembershipsByAccountId(familyAccount.id);
        const memberPromises = memberships.map(async (m) => {
          const memberUser = await storage.getUser(m.userId);
          return {
            id: m.id,
            userId: m.userId,
            role: m.role,
            joinedAt: m.joinedAt,
            firstName: memberUser?.firstName,
            lastName: memberUser?.lastName,
            email: memberUser?.email,
            profileImageUrl: memberUser?.profileImageUrl,
          };
        });
        members = await Promise.all(memberPromises);
        
        // Get pending invites
        const invites = await storage.getFamilyInvitesByAccountId(familyAccount.id);
        const now = new Date();
        pendingInvites = invites
          .filter(inv => !inv.acceptedAt && inv.expiresAt > now)
          .map(inv => ({
            id: inv.id,
            email: inv.email,
            role: inv.role,
            wardrobeName: inv.wardrobeName,
            expiresAt: inv.expiresAt,
            createdAt: inv.createdAt,
          }));
      }
      
      res.json({
        isFamilyMember: true,
        familyAccount: {
          id: familyAccount.id,
          name: familyAccount.name,
          maxMembers: familyAccount.maxMembers,
        },
        membership: {
          id: membership.id,
          role: membership.role,
          joinedAt: membership.joinedAt,
        },
        members,
        pendingInvites,
      });
    } catch (error) {
      console.error("Error fetching family status:", error);
      res.status(500).json({ message: "Failed to fetch family status" });
    }
  });

  // Invite a family member (managers only)
  const familyInviteSchema = z.object({
    email: z.string().email().optional().or(z.literal('')),
    role: z.enum(['manager', 'member']).default('member'),
    wardrobeName: z.string().min(1, "Wardrobe name is required"),
  });

  app.post('/api/family/invite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Validate request
      const validation = familyInviteSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }
      
      const { email, role, wardrobeName } = validation.data;
      
      // Handle admin preview mode - return simulated success
      const adminFamilyViewMode = user?.isAdmin ? user.adminFamilyViewMode as 'manager' | 'member' | null : null;
      if (user?.isAdmin && adminFamilyViewMode === 'manager') {
        return res.json({
          id: 'admin-preview-invite',
          email,
          role,
          wardrobeName,
          token: 'admin-preview-token',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isAdminPreview: true,
          message: 'This is a preview - no actual invite was sent',
        });
      }
      
      // Check if user is a manager
      const membership = await storage.getFamilyMembershipByUserId(userId);
      if (!membership || membership.role !== 'manager') {
        return res.status(403).json({ message: "Only family managers can invite members" });
      }
      
      const familyAccount = await storage.getFamilyAccount(membership.familyAccountId);
      if (!familyAccount) {
        return res.status(404).json({ message: "Family account not found" });
      }
      
      // Check if trying to add another manager (max 2)
      if (role === 'manager') {
        const managerCount = await storage.countManagersInFamily(familyAccount.id);
        if (managerCount >= 2) {
          return res.status(400).json({ 
            message: "Family accounts can have at most 2 managers",
            code: "MAX_MANAGERS_REACHED"
          });
        }
      }
      
      // Check current member count
      const currentMembers = await storage.getFamilyMembershipsByAccountId(familyAccount.id);
      if (currentMembers.length >= familyAccount.maxMembers) {
        return res.status(400).json({ 
          message: "Family account has reached maximum members",
          code: "MAX_MEMBERS_REACHED"
        });
      }
      
      // Generate invite token
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      const invite = await storage.createFamilyInvite({
        familyAccountId: familyAccount.id,
        invitedByUserId: userId,
        email: email || '',
        role,
        wardrobeName,
        token,
        expiresAt,
      });
      
      res.json({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        wardrobeName: invite.wardrobeName,
        token: invite.token,
        expiresAt: invite.expiresAt,
      });
    } catch (error) {
      console.error("Error creating family invite:", error);
      res.status(500).json({ message: "Failed to create family invite" });
    }
  });

  // Accept a family invite
  app.post('/api/family/invite/:token/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { token } = req.params;
      
      // Get the invite
      const invite = await storage.getFamilyInviteByToken(token);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found or expired" });
      }
      
      // Check if invite is expired
      if (invite.expiresAt < new Date()) {
        return res.status(400).json({ message: "This invite has expired" });
      }
      
      // Check if invite was already accepted
      if (invite.acceptedAt) {
        return res.status(400).json({ message: "This invite has already been used" });
      }
      
      // Check if user is already in a family
      const existingMembership = await storage.getFamilyMembershipByUserId(userId);
      if (existingMembership) {
        return res.status(400).json({ 
          message: "You are already a member of a family account. Leave your current family first.",
          code: "ALREADY_IN_FAMILY"
        });
      }
      
      // Get family account
      const familyAccount = await storage.getFamilyAccount(invite.familyAccountId);
      if (!familyAccount) {
        return res.status(404).json({ message: "Family account no longer exists" });
      }
      
      // Check member limit again
      const currentMembers = await storage.getFamilyMembershipsByAccountId(familyAccount.id);
      if (currentMembers.length >= familyAccount.maxMembers) {
        return res.status(400).json({ 
          message: "Family account has reached maximum members",
          code: "MAX_MEMBERS_REACHED"
        });
      }
      
      // Check max managers if invite is for manager role
      if (invite.role === 'manager') {
        const managerCount = await storage.countManagersInFamily(familyAccount.id);
        if (managerCount >= 2) {
          return res.status(400).json({ 
            message: "Family accounts can have at most 2 managers. This invite is no longer valid.",
            code: "MAX_MANAGERS_REACHED"
          });
        }
      }
      
      // Create membership
      const membership = await storage.createFamilyMembership({
        familyAccountId: familyAccount.id,
        userId,
        role: invite.role,
      });
      
      // Mark invite as accepted
      await storage.updateFamilyInvite(invite.id, { acceptedAt: new Date() });
      
      // Update user's subscription tier to family (they inherit family benefits)
      await storage.updateUserSubscription(userId, {
        subscriptionTier: 'family',
        subscriptionStatus: 'active',
      });
      
      // Create a wardrobe for the new member if name was specified
      if (invite.wardrobeName) {
        const user = await storage.getUser(userId);
        await storage.createWardrobe({
          userId,
          name: invite.wardrobeName,
          isDefault: true,
          ageRange: user?.ageRange || null,
          stylePreference: user?.stylePreference || null,
          undertone: user?.undertone || null,
          measurements: null,
        });
      }
      
      res.json({
        message: "Successfully joined family account",
        membership: {
          id: membership.id,
          role: membership.role,
          familyAccountId: membership.familyAccountId,
        },
      });
    } catch (error) {
      console.error("Error accepting family invite:", error);
      res.status(500).json({ message: "Failed to accept family invite" });
    }
  });

  // Cancel a pending invite (managers only)
  app.delete('/api/family/invite/:inviteId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { inviteId } = req.params;
      
      // Check if user is a manager
      const membership = await storage.getFamilyMembershipByUserId(userId);
      if (!membership || membership.role !== 'manager') {
        return res.status(403).json({ message: "Only family managers can cancel invites" });
      }
      
      // Get the invite
      const invite = await storage.getFamilyInvite(inviteId);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      // Check invite belongs to this family
      if (invite.familyAccountId !== membership.familyAccountId) {
        return res.status(403).json({ message: "Cannot cancel invites for other families" });
      }
      
      await storage.deleteFamilyInvite(inviteId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error canceling family invite:", error);
      res.status(500).json({ message: "Failed to cancel invite" });
    }
  });

  // Remove a family member (managers only)
  app.delete('/api/family/member/:membershipId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { membershipId } = req.params;
      
      // Check if user is a manager
      const callerMembership = await storage.getFamilyMembershipByUserId(userId);
      if (!callerMembership || callerMembership.role !== 'manager') {
        return res.status(403).json({ message: "Only family managers can remove members" });
      }
      
      // Get the membership to remove
      const targetMembership = await storage.getFamilyMembership(membershipId);
      if (!targetMembership) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      // Check membership belongs to this family
      if (targetMembership.familyAccountId !== callerMembership.familyAccountId) {
        return res.status(403).json({ message: "Cannot remove members from other families" });
      }
      
      // Get family account to check if removing primary manager
      const familyAccount = await storage.getFamilyAccount(callerMembership.familyAccountId);
      if (familyAccount && targetMembership.userId === familyAccount.primaryManagerId) {
        return res.status(400).json({ 
          message: "Cannot remove the primary manager. Transfer ownership first.",
          code: "CANNOT_REMOVE_PRIMARY_MANAGER"
        });
      }
      
      // Downgrade user to free tier
      await storage.updateUserSubscription(targetMembership.userId, {
        subscriptionTier: 'free',
        subscriptionStatus: null,
      });
      
      // Remove membership
      await storage.deleteFamilyMembership(membershipId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing family member:", error);
      res.status(500).json({ message: "Failed to remove family member" });
    }
  });

  // Leave family (for non-primary managers)
  app.post('/api/family/leave', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const membership = await storage.getFamilyMembershipByUserId(userId);
      if (!membership) {
        return res.status(400).json({ message: "You are not a member of a family account" });
      }
      
      // Check if user is primary manager
      const familyAccount = await storage.getFamilyAccount(membership.familyAccountId);
      if (familyAccount && userId === familyAccount.primaryManagerId) {
        return res.status(400).json({ 
          message: "Primary managers cannot leave. Transfer ownership or delete the family account.",
          code: "CANNOT_LEAVE_AS_PRIMARY_MANAGER"
        });
      }
      
      // Downgrade to free tier
      await storage.updateUserSubscription(userId, {
        subscriptionTier: 'free',
        subscriptionStatus: null,
      });
      
      // Remove membership
      await storage.deleteFamilyMembership(membership.id);
      res.json({ success: true, message: "You have left the family account" });
    } catch (error) {
      console.error("Error leaving family:", error);
      res.status(500).json({ message: "Failed to leave family" });
    }
  });

  // Update member role (managers only)
  app.patch('/api/family/member/:membershipId/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { membershipId } = req.params;
      const { role } = req.body;
      
      if (!['manager', 'member'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      // Check if user is a manager
      const callerMembership = await storage.getFamilyMembershipByUserId(userId);
      if (!callerMembership || callerMembership.role !== 'manager') {
        return res.status(403).json({ message: "Only family managers can update roles" });
      }
      
      // Get target membership
      const targetMembership = await storage.getFamilyMembership(membershipId);
      if (!targetMembership) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      // Check membership belongs to this family
      if (targetMembership.familyAccountId !== callerMembership.familyAccountId) {
        return res.status(403).json({ message: "Cannot update members from other families" });
      }
      
      // Check max managers if promoting
      if (role === 'manager' && targetMembership.role !== 'manager') {
        const managerCount = await storage.countManagersInFamily(callerMembership.familyAccountId);
        if (managerCount >= 2) {
          return res.status(400).json({ 
            message: "Family accounts can have at most 2 managers",
            code: "MAX_MANAGERS_REACHED"
          });
        }
      }
      
      const updated = await storage.updateFamilyMembership(membershipId, { role });
      res.json(updated);
    } catch (error) {
      console.error("Error updating member role:", error);
      res.status(500).json({ message: "Failed to update member role" });
    }
  });

  // Get wardrobes accessible to this user (including family member wardrobes for managers)
  app.get('/api/family/accessible-wardrobes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const membership = await storage.getFamilyMembershipByUserId(userId);
      
      // If not a family member or not a manager, just return user's own wardrobes
      if (!membership || membership.role !== 'manager') {
        const wardrobes = await storage.getWardrobesByUserId(userId);
        return res.json(wardrobes.map(w => ({ ...w, ownerId: userId, isOwn: true })));
      }
      
      // Get all family members' wardrobes
      const familyMembers = await storage.getFamilyMembershipsByAccountId(membership.familyAccountId);
      const allWardrobes: any[] = [];
      
      for (const member of familyMembers) {
        const memberUser = await storage.getUser(member.userId);
        const wardrobes = await storage.getWardrobesByUserId(member.userId);
        for (const wardrobe of wardrobes) {
          allWardrobes.push({
            ...wardrobe,
            ownerId: member.userId,
            ownerName: memberUser ? `${memberUser.firstName || ''} ${memberUser.lastName || ''}`.trim() || memberUser.email : 'Unknown',
            isOwn: member.userId === userId,
          });
        }
      }
      
      res.json(allWardrobes);
    } catch (error) {
      console.error("Error fetching accessible wardrobes:", error);
      res.status(500).json({ message: "Failed to fetch accessible wardrobes" });
    }
  });

  // ===== PROFESSIONAL ACCOUNT MANAGEMENT =====
  
  // Get current user's professional status (shopper account, client relationship, or nothing)
  app.get('/api/professional/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Admin professional view mode override
      const adminProfessionalViewMode = user.isAdmin ? (user.adminProfessionalViewMode as 'shopper' | 'client' | null) : null;
      
      // If admin is previewing as client, simulate client experience
      if (user.isAdmin && adminProfessionalViewMode === 'client') {
        // Get professional account if user has one (for preview purposes)
        const professionalAccount = await storage.getProfessionalAccountByShopper(userId);
        return res.json({
          role: 'client',
          professionalAccount: professionalAccount ? {
            id: professionalAccount.id,
            businessName: professionalAccount.businessName,
            hourlyRate: professionalAccount.hourlyRate,
          } : {
            id: 'preview',
            businessName: 'Preview Professional Services',
            hourlyRate: 5000,
          },
          clientRelationship: {
            id: 'preview',
            budget: 100000,
            notes: null,
            joinedAt: new Date().toISOString(),
          },
          shopper: {
            firstName: 'Preview',
            lastName: 'Shopper',
            email: 'preview@example.com',
            profileImageUrl: null,
          },
        });
      }
      
      // Check if user is a professional shopper
      const professionalAccount = await storage.getProfessionalAccountByShopper(userId);
      
      if (professionalAccount) {
        // Get all clients
        const clients = await storage.getProfessionalClientsByAccountId(professionalAccount.id);
        const clientsWithDetails = await Promise.all(clients.map(async (c) => {
          const clientUser = await storage.getUser(c.userId);
          return {
            id: c.id,
            userId: c.userId,
            budget: c.budget,
            notes: c.notes,
            joinedAt: c.joinedAt,
            firstName: clientUser?.firstName,
            lastName: clientUser?.lastName,
            email: clientUser?.email,
            profileImageUrl: clientUser?.profileImageUrl,
          };
        }));
        
        // Get pending invites
        const invites = await storage.getProfessionalInvitesByAccountId(professionalAccount.id);
        const now = new Date();
        const pendingInvites = invites
          .filter(inv => !inv.acceptedAt && inv.expiresAt > now)
          .map(inv => ({
            id: inv.id,
            email: inv.email,
            wardrobeName: inv.wardrobeName,
            expiresAt: inv.expiresAt,
            createdAt: inv.createdAt,
          }));
        
        return res.json({
          role: 'shopper',
          professionalAccount: {
            id: professionalAccount.id,
            businessName: professionalAccount.businessName,
            hourlyRate: professionalAccount.hourlyRate,
          },
          clients: clientsWithDetails,
          pendingInvites,
        });
      }
      
      // Check if user is a client of a professional shopper
      const clientRelationship = await storage.getProfessionalClientByUserId(userId);
      
      if (clientRelationship) {
        const professionalAcc = await storage.getProfessionalAccount(clientRelationship.professionalAccountId);
        const shopperUser = professionalAcc ? await storage.getUser(professionalAcc.shopperId) : null;
        
        return res.json({
          role: 'client',
          professionalAccount: professionalAcc ? {
            id: professionalAcc.id,
            businessName: professionalAcc.businessName,
            hourlyRate: professionalAcc.hourlyRate,
          } : null,
          clientRelationship: {
            id: clientRelationship.id,
            budget: clientRelationship.budget,
            notes: clientRelationship.notes,
            joinedAt: clientRelationship.joinedAt,
          },
          shopper: shopperUser ? {
            firstName: shopperUser.firstName,
            lastName: shopperUser.lastName,
            email: shopperUser.email,
            profileImageUrl: shopperUser.profileImageUrl,
          } : null,
        });
      }
      
      // Check for pending invites
      const pendingInvites = user.email ? await storage.getPendingProfessionalInvitesByEmail(user.email) : [];
      
      return res.json({
        role: null,
        professionalAccount: null,
        clients: [],
        pendingInvites: pendingInvites.map(inv => ({
          id: inv.id,
          token: inv.token,
          wardrobeName: inv.wardrobeName,
          expiresAt: inv.expiresAt,
        })),
      });
    } catch (error) {
      console.error("Error fetching professional status:", error);
      res.status(500).json({ message: "Failed to fetch professional status" });
    }
  });

  // Create or update professional account (shoppers only)
  const professionalAccountSchema = z.object({
    businessName: z.string().min(1, "Business name is required"),
    hourlyRate: z.number().min(0).optional(),
  });

  app.post('/api/professional/account', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const validation = professionalAccountSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }
      
      const { businessName, hourlyRate } = validation.data;
      
      // Check if already has an account
      let account = await storage.getProfessionalAccountByShopper(userId);
      
      if (account) {
        // Update existing account
        account = await storage.updateProfessionalAccount(account.id, {
          businessName,
          hourlyRate: hourlyRate ?? null,
        });
      } else {
        // Create new account
        account = await storage.createProfessionalAccount({
          businessName,
          shopperId: userId,
          hourlyRate: hourlyRate ?? null,
        });
      }
      
      res.json(account);
    } catch (error) {
      console.error("Error creating/updating professional account:", error);
      res.status(500).json({ message: "Failed to save professional account" });
    }
  });

  // Update hourly rate
  app.patch('/api/professional/rate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { hourlyRate } = req.body;
      
      const account = await storage.getProfessionalAccountByShopper(userId);
      if (!account) {
        return res.status(404).json({ message: "Professional account not found" });
      }
      
      const updated = await storage.updateProfessionalAccount(account.id, { hourlyRate });
      res.json(updated);
    } catch (error) {
      console.error("Error updating hourly rate:", error);
      res.status(500).json({ message: "Failed to update hourly rate" });
    }
  });

  // Invite a client
  const professionalInviteSchema = z.object({
    email: z.string().email("Valid email is required"),
  });

  app.post('/api/professional/invite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const validation = professionalInviteSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }
      
      const { email } = validation.data;
      
      // Check if user has a professional account
      const account = await storage.getProfessionalAccountByShopper(userId);
      if (!account) {
        return res.status(403).json({ message: "You need a professional account to invite clients" });
      }
      
      // Generate invite token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      const invite = await storage.createProfessionalInvite({
        professionalAccountId: account.id,
        invitedByUserId: userId,
        email,
        token,
        expiresAt,
      });
      
      res.json(invite);
    } catch (error) {
      console.error("Error creating professional invite:", error);
      res.status(500).json({ message: "Failed to create invite" });
    }
  });

  // Get professional invite details (public, for invite accept page)
  app.get('/api/professional/invite/:token', async (req, res) => {
    try {
      const { token } = req.params;
      
      const invite = await storage.getProfessionalInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      if (invite.acceptedAt) {
        return res.status(400).json({ message: "This invite has already been used", code: "ALREADY_USED" });
      }
      
      if (invite.expiresAt < new Date()) {
        return res.status(400).json({ message: "This invite has expired", code: "EXPIRED" });
      }
      
      // Get professional account and shopper info
      const professionalAccount = await storage.getProfessionalAccount(invite.professionalAccountId);
      if (!professionalAccount) {
        return res.status(404).json({ message: "Professional account not found" });
      }
      
      const shopper = await storage.getUser(professionalAccount.shopperId);
      
      res.json({
        businessName: professionalAccount.businessName,
        shopperName: shopper?.firstName && shopper?.lastName 
          ? `${shopper.firstName} ${shopper.lastName}` 
          : null,
        expiresAt: invite.expiresAt,
      });
    } catch (error) {
      console.error("Error fetching invite:", error);
      res.status(500).json({ message: "Failed to fetch invite" });
    }
  });

  // Accept professional invite
  app.post('/api/professional/invite/:token/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { token } = req.params;
      
      const invite = await storage.getProfessionalInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      if (invite.acceptedAt) {
        return res.status(400).json({ message: "This invite has already been used" });
      }
      
      if (invite.expiresAt < new Date()) {
        return res.status(400).json({ message: "This invite has expired" });
      }
      
      // Check if already a client
      const existingClient = await storage.getProfessionalClientByUserId(userId);
      if (existingClient) {
        return res.status(400).json({ message: "You are already a client of a professional shopper" });
      }
      
      // Create client relationship (wardrobes will be created by the professional shopper)
      const client = await storage.createProfessionalClient({
        professionalAccountId: invite.professionalAccountId,
        userId,
      });
      
      // Mark invite as accepted
      await storage.updateProfessionalInvite(invite.id, { acceptedAt: new Date() });
      
      res.json({ message: "Successfully joined as client", client });
    } catch (error) {
      console.error("Error accepting professional invite:", error);
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });

  // Delete professional invite
  app.delete('/api/professional/invite/:inviteId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { inviteId } = req.params;
      
      const account = await storage.getProfessionalAccountByShopper(userId);
      if (!account) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const invite = await storage.getProfessionalInvite(inviteId);
      if (!invite || invite.professionalAccountId !== account.id) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      await storage.deleteProfessionalInvite(inviteId);
      res.json({ message: "Invite deleted" });
    } catch (error) {
      console.error("Error deleting professional invite:", error);
      res.status(500).json({ message: "Failed to delete invite" });
    }
  });

  // Remove client
  app.delete('/api/professional/client/:clientId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { clientId } = req.params;
      
      const account = await storage.getProfessionalAccountByShopper(userId);
      if (!account) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const client = await storage.getProfessionalClient(clientId);
      if (!client || client.professionalAccountId !== account.id) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      await storage.deleteProfessionalClient(clientId);
      res.json({ message: "Client removed" });
    } catch (error) {
      console.error("Error removing client:", error);
      res.status(500).json({ message: "Failed to remove client" });
    }
  });

  // Update client budget (by client)
  app.patch('/api/professional/budget', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { budget } = req.body;
      
      const client = await storage.getProfessionalClientByUserId(userId);
      if (!client) {
        return res.status(404).json({ message: "Client relationship not found" });
      }
      
      const updated = await storage.updateProfessionalClient(client.id, { budget });
      res.json(updated);
    } catch (error) {
      console.error("Error updating budget:", error);
      res.status(500).json({ message: "Failed to update budget" });
    }
  });

  // Leave professional shopper plan (by client)
  app.post('/api/professional/leave', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const client = await storage.getProfessionalClientByUserId(userId);
      if (!client) {
        return res.status(404).json({ message: "Client relationship not found" });
      }
      
      // Check for unpaid invoices
      const invoices = await storage.getInvoicesByClientId(client.id);
      const hasUnpaid = invoices.some(inv => inv.status === 'sent' || inv.status === 'draft');
      
      if (hasUnpaid) {
        return res.status(400).json({ message: "Please pay all outstanding invoices before leaving" });
      }
      
      // Delete the client relationship
      await storage.deleteProfessionalClient(client.id);
      
      res.json({ success: true, message: "Successfully left the professional shopper plan" });
    } catch (error) {
      console.error("Error leaving professional shopper:", error);
      res.status(500).json({ message: "Failed to leave professional shopper plan" });
    }
  });

  // Get wardrobes accessible to professional shopper (all client wardrobes)
  app.get('/api/professional/accessible-wardrobes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const account = await storage.getProfessionalAccountByShopper(userId);
      
      if (!account) {
        // Not a shopper, return own wardrobes
        const wardrobes = await storage.getWardrobesByUserId(userId);
        return res.json(wardrobes.filter(w => !w.professionalClientId).map(w => ({ ...w, ownerId: userId, isOwn: true })));
      }
      
      // Get all clients' wardrobes
      const clients = await storage.getProfessionalClientsByAccountId(account.id);
      const allWardrobes: any[] = [];
      
      // Add shopper's own wardrobes (excluding client wardrobes)
      const ownWardrobes = await storage.getWardrobesByUserId(userId);
      for (const wardrobe of ownWardrobes.filter(w => !w.professionalClientId)) {
        allWardrobes.push({
          ...wardrobe,
          ownerId: userId,
          ownerName: 'You',
          isOwn: true,
        });
      }
      
      // Add client wardrobes (using professionalClientId)
      for (const client of clients) {
        const clientUser = await storage.getUser(client.userId);
        const wardrobes = await storage.getWardrobesByProfessionalClientId(client.id);
        for (const wardrobe of wardrobes) {
          allWardrobes.push({
            ...wardrobe,
            ownerId: client.userId,
            clientId: client.id,
            ownerName: clientUser ? `${clientUser.firstName || ''} ${clientUser.lastName || ''}`.trim() || clientUser.email : 'Unknown',
            isOwn: false,
          });
        }
      }
      
      res.json(allWardrobes);
    } catch (error) {
      console.error("Error fetching accessible wardrobes:", error);
      res.status(500).json({ message: "Failed to fetch accessible wardrobes" });
    }
  });

  // Get wardrobes for a specific client
  app.get('/api/professional/clients/:clientId/wardrobes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { clientId } = req.params;
      
      const account = await storage.getProfessionalAccountByShopper(userId);
      if (!account) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const client = await storage.getProfessionalClient(clientId);
      if (!client || client.professionalAccountId !== account.id) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const wardrobes = await storage.getWardrobesByProfessionalClientId(clientId);
      
      // Add capsule counts
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
      console.error("Error fetching client wardrobes:", error);
      res.status(500).json({ message: "Failed to fetch client wardrobes" });
    }
  });

  // ===== RECEIPTS =====
  
  // Create receipt
  app.post('/api/professional/receipts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { clientId, description, amount, imageUrl, purchaseDate } = req.body;
      
      const account = await storage.getProfessionalAccountByShopper(userId);
      if (!account) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const client = await storage.getProfessionalClient(clientId);
      if (!client || client.professionalAccountId !== account.id) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const receipt = await storage.createReceipt({
        professionalAccountId: account.id,
        clientId,
        description,
        amount,
        imageUrl,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      });
      
      res.json(receipt);
    } catch (error) {
      console.error("Error creating receipt:", error);
      res.status(500).json({ message: "Failed to create receipt" });
    }
  });

  // Get receipts (for shopper - all; for client - their own)
  app.get('/api/professional/receipts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { clientId } = req.query;
      
      const account = await storage.getProfessionalAccountByShopper(userId);
      
      if (account) {
        // Shopper can see receipts for specific client or all
        const receipts = clientId 
          ? await storage.getReceiptsByClientId(clientId as string)
          : await storage.getReceiptsByAccountId(account.id);
        return res.json(receipts);
      }
      
      // Client can only see their own receipts
      const client = await storage.getProfessionalClientByUserId(userId);
      if (client) {
        const receipts = await storage.getReceiptsByClientId(client.id);
        return res.json(receipts);
      }
      
      return res.json([]);
    } catch (error) {
      console.error("Error fetching receipts:", error);
      res.status(500).json({ message: "Failed to fetch receipts" });
    }
  });

  // Delete receipt
  app.delete('/api/professional/receipts/:receiptId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { receiptId } = req.params;
      
      const account = await storage.getProfessionalAccountByShopper(userId);
      if (!account) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const receipt = await storage.getReceipt(receiptId);
      if (!receipt || receipt.professionalAccountId !== account.id) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      
      await storage.deleteReceipt(receiptId);
      res.json({ message: "Receipt deleted" });
    } catch (error) {
      console.error("Error deleting receipt:", error);
      res.status(500).json({ message: "Failed to delete receipt" });
    }
  });

  // ===== INVOICES =====
  
  // Create invoice
  app.post('/api/professional/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { clientId, description, hoursWorked, hourlyRate, serviceAmount, merchandiseAmount, dueDate } = req.body;
      
      const account = await storage.getProfessionalAccountByShopper(userId);
      if (!account) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const client = await storage.getProfessionalClient(clientId);
      if (!client || client.professionalAccountId !== account.id) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const invoiceNumber = await storage.getNextInvoiceNumber(account.id);
      const calculatedServiceAmount = serviceAmount ?? (hoursWorked && hourlyRate ? hoursWorked * hourlyRate : 0);
      const totalAmount = calculatedServiceAmount + (merchandiseAmount || 0);
      
      const invoice = await storage.createInvoice({
        professionalAccountId: account.id,
        clientId,
        invoiceNumber,
        description,
        hoursWorked,
        hourlyRate: hourlyRate ?? account.hourlyRate,
        serviceAmount: calculatedServiceAmount,
        merchandiseAmount: merchandiseAmount || 0,
        totalAmount,
        status: 'draft',
        dueDate: dueDate ? new Date(dueDate) : null,
      });
      
      res.json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // Get invoices (for shopper - all; for client - their own)
  app.get('/api/professional/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { clientId } = req.query;
      
      const account = await storage.getProfessionalAccountByShopper(userId);
      
      if (account) {
        // Shopper can see invoices for specific client or all
        const invoices = clientId 
          ? await storage.getInvoicesByClientId(clientId as string)
          : await storage.getInvoicesByAccountId(account.id);
        return res.json(invoices);
      }
      
      // Client can only see their own invoices
      const client = await storage.getProfessionalClientByUserId(userId);
      if (client) {
        const invoices = await storage.getInvoicesByClientId(client.id);
        return res.json(invoices);
      }
      
      return res.json([]);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Update invoice status
  app.patch('/api/professional/invoices/:invoiceId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { invoiceId } = req.params;
      const { status } = req.body;
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const account = await storage.getProfessionalAccountByShopper(userId);
      const client = await storage.getProfessionalClientByUserId(userId);
      
      // Shopper can change status to sent/cancelled
      if (account && invoice.professionalAccountId === account.id) {
        if (!['sent', 'cancelled'].includes(status)) {
          return res.status(400).json({ message: "Shoppers can only send or cancel invoices" });
        }
        const updated = await storage.updateInvoice(invoiceId, { 
          status,
          paidAt: null,
        });
        return res.json(updated);
      }
      
      // Client can mark as paid
      if (client && invoice.clientId === client.id) {
        if (status !== 'paid') {
          return res.status(400).json({ message: "Clients can only mark invoices as paid" });
        }
        const updated = await storage.updateInvoice(invoiceId, { 
          status: 'paid',
          paidAt: new Date(),
        });
        return res.json(updated);
      }
      
      return res.status(403).json({ message: "Not authorized" });
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // Delete invoice (only draft invoices)
  app.delete('/api/professional/invoices/:invoiceId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { invoiceId } = req.params;
      
      const account = await storage.getProfessionalAccountByShopper(userId);
      if (!account) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice || invoice.professionalAccountId !== account.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      if (invoice.status !== 'draft') {
        return res.status(400).json({ message: "Can only delete draft invoices" });
      }
      
      await storage.deleteInvoice(invoiceId);
      res.json({ message: "Invoice deleted" });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
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
