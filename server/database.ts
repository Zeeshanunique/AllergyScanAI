import Database from 'better-sqlite3';
import { join } from 'path';
import type { User, ScanHistory, ChatMessage, InsertUser, InsertScanHistory, InsertChatMessage } from '@shared/schema';

// Create database connection
const dbPath = join(process.cwd(), 'data', 'allergy-scan.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Create tables
const createTables = () => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      allergies TEXT DEFAULT '[]',
      medications TEXT DEFAULT '[]',
      emergency_contact TEXT,
      is_email_verified INTEGER DEFAULT 0,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Scan history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_name TEXT,
      barcode TEXT,
      ingredients TEXT NOT NULL DEFAULT '[]',
      analysis_result TEXT NOT NULL,
      scanned_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Chat messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      response TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
    CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON scan_history (user_id);
    CREATE INDEX IF NOT EXISTS idx_scan_history_scanned_at ON scan_history (scanned_at);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages (user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages (timestamp);
  `);
};

// Initialize database
createTables();

// Helper functions to convert between DB format and TypeScript types
const parseJsonField = (field: string): any[] => {
  try {
    return JSON.parse(field || '[]');
  } catch {
    return [];
  }
};

const stringifyJsonField = (field: any[]): string => {
  return JSON.stringify(field || []);
};

const parseAnalysisResult = (field: string): any => {
  try {
    return JSON.parse(field);
  } catch {
    return { safe: false, allergenAlerts: [], drugInteractions: [], riskLevel: 'danger' };
  }
};

// User operations
export const userQueries = {
  getById: db.prepare(`
    SELECT id, username, email, password_hash as passwordHash, first_name as firstName,
           last_name as lastName, allergies, medications, emergency_contact as emergencyContact,
           is_email_verified as isEmailVerified, last_login_at as lastLoginAt,
           created_at as createdAt, updated_at as updatedAt
    FROM users WHERE id = ?
  `),

  getByEmail: db.prepare(`
    SELECT id, username, email, password_hash as passwordHash, first_name as firstName,
           last_name as lastName, allergies, medications, emergency_contact as emergencyContact,
           is_email_verified as isEmailVerified, last_login_at as lastLoginAt,
           created_at as createdAt, updated_at as updatedAt
    FROM users WHERE email = ?
  `),

  getByUsername: db.prepare(`
    SELECT id, username, email, password_hash as passwordHash, first_name as firstName,
           last_name as lastName, allergies, medications, emergency_contact as emergencyContact,
           is_email_verified as isEmailVerified, last_login_at as lastLoginAt,
           created_at as createdAt, updated_at as updatedAt
    FROM users WHERE username = ?
  `),

  create: db.prepare(`
    INSERT INTO users (id, username, email, password_hash, first_name, last_name,
                      allergies, medications, emergency_contact, is_email_verified,
                      created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  update: db.prepare(`
    UPDATE users SET first_name = ?, last_name = ?, allergies = ?, medications = ?,
                     emergency_contact = ?, updated_at = ?
    WHERE id = ?
  `),

  updateLastLogin: db.prepare(`
    UPDATE users SET last_login_at = ? WHERE id = ?
  `)
};

// Scan history operations
export const scanQueries = {
  getByUserId: db.prepare(`
    SELECT id, user_id as userId, product_name as productName, barcode, ingredients,
           analysis_result as analysisResult, scanned_at as scannedAt
    FROM scan_history WHERE user_id = ? ORDER BY scanned_at DESC
  `),

  getById: db.prepare(`
    SELECT id, user_id as userId, product_name as productName, barcode, ingredients,
           analysis_result as analysisResult, scanned_at as scannedAt
    FROM scan_history WHERE id = ?
  `),

  create: db.prepare(`
    INSERT INTO scan_history (id, user_id, product_name, barcode, ingredients, analysis_result, scanned_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
};

// Chat message operations
export const chatQueries = {
  getByUserId: db.prepare(`
    SELECT id, user_id as userId, message, response, timestamp
    FROM chat_messages WHERE user_id = ? ORDER BY timestamp DESC
  `),

  create: db.prepare(`
    INSERT INTO chat_messages (id, user_id, message, response, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `)
};

// Database interface implementation
export class SQLiteStorage {
  async getUser(id: string): Promise<User | undefined> {
    const row = userQueries.getById.get(id) as any;
    if (!row) return undefined;

    return {
      ...row,
      allergies: parseJsonField(row.allergies),
      medications: parseJsonField(row.medications),
      isEmailVerified: Boolean(row.isEmailVerified),
      lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt) : null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const row = userQueries.getByEmail.get(email) as any;
    if (!row) return undefined;

    return {
      ...row,
      allergies: parseJsonField(row.allergies),
      medications: parseJsonField(row.medications),
      isEmailVerified: Boolean(row.isEmailVerified),
      lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt) : null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const row = userQueries.getByUsername.get(username) as any;
    if (!row) return undefined;

    return {
      ...row,
      allergies: parseJsonField(row.allergies),
      medications: parseJsonField(row.medications),
      isEmailVerified: Boolean(row.isEmailVerified),
      lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt) : null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    userQueries.create.run(
      id,
      userData.username,
      userData.email,
      userData.passwordHash,
      userData.firstName || null,
      userData.lastName || null,
      stringifyJsonField(userData.allergies || []),
      stringifyJsonField(userData.medications || []),
      userData.emergencyContact || null,
      userData.isEmailVerified ? 1 : 0,
      now,
      now
    );

    const user = await this.getUser(id);
    if (!user) throw new Error('Failed to create user');
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const now = new Date().toISOString();

    userQueries.update.run(
      updates.firstName ?? user.firstName,
      updates.lastName ?? user.lastName,
      stringifyJsonField(updates.allergies ?? user.allergies),
      stringifyJsonField(updates.medications ?? user.medications),
      updates.emergencyContact ?? user.emergencyContact,
      now,
      id
    );

    return this.getUser(id);
  }

  async updateUserLastLogin(id: string): Promise<void> {
    const now = new Date().toISOString();
    userQueries.updateLastLogin.run(now, id);
  }

  async getScanHistory(userId: string): Promise<ScanHistory[]> {
    const rows = scanQueries.getByUserId.all(userId) as any[];
    return rows.map(row => ({
      ...row,
      ingredients: parseJsonField(row.ingredients),
      analysisResult: parseAnalysisResult(row.analysisResult),
      scannedAt: new Date(row.scannedAt)
    }));
  }

  async createScanHistory(scanData: InsertScanHistory): Promise<ScanHistory> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    scanQueries.create.run(
      id,
      scanData.userId,
      scanData.productName || null,
      scanData.barcode || null,
      stringifyJsonField(scanData.ingredients),
      JSON.stringify(scanData.analysisResult),
      now
    );

    const scan = await this.getScanById(id);
    if (!scan) throw new Error('Failed to create scan history');
    return scan;
  }

  async getScanById(id: string): Promise<ScanHistory | undefined> {
    const row = scanQueries.getById.get(id) as any;
    if (!row) return undefined;

    return {
      ...row,
      ingredients: parseJsonField(row.ingredients),
      analysisResult: parseAnalysisResult(row.analysisResult),
      scannedAt: new Date(row.scannedAt)
    };
  }

  async getChatHistory(userId: string): Promise<ChatMessage[]> {
    const rows = chatQueries.getByUserId.all(userId) as any[];
    return rows.map(row => ({
      ...row,
      timestamp: new Date(row.timestamp)
    }));
  }

  async createChatMessage(messageData: InsertChatMessage): Promise<ChatMessage> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    chatQueries.create.run(
      id,
      messageData.userId,
      messageData.message,
      messageData.response,
      now
    );

    const messages = await this.getChatHistory(messageData.userId);
    const message = messages.find(m => m.id === id);
    if (!message) throw new Error('Failed to create chat message');
    return message;
  }
}

// Export database instance and storage
export { db };
export const storage = new SQLiteStorage();