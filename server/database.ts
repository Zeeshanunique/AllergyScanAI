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

  // Create comprehensive indexes for optimal query performance
  db.exec(`
    -- User table indexes
    CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
    CREATE INDEX IF NOT EXISTS idx_users_last_login ON users (last_login_at DESC);
    CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);

    -- Scan history indexes for fast retrieval
    CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON scan_history (user_id);
    CREATE INDEX IF NOT EXISTS idx_scan_history_scanned_at ON scan_history (scanned_at DESC);
    CREATE INDEX IF NOT EXISTS idx_scan_history_barcode ON scan_history (barcode);
    CREATE INDEX IF NOT EXISTS idx_scan_history_product_name ON scan_history (product_name);

    -- Composite indexes for common query patterns
    CREATE INDEX IF NOT EXISTS idx_scan_history_user_time ON scan_history (user_id, scanned_at DESC);
    CREATE INDEX IF NOT EXISTS idx_scan_history_user_product ON scan_history (user_id, product_name);
    CREATE INDEX IF NOT EXISTS idx_scan_history_barcode_time ON scan_history (barcode, scanned_at DESC);

    -- Chat messages indexes
    CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages (user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages (timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_user_time ON chat_messages (user_id, timestamp DESC);

    -- Full-text search indexes for better search capabilities
    CREATE INDEX IF NOT EXISTS idx_scan_history_ingredients_text ON scan_history (ingredients);
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

// Optimized scan history operations leveraging indexes
export const scanQueries = {
  getByUserId: db.prepare(`
    SELECT id, user_id as userId, product_name as productName, barcode, ingredients,
           analysis_result as analysisResult, scanned_at as scannedAt
    FROM scan_history WHERE user_id = ? ORDER BY scanned_at DESC
  `),

  getByUserIdWithLimit: db.prepare(`
    SELECT id, user_id as userId, product_name as productName, barcode, ingredients,
           analysis_result as analysisResult, scanned_at as scannedAt
    FROM scan_history WHERE user_id = ? ORDER BY scanned_at DESC LIMIT ?
  `),

  getByUserIdPaginated: db.prepare(`
    SELECT id, user_id as userId, product_name as productName, barcode, ingredients,
           analysis_result as analysisResult, scanned_at as scannedAt
    FROM scan_history WHERE user_id = ? ORDER BY scanned_at DESC LIMIT ? OFFSET ?
  `),

  getByBarcode: db.prepare(`
    SELECT id, user_id as userId, product_name as productName, barcode, ingredients,
           analysis_result as analysisResult, scanned_at as scannedAt
    FROM scan_history WHERE barcode = ? ORDER BY scanned_at DESC
  `),

  getByProductName: db.prepare(`
    SELECT id, user_id as userId, product_name as productName, barcode, ingredients,
           analysis_result as analysisResult, scanned_at as scannedAt
    FROM scan_history WHERE user_id = ? AND product_name LIKE ? ORDER BY scanned_at DESC
  `),

  getRecentByUser: db.prepare(`
    SELECT id, user_id as userId, product_name as productName, barcode, ingredients,
           analysis_result as analysisResult, scanned_at as scannedAt
    FROM scan_history WHERE user_id = ? AND scanned_at > ? ORDER BY scanned_at DESC
  `),

  countByUser: db.prepare(`
    SELECT COUNT(*) as count FROM scan_history WHERE user_id = ?
  `),

  getById: db.prepare(`
    SELECT id, user_id as userId, product_name as productName, barcode, ingredients,
           analysis_result as analysisResult, scanned_at as scannedAt
    FROM scan_history WHERE id = ?
  `),

  create: db.prepare(`
    INSERT INTO scan_history (id, user_id, product_name, barcode, ingredients, analysis_result, scanned_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),

  deleteOld: db.prepare(`
    DELETE FROM scan_history WHERE scanned_at < ?
  `)
};

// Optimized chat message operations
export const chatQueries = {
  getByUserId: db.prepare(`
    SELECT id, user_id as userId, message, response, timestamp
    FROM chat_messages WHERE user_id = ? ORDER BY timestamp DESC
  `),

  getByUserIdWithLimit: db.prepare(`
    SELECT id, user_id as userId, message, response, timestamp
    FROM chat_messages WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?
  `),

  getByUserIdPaginated: db.prepare(`
    SELECT id, user_id as userId, message, response, timestamp
    FROM chat_messages WHERE user_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?
  `),

  getRecentByUser: db.prepare(`
    SELECT id, user_id as userId, message, response, timestamp
    FROM chat_messages WHERE user_id = ? AND timestamp > ? ORDER BY timestamp DESC
  `),

  countByUser: db.prepare(`
    SELECT COUNT(*) as count FROM chat_messages WHERE user_id = ?
  `),

  create: db.prepare(`
    INSERT INTO chat_messages (id, user_id, message, response, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `),

  deleteOld: db.prepare(`
    DELETE FROM chat_messages WHERE timestamp < ?
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

  // Optimized methods leveraging indexes
  async getScanHistoryPaginated(userId: string, limit: number, offset: number): Promise<ScanHistory[]> {
    const rows = scanQueries.getByUserIdPaginated.all(userId, limit, offset) as any[];
    return rows.map(row => ({
      ...row,
      ingredients: parseJsonField(row.ingredients),
      analysisResult: parseAnalysisResult(row.analysisResult),
      scannedAt: new Date(row.scannedAt)
    }));
  }

  async getRecentScans(userId: string, limit: number = 10): Promise<ScanHistory[]> {
    const rows = scanQueries.getByUserIdWithLimit.all(userId, limit) as any[];
    return rows.map(row => ({
      ...row,
      ingredients: parseJsonField(row.ingredients),
      analysisResult: parseAnalysisResult(row.analysisResult),
      scannedAt: new Date(row.scannedAt)
    }));
  }

  async getScansByBarcode(barcode: string): Promise<ScanHistory[]> {
    const rows = scanQueries.getByBarcode.all(barcode) as any[];
    return rows.map(row => ({
      ...row,
      ingredients: parseJsonField(row.ingredients),
      analysisResult: parseAnalysisResult(row.analysisResult),
      scannedAt: new Date(row.scannedAt)
    }));
  }

  async searchScansByProduct(userId: string, productName: string): Promise<ScanHistory[]> {
    const rows = scanQueries.getByProductName.all(userId, `%${productName}%`) as any[];
    return rows.map(row => ({
      ...row,
      ingredients: parseJsonField(row.ingredients),
      analysisResult: parseAnalysisResult(row.analysisResult),
      scannedAt: new Date(row.scannedAt)
    }));
  }

  async getScanCount(userId: string): Promise<number> {
    const result = scanQueries.countByUser.get(userId) as any;
    return result?.count || 0;
  }

  async getRecentScansSince(userId: string, since: Date): Promise<ScanHistory[]> {
    const rows = scanQueries.getRecentByUser.all(userId, since.toISOString()) as any[];
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

  // Optimized chat methods
  async getChatHistoryPaginated(userId: string, limit: number, offset: number): Promise<ChatMessage[]> {
    const rows = chatQueries.getByUserIdPaginated.all(userId, limit, offset) as any[];
    return rows.map(row => ({
      ...row,
      timestamp: new Date(row.timestamp)
    }));
  }

  async getRecentChatMessages(userId: string, limit: number = 20): Promise<ChatMessage[]> {
    const rows = chatQueries.getByUserIdWithLimit.all(userId, limit) as any[];
    return rows.map(row => ({
      ...row,
      timestamp: new Date(row.timestamp)
    }));
  }

  async getChatMessagesSince(userId: string, since: Date): Promise<ChatMessage[]> {
    const rows = chatQueries.getRecentByUser.all(userId, since.toISOString()) as any[];
    return rows.map(row => ({
      ...row,
      timestamp: new Date(row.timestamp)
    }));
  }

  async getChatCount(userId: string): Promise<number> {
    const result = chatQueries.countByUser.get(userId) as any;
    return result?.count || 0;
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

  // Database maintenance methods
  async cleanupOldData(daysToKeep: number = 90): Promise<{ scansDeleted: number; chatsDeleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffIso = cutoffDate.toISOString();

    const scansResult = scanQueries.deleteOld.run(cutoffIso);
    const chatsResult = chatQueries.deleteOld.run(cutoffIso);

    return {
      scansDeleted: scansResult.changes,
      chatsDeleted: chatsResult.changes
    };
  }

  // Database optimization methods
  async vacuum(): Promise<void> {
    db.exec('VACUUM');
  }

  async analyze(): Promise<void> {
    db.exec('ANALYZE');
  }

  async getDatabaseStats(): Promise<{
    userCount: number;
    scanCount: number;
    chatCount: number;
    dbSizeKB: number;
  }> {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    const scanCount = db.prepare('SELECT COUNT(*) as count FROM scan_history').get() as any;
    const chatCount = db.prepare('SELECT COUNT(*) as count FROM chat_messages').get() as any;
    const dbSize = db.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get() as any;

    return {
      userCount: userCount.count,
      scanCount: scanCount.count,
      chatCount: chatCount.count,
      dbSizeKB: Math.round(dbSize.size / 1024)
    };
  }
}

// Automatic database maintenance scheduler
const scheduleMaintenanceTasks = () => {
  // Run ANALYZE every hour to optimize query planner
  setInterval(async () => {
    try {
      await storage.analyze();
      console.log('Database ANALYZE completed');
    } catch (error) {
      console.error('Database ANALYZE failed:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  // Cleanup old data daily (keep 90 days)
  setInterval(async () => {
    try {
      const result = await storage.cleanupOldData(90);
      if (result.scansDeleted > 0 || result.chatsDeleted > 0) {
        console.log(`Database cleanup completed: ${result.scansDeleted} scans deleted, ${result.chatsDeleted} chats deleted`);
      }
    } catch (error) {
      console.error('Database cleanup failed:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours

  // Run VACUUM weekly for optimal storage efficiency
  setInterval(async () => {
    try {
      await storage.vacuum();
      console.log('Database VACUUM completed');
    } catch (error) {
      console.error('Database VACUUM failed:', error);
    }
  }, 7 * 24 * 60 * 60 * 1000); // 7 days
};

// Start maintenance tasks
scheduleMaintenanceTasks();

// Export database instance and storage
export { db };
export const storage = new SQLiteStorage();