import "./env"; // Load environment variables first

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, db } from "./database";
import { registerSchema, loginSchema, updateProfileSchema, consultationBookingSchema } from "@shared/schema";
import { analyzeIngredients, chatWithAI, extractBarcodeFromImage } from "./services/gemini";
import { getBarcodeData, parseIngredientsText } from "./services/foodApi";
import { 
  initializeMLTrainingService, 
  trainMLModelFromDatabase, 
  validateMLModelFromDatabase, 
  getMLModelMetricsFromDatabase 
} from "./services/mlTrainingService";
import { AuthService } from "./services/auth";
import { requireAuth, optionalAuth, guestOnly, createSession, destroySession } from "./middleware/auth";
import { authRateLimit, apiRateLimit, scanRateLimit, heavyOperationsRateLimit } from "./middleware/security";

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


  // Barcode scanning with combined rate limiting
  app.post("/api/scan/barcode", scanRateLimit, heavyOperationsRateLimit, requireAuth, async (req, res) => {
    try {
      const { barcode } = req.body;

      if (!barcode) {
        return res.status(400).json({ message: "Barcode is required" });
      }

      let productData;

      // Get product data from Barcode Lookup API
      try {
        const externalData = await getBarcodeData(barcode);
        productData = {
          ...externalData,
          barcode,
          source: "barcode_lookup_api"
        };
        console.log(`Retrieved product data from Barcode Lookup API for barcode ${barcode}:`, {
          productName: productData.productName,
          brand: productData.brand,
          category: productData.category,
          ingredientCount: productData.ingredients?.length || 0
        });
      } catch (apiError) {
        console.error(`Failed to get data for barcode ${barcode} from Barcode Lookup API:`, apiError);
        
        // Provide specific error messages based on error type
        let errorMessage = "Product not found";
        let suggestion = "Ensure the barcode is valid and exists in the Barcode Lookup database";
        
        if (apiError instanceof Error) {
          if (apiError.message.includes('Invalid barcode format')) {
            errorMessage = "Invalid barcode format";
            suggestion = "Please scan a valid product barcode (UPC, EAN, ISBN, etc.). QR codes with URLs are not supported.";
          } else if (apiError.message.includes('API request failed')) {
            errorMessage = "API request failed";
            suggestion = "There was an issue connecting to the barcode database. Please try again.";
          } else if (apiError.message.includes('Product not found')) {
            errorMessage = "Product not found";
            suggestion = "This barcode is not in our database. Try scanning a different product.";
          }
        }
        
        return res.status(404).json({
          message: errorMessage,
          barcode,
          error: apiError instanceof Error ? apiError.message : String(apiError),
          suggestion
        });
      }

      // Get user profile for analysis
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Analyze ingredients
      const analysisResult = await analyzeIngredients(
        {
          productName: productData.productName,
          brand: productData.brand,
          ingredients: productData.ingredients,
          category: productData.category,
          description: productData.description,
          allergens: productData.allergens
        },
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

  // Manual ingredient analysis with combined rate limiting
  app.post("/api/scan/manual", scanRateLimit, heavyOperationsRateLimit, requireAuth, async (req, res) => {
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
        {
          productName: productName || "Manual Entry",
          brand: undefined,
          ingredients: parsedIngredients,
          category: undefined,
          description: undefined,
          allergens: undefined
        },
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

  // Image-based barcode scanning using Gemini Vision API (no auth required)
  app.post("/api/scan-barcode-image", scanRateLimit, heavyOperationsRateLimit, async (req, res) => {
    try {
      const { imageData } = req.body;

      if (!imageData) {
        return res.status(400).json({ message: "Image data is required" });
      }

      console.log('Processing image for barcode extraction with Gemini Vision...');

      // Use Gemini Vision API to extract barcode from image
      const barcode = await extractBarcodeFromImage(imageData);

      if (barcode) {
        console.log('🎉 Barcode extracted from image:', barcode);
        res.json({ barcode });
      } else {
        console.log('No barcode found in image');
        res.status(404).json({ 
          message: "No barcode detected in the image",
          suggestion: "Please ensure the barcode numbers are clearly visible and try again"
        });
      }
    } catch (error) {
      console.error('Image barcode scan error:', error);
      res.status(500).json({ 
        message: "Failed to process image", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Database statistics endpoint (for monitoring)
  app.get("/api/admin/db-stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDatabaseStats();
      res.json({
        ...stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Database stats error:', error);
      res.status(500).json({ message: "Failed to get database statistics" });
    }
  });

  // Scan history with pagination support
  app.get("/api/scans", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || undefined;
      const offset = parseInt(req.query.offset as string) || undefined;

      let scans;
      if (limit !== undefined && offset !== undefined) {
        scans = await storage.getScanHistoryPaginated(req.userId!, limit, offset);
      } else if (limit !== undefined) {
        scans = await storage.getRecentScans(req.userId!, limit);
      } else {
        scans = await storage.getScanHistory(req.userId!);
      }

      // Include total count for pagination
      const totalCount = await storage.getScanCount(req.userId!);

      res.json({
        scans,
        totalCount,
        hasMore: offset !== undefined ? (offset + (limit || 0)) < totalCount : false
      });
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

      // Get user context for personalization
      const user = await storage.getUser(req.userId!);
      const recentScans = await storage.getRecentScans(req.userId!, 3); // Get last 3 scans

      const userContext = user ? {
        firstName: user.firstName || undefined,
        allergies: user.allergies || [],
        medications: user.medications || [],
        recentScans: recentScans.map(scan => ({
          productName: scan.productName || undefined,
          ingredients: scan.ingredients,
          analysisResult: scan.analysisResult,
          scannedAt: scan.scannedAt || new Date()
        }))
      } : undefined;

      const response = await chatWithAI(message, req.userId!, userContext);

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
      const limit = parseInt(req.query.limit as string) || undefined;
      const offset = parseInt(req.query.offset as string) || undefined;

      let chatHistory;
      if (limit !== undefined && offset !== undefined) {
        chatHistory = await storage.getChatHistoryPaginated(req.userId!, limit, offset);
      } else if (limit !== undefined) {
        chatHistory = await storage.getRecentChatMessages(req.userId!, limit);
      } else {
        chatHistory = await storage.getChatHistory(req.userId!);
      }

      // Include total count for pagination
      const totalCount = await storage.getChatCount(req.userId!);

      res.json({
        chatHistory,
        totalCount,
        hasMore: offset !== undefined ? (offset + (limit || 0)) < totalCount : false
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get chat history" });
    }
  });

  // Consultation booking and history endpoints
  app.post("/api/consultations", requireAuth, async (req, res) => {
    try {
      const bookingData = consultationBookingSchema.parse(req.body);

      // Create consultation record
      const consultationData = {
        userId: req.userId!,
        doctorId: bookingData.doctorId,
        doctorName: req.body.doctorName || "Unknown Doctor",
        doctorSpecialty: req.body.doctorSpecialty || "General Medicine",
        appointmentDate: new Date(bookingData.appointmentDate),
        appointmentTime: bookingData.appointmentTime,
        consultationType: bookingData.consultationType,
        scanResultId: bookingData.scanResultId,
        reason: bookingData.reason,
        status: 'scheduled' as const,
        consultationFee: req.body.consultationFee || 0,
        notes: null,
        prescription: null
      };

      const consultation = await storage.createConsultation(consultationData);

      res.status(201).json({
        consultation,
        message: "Consultation booked successfully"
      });
    } catch (error) {
      console.error('Consultation booking error:', error);
      res.status(400).json({
        message: "Failed to book consultation",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/consultations", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || undefined;
      const offset = parseInt(req.query.offset as string) || undefined;
      const status = req.query.status as string;

      let consultations;
      if (status) {
        consultations = await storage.getConsultationsByStatus(req.userId!, status);
      } else if (limit !== undefined && offset !== undefined) {
        consultations = await storage.getConsultationHistoryPaginated(req.userId!, limit, offset);
      } else if (limit !== undefined) {
        consultations = await storage.getRecentConsultations(req.userId!, limit);
      } else {
        consultations = await storage.getConsultationHistory(req.userId!);
      }

      // Include total count for pagination
      const totalCount = await storage.getConsultationCount(req.userId!);

      res.json({
        consultations,
        totalCount,
        hasMore: offset !== undefined ? (offset + (limit || 0)) < totalCount : false
      });
    } catch (error) {
      console.error('Get consultations error:', error);
      res.status(500).json({ message: "Failed to get consultation history" });
    }
  });

  app.get("/api/consultations/upcoming", requireAuth, async (req, res) => {
    try {
      const upcomingConsultations = await storage.getUpcomingConsultations(req.userId!);
      res.json({ consultations: upcomingConsultations });
    } catch (error) {
      console.error('Get upcoming consultations error:', error);
      res.status(500).json({ message: "Failed to get upcoming consultations" });
    }
  });

  app.get("/api/consultations/:consultationId", requireAuth, async (req, res) => {
    try {
      const consultation = await storage.getConsultationById(req.params.consultationId);
      if (!consultation) {
        return res.status(404).json({ message: "Consultation not found" });
      }

      // Only allow users to access their own consultations
      if (consultation.userId !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(consultation);
    } catch (error) {
      console.error('Get consultation details error:', error);
      res.status(500).json({ message: "Failed to get consultation details" });
    }
  });

  app.put("/api/consultations/:consultationId/status", requireAuth, async (req, res) => {
    try {
      const { status } = req.body;

      if (!['scheduled', 'completed', 'cancelled', 'no-show'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const consultation = await storage.getConsultationById(req.params.consultationId);
      if (!consultation) {
        return res.status(404).json({ message: "Consultation not found" });
      }

      // Only allow users to update their own consultations
      if (consultation.userId !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedConsultation = await storage.updateConsultationStatus(req.params.consultationId, status);
      res.json(updatedConsultation);
    } catch (error) {
      console.error('Update consultation status error:', error);
      res.status(500).json({ message: "Failed to update consultation status" });
    }
  });

  app.put("/api/consultations/:consultationId/notes", requireAuth, async (req, res) => {
    try {
      const { notes, prescription } = req.body;

      const consultation = await storage.getConsultationById(req.params.consultationId);
      if (!consultation) {
        return res.status(404).json({ message: "Consultation not found" });
      }

      // Only allow users to update their own consultations
      if (consultation.userId !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedConsultation = await storage.updateConsultationNotes(
        req.params.consultationId,
        notes || "",
        prescription
      );
      res.json(updatedConsultation);
    } catch (error) {
      console.error('Update consultation notes error:', error);
      res.status(500).json({ message: "Failed to update consultation notes" });
    }
  });

  // ML Training and Management Routes
  app.get("/api/ml/status", requireAuth, async (req, res) => {
    try {
      const metrics = await getMLModelMetricsFromDatabase(db);
      res.json(metrics);
    } catch (error) {
      console.error('ML status error:', error);
      res.status(500).json({ message: "Failed to get ML model status" });
    }
  });

  app.post("/api/ml/train", requireAuth, heavyOperationsRateLimit, async (req, res) => {
    try {
      console.log('🎯 Starting ML model training...');
      const result = await trainMLModelFromDatabase(db);
      res.json(result);
    } catch (error) {
      console.error('ML training error:', error);
      res.status(500).json({ 
        message: "Failed to train ML model", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.post("/api/ml/validate", requireAuth, async (req, res) => {
    try {
      console.log('🧪 Validating ML model...');
      const result = await validateMLModelFromDatabase(db);
      res.json(result);
    } catch (error) {
      console.error('ML validation error:', error);
      res.status(500).json({ 
        message: "Failed to validate ML model", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.post("/api/ml/retrain", requireAuth, heavyOperationsRateLimit, async (req, res) => {
    try {
      console.log('🔄 Retraining ML model...');
      const result = await trainMLModelFromDatabase(db);
      res.json(result);
    } catch (error) {
      console.error('ML retraining error:', error);
      res.status(500).json({ 
        message: "Failed to retrain ML model", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
