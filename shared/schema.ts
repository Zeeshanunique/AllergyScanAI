import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  allergies: json("allergies").$type<string[]>().default([]),
  medications: json("medications").$type<string[]>().default([]),
  emergencyContact: text("emergency_contact"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scanHistory = pgTable("scan_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  productName: text("product_name"),
  barcode: text("barcode"),
  ingredients: json("ingredients").$type<string[]>().notNull(),
  analysisResult: json("analysis_result").$type<{
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
  }>().notNull(),
  scannedAt: timestamp("scanned_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  response: text("response").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertScanHistorySchema = createInsertSchema(scanHistory).omit({
  id: true,
  scannedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertScanHistory = z.infer<typeof insertScanHistorySchema>;
export type ScanHistory = typeof scanHistory.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
