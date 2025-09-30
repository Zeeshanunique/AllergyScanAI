import "./env"; // Load environment variables first

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./database";
import { registerSchema, loginSchema, updateProfileSchema, consultationBookingSchema } from "@shared/schema";
import { analyzeIngredients, chatWithAI } from "./services/gemini";
import { getBarcodeData, parseIngredientsText } from "./services/foodApi";
import { sampleProducts } from "./seedData";
import { processBarcodeScanAsync, processManualScanAsync, getJobResult, getQueueStats } from "./services/asyncProcessor";
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

      // Check if it's one of our sample products (101-120)
      const sampleProduct = sampleProducts.find(p => p.barcode === barcode);

      if (sampleProduct) {
        // Use sample product data
        productData = {
          productName: sampleProduct.productName,
          ingredients: sampleProduct.ingredients,
          barcode: sampleProduct.barcode,
          source: "sample_database"
        };
        console.log(`Using sample product data for barcode ${barcode}:`, productData);
      } else {
        // Try to get product data from external API
        try {
          const externalData = await getBarcodeData(barcode);
          productData = {
            ...externalData,
            source: "external_api"
          };
        } catch (apiError) {
          console.error(`Failed to get data for barcode ${barcode} from external API:`, apiError);
          return res.status(404).json({
            message: "Product not found",
            barcode,
            suggestion: "Try using barcodes 101-120 for demo products"
          });
        }
      }

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

  // Async barcode scanning - returns immediately with job ID
  app.post("/api/scan/barcode/async", scanRateLimit, heavyOperationsRateLimit, requireAuth, async (req, res) => {
    try {
      const { barcode } = req.body;

      if (!barcode) {
        return res.status(400).json({ message: "Barcode is required" });
      }

      // Start async processing
      const jobId = await processBarcodeScanAsync(req.userId!, barcode);

      res.json({
        jobId,
        status: 'processing',
        message: 'Scan started. Use the job ID to check status.',
        pollUrl: `/api/jobs/${jobId}`
      });
    } catch (error) {
      console.error('Async barcode scan error:', error);
      res.status(500).json({ message: "Failed to start barcode scan", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Async manual ingredient analysis - returns immediately with job ID
  app.post("/api/scan/manual/async", scanRateLimit, heavyOperationsRateLimit, requireAuth, async (req, res) => {
    try {
      const { ingredients, productName } = req.body;

      if (!ingredients) {
        return res.status(400).json({ message: "Ingredients are required" });
      }

      // Parse ingredients
      const parsedIngredients = typeof ingredients === 'string'
        ? parseIngredientsText(ingredients)
        : ingredients;

      // Start async processing
      const jobId = await processManualScanAsync(req.userId!, parsedIngredients, productName);

      res.json({
        jobId,
        status: 'processing',
        message: 'Analysis started. Use the job ID to check status.',
        pollUrl: `/api/jobs/${jobId}`
      });
    } catch (error) {
      console.error('Async manual scan error:', error);
      res.status(500).json({ message: "Failed to start ingredient analysis", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Job status endpoint for polling
  app.get("/api/jobs/:jobId", requireAuth, async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = await getJobResult(jobId);

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Only allow users to access their own jobs
      if (job.userId !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const response: any = {
        jobId: job.id,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      };

      if (job.status === 'completed' && job.result) {
        response.result = job.result;
      } else if (job.status === 'failed' && job.error) {
        response.error = job.error;
      } else if (job.status === 'processing') {
        response.message = 'Job is currently being processed. Please check again in a moment.';
      }

      res.json(response);
    } catch (error) {
      console.error('Job status error:', error);
      res.status(500).json({ message: "Failed to get job status" });
    }
  });

  // Queue statistics endpoint (for monitoring)
  app.get("/api/admin/queue-stats", requireAuth, async (req, res) => {
    try {
      const stats = getQueueStats();
      res.json({
        ...stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Queue stats error:', error);
      res.status(500).json({ message: "Failed to get queue statistics" });
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

  const httpServer = createServer(app);
  return httpServer;
}
