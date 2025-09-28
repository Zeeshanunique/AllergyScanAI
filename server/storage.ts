import { type User, type InsertUser, type ScanHistory, type InsertScanHistory, type ChatMessage, type InsertChatMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  // Scan history operations
  getScanHistory(userId: string): Promise<ScanHistory[]>;
  createScanHistory(scan: InsertScanHistory): Promise<ScanHistory>;
  getScanById(id: string): Promise<ScanHistory | undefined>;
  
  // Chat message operations
  getChatHistory(userId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private scanHistory: Map<string, ScanHistory>;
  private chatMessages: Map<string, ChatMessage>;

  constructor() {
    this.users = new Map();
    this.scanHistory = new Map();
    this.chatMessages = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser,
      id,
      allergies: Array.isArray(insertUser.allergies) ? [...insertUser.allergies] : [],
      medications: Array.isArray(insertUser.medications) ? [...insertUser.medications] : [],
      emergencyContact: insertUser.emergencyContact || null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = { 
      ...user, 
      ...updates,
      allergies: Array.isArray(updates.allergies) ? [...updates.allergies] : user.allergies,
      medications: Array.isArray(updates.medications) ? [...updates.medications] : user.medications,
      emergencyContact: updates.emergencyContact ?? user.emergencyContact,
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getScanHistory(userId: string): Promise<ScanHistory[]> {
    return Array.from(this.scanHistory.values())
      .filter(scan => scan.userId === userId)
      .sort((a, b) => (b.scannedAt?.getTime() || 0) - (a.scannedAt?.getTime() || 0));
  }

  async createScanHistory(insertScan: InsertScanHistory): Promise<ScanHistory> {
    const id = randomUUID();
    const scan: ScanHistory = {
      ...insertScan,
      id,
      barcode: insertScan.barcode || null,
      productName: insertScan.productName || null,
      ingredients: Array.isArray(insertScan.ingredients) ? [...insertScan.ingredients] : [],
      scannedAt: new Date()
    };
    this.scanHistory.set(id, scan);
    return scan;
  }

  async getScanById(id: string): Promise<ScanHistory | undefined> {
    return this.scanHistory.get(id);
  }

  async getChatHistory(userId: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(message => message.userId === userId)
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = {
      ...insertMessage,
      id,
      timestamp: new Date()
    };
    this.chatMessages.set(id, message);
    return message;
  }
}

export const storage = new MemStorage();
