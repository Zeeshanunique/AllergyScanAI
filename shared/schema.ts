import { z } from "zod";

// Type definitions for development-only setup
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  firstName?: string | null;
  lastName?: string | null;
  allergies: string[];
  medications: string[];
  emergencyContact?: string | null;
  isEmailVerified: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScanHistory {
  id: string;
  userId: string;
  productName?: string | null;
  barcode?: string | null;
  ingredients: string[];
  analysisResult: {
    safe: boolean;
    allergenAlerts: Array<{
      allergen: string;
      severity: 'low' | 'medium' | 'high';
      message: string;
    }>;
    drugInteractions: Array<{
      medication: string;
      ingredient: string;
      severity: 'low' | 'medium' | 'high';
      message: string;
    }>;
    riskLevel: 'safe' | 'caution' | 'danger';
  };
  scannedAt: Date | null;
}

export interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  response: string;
  timestamp: Date;
}

// Validation schemas
export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be at most 20 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  emergencyContact: z.string().optional(),
});

export const scanAnalysisSchema = z.object({
  barcode: z.string().optional(),
  productName: z.string().optional(),
  ingredients: z.array(z.string()),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
});

// Insert types for data creation (removing Drizzle references)
export type InsertUser = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>;
export type InsertScanHistory = Omit<ScanHistory, 'id' | 'scannedAt'>;
export type InsertChatMessage = Omit<ChatMessage, 'id' | 'timestamp'>;

// Inferred types from schemas
export type RegisterData = z.infer<typeof registerSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type UpdateProfileData = z.infer<typeof updateProfileSchema>;
export type ScanAnalysisData = z.infer<typeof scanAnalysisSchema>;
export type ChatMessageData = z.infer<typeof chatMessageSchema>;
