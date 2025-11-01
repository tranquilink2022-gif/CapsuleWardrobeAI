import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertCapsuleSchema, insertItemSchema, insertShoppingListSchema, updateUserSchema } from "@shared/schema";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import OpenAI from "openai";

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
      const allowedFields = ['name', 'season', 'climate', 'useCase', 'style', 'capsuleType', 'totalSlots'];
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
        season: capsule.season,
        climate: capsule.climate,
        useCase: capsule.useCase,
        style: capsule.style,
        capsuleType: capsule.capsuleType,
        totalSlots: capsule.totalSlots,
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

      const exportData = {
        capsule,
        items,
        exportedAt: new Date().toISOString(),
      };

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
      res.json(lists);
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

      const exportData = {
        shoppingList: list,
        items,
        exportedAt: new Date().toISOString(),
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="shopping-list-${list.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting shopping list:", error);
      res.status(500).json({ message: "Failed to export shopping list" });
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
      const { season, climate, useCase, style } = req.body;
      
      // Generate recommendations based on user inputs
      const recommendations = {
        fabrics: getFabricRecommendations(season, climate),
        colors: getColorRecommendations(season, style),
        structure: getStructureRecommendation(useCase)
      };
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
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

function getColorRecommendations(season: string, style: string): string[] {
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
  
  return colorMap[`${season}-${style}`] || ['Navy', 'White', 'Black', 'Gray', 'Beige'];
}

function getStructureRecommendation(useCase: string) {
  if (useCase === 'Travel') {
    return {
      type: 'Travel Capsule',
      total: 20,
      breakdown: [
        { category: 'Tops', count: 6 },
        { category: 'Bottoms', count: 4 },
        { category: 'Outerwear', count: 2 },
        { category: 'Shoes', count: 3 },
        { category: 'Accessories', count: 3 },
        { category: 'Miscellaneous', count: 2 },
      ],
    };
  }
  
  return {
    type: 'Seasonal Capsule',
    total: 30,
    breakdown: [
      { category: 'Tops', count: 10 },
      { category: 'Bottoms', count: 6 },
      { category: 'Outerwear', count: 4 },
      { category: 'Shoes', count: 4 },
      { category: 'Accessories', count: 4 },
      { category: 'Miscellaneous', count: 2 },
    ],
  };
}
