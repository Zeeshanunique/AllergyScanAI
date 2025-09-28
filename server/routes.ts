import "./env"; // Load environment variables first

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./database";
import { registerSchema, loginSchema, updateProfileSchema } from "@shared/schema";
import { analyzeIngredients, chatWithAI } from "./services/openai";
import { getBarcodeData, parseIngredientsText } from "./services/foodApi";
import { AuthService } from "./services/auth";
import { requireAuth, optionalAuth, guestOnly, createSession, destroySession } from "./middleware/auth";
import { authRateLimit, apiRateLimit, scanRateLimit } from "./middleware/security";

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply API rate limiting to all API routes
  app.use('/api', apiRateLimit);

  // Authentication routes with stricter rate limiting
  app.post("/api/auth/register", authRateLimit, guestOnly, async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const result = await AuthService.register(data);

      // Create token for development-only auth
      const token = createSession(result.user);

      res.status(201).json({
        ...result,
        token
      });
    } catch (error) {
      res.status(400).json({
        message: error instanceof Error ? error.message : "Registration failed"
      });
    }
  });

  app.post("/api/auth/login", authRateLimit, guestOnly, async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const result = await AuthService.login(data);

      // Create token for development-only auth
      const token = createSession(result.user);

      res.json({
        ...result,
        token
      });
    } catch (error) {
      res.status(401).json({
        message: error instanceof Error ? error.message : "Login failed"
      });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        destroySession(token);
      }
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await AuthService.getCurrentUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user data" });
    }
  });

  // User profile routes
  app.get("/api/users/:id", requireAuth, async (req, res) => {
    try {
      // Only allow users to access their own profile
      if (req.params.id !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.put("/api/users/:id", requireAuth, async (req, res) => {
    try {
      // Only allow users to update their own profile
      if (req.params.id !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updates = updateProfileSchema.parse(req.body);
      const user = await storage.updateUser(req.params.id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = user;

      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Invalid update data", error: error instanceof Error ? error.message : String(error) });
    }
  });


  // Barcode scanning with scan rate limiting
  app.post("/api/scan/barcode", scanRateLimit, requireAuth, async (req, res) => {
    try {
      const { barcode } = req.body;

      if (!barcode) {
        return res.status(400).json({ message: "Barcode is required" });
      }

      // Get product data from barcode
      const productData = await getBarcodeData(barcode);

      // Get user profile for analysis
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Analyze ingredients
      const analysisResult = await analyzeIngredients(
        productData.ingredients,
        user.allergies || [],
        user.medications || []
      );

      // Save scan to history
      const scanData = {
        userId: req.userId!,
        productName: productData.productName,
        barcode,
        ingredients: productData.ingredients,
        analysisResult
      };

      const scan = await storage.createScanHistory(scanData);
      
      res.json({
        scan,
        productData,
        analysisResult
      });
    } catch (error) {
      console.error('Barcode scan error:', error);
      res.status(500).json({ message: "Failed to process barcode scan", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Manual ingredient analysis with scan rate limiting
  app.post("/api/scan/manual", scanRateLimit, requireAuth, async (req, res) => {
    try {
      const { ingredients, productName } = req.body;

      if (!ingredients) {
        return res.status(400).json({ message: "Ingredients are required" });
      }

      // Parse ingredients
      const parsedIngredients = typeof ingredients === 'string'
        ? parseIngredientsText(ingredients)
        : ingredients;

      // Get user profile for analysis
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Analyze ingredients
      const analysisResult = await analyzeIngredients(
        parsedIngredients,
        user.allergies || [],
        user.medications || []
      );

      // Save scan to history
      const scanData = {
        userId: req.userId!,
        productName: productName || "Manual Entry",
        ingredients: parsedIngredients,
        analysisResult
      };

      const scan = await storage.createScanHistory(scanData);
      
      res.json({
        scan,
        analysisResult
      });
    } catch (error) {
      console.error('Manual scan error:', error);
      res.status(500).json({ message: "Failed to analyze ingredients", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Scan history
  app.get("/api/scans", requireAuth, async (req, res) => {
    try {
      const scans = await storage.getScanHistory(req.userId!);
      res.json(scans);
    } catch (error) {
      res.status(500).json({ message: "Failed to get scan history" });
    }
  });

  app.get("/api/scans/detail/:scanId", requireAuth, async (req, res) => {
    try {
      const scan = await storage.getScanById(req.params.scanId);
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }

      // Only allow users to access their own scans
      if (scan.userId !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(scan);
    } catch (error) {
      res.status(500).json({ message: "Failed to get scan details" });
    }
  });

  // AI Chat
  app.post("/api/chat", requireAuth, async (req, res) => {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const response = await chatWithAI(message, req.userId!);

      // Save chat to history
      const chatData = {
        userId: req.userId!,
        message,
        response
      };

      await storage.createChatMessage(chatData);
      
      res.json({ response });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ message: "Failed to process chat message", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/chat", requireAuth, async (req, res) => {
    try {
      const chatHistory = await storage.getChatHistory(req.userId!);
      res.json(chatHistory);
    } catch (error) {
      res.status(500).json({ message: "Failed to get chat history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
