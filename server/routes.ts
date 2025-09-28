import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertScanHistorySchema, insertChatMessageSchema } from "@shared/schema";
import { analyzeIngredients, chatWithAI } from "./services/openai";
import { getBarcodeData, parseIngredientsText } from "./services/foodApi";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data", error: error.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const updates = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid update data", error: error.message });
    }
  });

  // Barcode scanning
  app.post("/api/scan/barcode", async (req, res) => {
    try {
      const { barcode, userId } = req.body;
      
      if (!barcode || !userId) {
        return res.status(400).json({ message: "Barcode and userId are required" });
      }

      // Get product data from barcode
      const productData = await getBarcodeData(barcode);
      
      // Get user profile for analysis
      const user = await storage.getUser(userId);
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
        userId,
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
      res.status(500).json({ message: "Failed to process barcode scan", error: error.message });
    }
  });

  // Manual ingredient analysis
  app.post("/api/scan/manual", async (req, res) => {
    try {
      const { ingredients, productName, userId } = req.body;
      
      if (!ingredients || !userId) {
        return res.status(400).json({ message: "Ingredients and userId are required" });
      }

      // Parse ingredients
      const parsedIngredients = typeof ingredients === 'string' 
        ? parseIngredientsText(ingredients)
        : ingredients;

      // Get user profile for analysis
      const user = await storage.getUser(userId);
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
        userId,
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
      res.status(500).json({ message: "Failed to analyze ingredients", error: error.message });
    }
  });

  // Scan history
  app.get("/api/scans/:userId", async (req, res) => {
    try {
      const scans = await storage.getScanHistory(req.params.userId);
      res.json(scans);
    } catch (error) {
      res.status(500).json({ message: "Failed to get scan history" });
    }
  });

  app.get("/api/scans/detail/:scanId", async (req, res) => {
    try {
      const scan = await storage.getScanById(req.params.scanId);
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      res.json(scan);
    } catch (error) {
      res.status(500).json({ message: "Failed to get scan details" });
    }
  });

  // AI Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, userId } = req.body;
      
      if (!message || !userId) {
        return res.status(400).json({ message: "Message and userId are required" });
      }

      const response = await chatWithAI(message, userId);
      
      // Save chat to history
      const chatData = {
        userId,
        message,
        response
      };

      await storage.createChatMessage(chatData);
      
      res.json({ response });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ message: "Failed to process chat message", error: error.message });
    }
  });

  app.get("/api/chat/:userId", async (req, res) => {
    try {
      const chatHistory = await storage.getChatHistory(req.params.userId);
      res.json(chatHistory);
    } catch (error) {
      res.status(500).json({ message: "Failed to get chat history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
