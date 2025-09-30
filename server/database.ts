import Database from 'better-sqlite3';
import { join } from 'path';
import type { User, ScanHistory, ChatMessage, ConsultationHistory, InsertUser, InsertScanHistory, InsertChatMessage, InsertConsultationHistory } from '@shared/schema';

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

  // Consultation history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS consultation_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      doctor_name TEXT NOT NULL,
      doctor_specialty TEXT NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      consultation_type TEXT NOT NULL CHECK (consultation_type IN ('video', 'phone', 'chat')),
      scan_result_id TEXT,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
      consultation_fee INTEGER NOT NULL,
      notes TEXT,
      prescription TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (scan_result_id) REFERENCES scan_history (id) ON DELETE SET NULL
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

    -- Consultation history indexes
    CREATE INDEX IF NOT EXISTS idx_consultation_history_user_id ON consultation_history (user_id);
    CREATE INDEX IF NOT EXISTS idx_consultation_history_appointment_date ON consultation_history (appointment_date DESC);
    CREATE INDEX IF NOT EXISTS idx_consultation_history_status ON consultation_history (status);
    CREATE INDEX IF NOT EXISTS idx_consultation_history_doctor_id ON consultation_history (doctor_id);
    CREATE INDEX IF NOT EXISTS idx_consultation_history_scan_result_id ON consultation_history (scan_result_id);
    CREATE INDEX IF NOT EXISTS idx_consultation_history_user_date ON consultation_history (user_id, appointment_date DESC);
    CREATE INDEX IF NOT EXISTS idx_consultation_history_user_status ON consultation_history (user_id, status);

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

// Consultation history operations
export const consultationQueries = {
  getByUserId: db.prepare(`
    SELECT id, user_id as userId, doctor_id as doctorId, doctor_name as doctorName,
           doctor_specialty as doctorSpecialty, appointment_date as appointmentDate,
           appointment_time as appointmentTime, consultation_type as consultationType,
           scan_result_id as scanResultId, reason, status, consultation_fee as consultationFee,
           notes, prescription, created_at as createdAt, updated_at as updatedAt
    FROM consultation_history WHERE user_id = ? ORDER BY appointment_date DESC
  `),

  getByUserIdWithLimit: db.prepare(`
    SELECT id, user_id as userId, doctor_id as doctorId, doctor_name as doctorName,
           doctor_specialty as doctorSpecialty, appointment_date as appointmentDate,
           appointment_time as appointmentTime, consultation_type as consultationType,
           scan_result_id as scanResultId, reason, status, consultation_fee as consultationFee,
           notes, prescription, created_at as createdAt, updated_at as updatedAt
    FROM consultation_history WHERE user_id = ? ORDER BY appointment_date DESC LIMIT ?
  `),

  getByUserIdPaginated: db.prepare(`
    SELECT id, user_id as userId, doctor_id as doctorId, doctor_name as doctorName,
           doctor_specialty as doctorSpecialty, appointment_date as appointmentDate,
           appointment_time as appointmentTime, consultation_type as consultationType,
           scan_result_id as scanResultId, reason, status, consultation_fee as consultationFee,
           notes, prescription, created_at as createdAt, updated_at as updatedAt
    FROM consultation_history WHERE user_id = ? ORDER BY appointment_date DESC LIMIT ? OFFSET ?
  `),

  getByStatus: db.prepare(`
    SELECT id, user_id as userId, doctor_id as doctorId, doctor_name as doctorName,
           doctor_specialty as doctorSpecialty, appointment_date as appointmentDate,
           appointment_time as appointmentTime, consultation_type as consultationType,
           scan_result_id as scanResultId, reason, status, consultation_fee as consultationFee,
           notes, prescription, created_at as createdAt, updated_at as updatedAt
    FROM consultation_history WHERE user_id = ? AND status = ? ORDER BY appointment_date DESC
  `),

  getUpcoming: db.prepare(`
    SELECT id, user_id as userId, doctor_id as doctorId, doctor_name as doctorName,
           doctor_specialty as doctorSpecialty, appointment_date as appointmentDate,
           appointment_time as appointmentTime, consultation_type as consultationType,
           scan_result_id as scanResultId, reason, status, consultation_fee as consultationFee,
           notes, prescription, created_at as createdAt, updated_at as updatedAt
    FROM consultation_history
    WHERE user_id = ? AND status = 'scheduled' AND appointment_date >= ?
    ORDER BY appointment_date ASC, appointment_time ASC
  `),

  getById: db.prepare(`
    SELECT id, user_id as userId, doctor_id as doctorId, doctor_name as doctorName,
           doctor_specialty as doctorSpecialty, appointment_date as appointmentDate,
           appointment_time as appointmentTime, consultation_type as consultationType,
           scan_result_id as scanResultId, reason, status, consultation_fee as consultationFee,
           notes, prescription, created_at as createdAt, updated_at as updatedAt
    FROM consultation_history WHERE id = ?
  `),

  countByUser: db.prepare(`
    SELECT COUNT(*) as count FROM consultation_history WHERE user_id = ?
  `),

  create: db.prepare(`
    INSERT INTO consultation_history (
      id, user_id, doctor_id, doctor_name, doctor_specialty, appointment_date,
      appointment_time, consultation_type, scan_result_id, reason, status,
      consultation_fee, notes, prescription, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  updateStatus: db.prepare(`
    UPDATE consultation_history SET status = ?, updated_at = ? WHERE id = ?
  `),

  updateNotes: db.prepare(`
    UPDATE consultation_history SET notes = ?, prescription = ?, updated_at = ? WHERE id = ?
  `),

  deleteOld: db.prepare(`
    DELETE FROM consultation_history WHERE appointment_date < ?
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

  // Consultation history operations
  async getConsultationHistory(userId: string): Promise<ConsultationHistory[]> {
    const rows = consultationQueries.getByUserId.all(userId) as any[];
    return rows.map(row => ({
      ...row,
      appointmentDate: new Date(row.appointmentDate),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }

  async getConsultationHistoryPaginated(userId: string, limit: number, offset: number): Promise<ConsultationHistory[]> {
    const rows = consultationQueries.getByUserIdPaginated.all(userId, limit, offset) as any[];
    return rows.map(row => ({
      ...row,
      appointmentDate: new Date(row.appointmentDate),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }

  async getRecentConsultations(userId: string, limit: number = 10): Promise<ConsultationHistory[]> {
    const rows = consultationQueries.getByUserIdWithLimit.all(userId, limit) as any[];
    return rows.map(row => ({
      ...row,
      appointmentDate: new Date(row.appointmentDate),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }

  async getConsultationsByStatus(userId: string, status: string): Promise<ConsultationHistory[]> {
    const rows = consultationQueries.getByStatus.all(userId, status) as any[];
    return rows.map(row => ({
      ...row,
      appointmentDate: new Date(row.appointmentDate),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }

  async getUpcomingConsultations(userId: string): Promise<ConsultationHistory[]> {
    const today = new Date().toISOString().split('T')[0];
    const rows = consultationQueries.getUpcoming.all(userId, today) as any[];
    return rows.map(row => ({
      ...row,
      appointmentDate: new Date(row.appointmentDate),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }

  async getConsultationById(id: string): Promise<ConsultationHistory | undefined> {
    const row = consultationQueries.getById.get(id) as any;
    if (!row) return undefined;

    return {
      ...row,
      appointmentDate: new Date(row.appointmentDate),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  async getConsultationCount(userId: string): Promise<number> {
    const result = consultationQueries.countByUser.get(userId) as any;
    return result?.count || 0;
  }

  async createConsultation(consultationData: InsertConsultationHistory): Promise<ConsultationHistory> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    consultationQueries.create.run(
      id,
      consultationData.userId,
      consultationData.doctorId,
      consultationData.doctorName,
      consultationData.doctorSpecialty,
      consultationData.appointmentDate.toISOString().split('T')[0],
      consultationData.appointmentTime,
      consultationData.consultationType,
      consultationData.scanResultId || null,
      consultationData.reason,
      consultationData.status || 'scheduled',
      consultationData.consultationFee,
      consultationData.notes || null,
      consultationData.prescription || null,
      now,
      now
    );

    const consultation = await this.getConsultationById(id);
    if (!consultation) throw new Error('Failed to create consultation');
    return consultation;
  }

  async updateConsultationStatus(id: string, status: string): Promise<ConsultationHistory | undefined> {
    const now = new Date().toISOString();
    consultationQueries.updateStatus.run(status, now, id);
    return this.getConsultationById(id);
  }

  async updateConsultationNotes(id: string, notes: string, prescription?: string): Promise<ConsultationHistory | undefined> {
    const now = new Date().toISOString();
    consultationQueries.updateNotes.run(notes, prescription || null, now, id);
    return this.getConsultationById(id);
  }

  // Database maintenance methods
  async cleanupOldData(daysToKeep: number = 90): Promise<{ scansDeleted: number; chatsDeleted: number; consultationsDeleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffIso = cutoffDate.toISOString();

    const scansResult = scanQueries.deleteOld.run(cutoffIso);
    const chatsResult = chatQueries.deleteOld.run(cutoffIso);
    const consultationsResult = consultationQueries.deleteOld.run(cutoffDate.toISOString().split('T')[0]);

    return {
      scansDeleted: scansResult.changes,
      chatsDeleted: chatsResult.changes,
      consultationsDeleted: consultationsResult.changes
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
    consultationCount: number;
    dbSizeKB: number;
  }> {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    const scanCount = db.prepare('SELECT COUNT(*) as count FROM scan_history').get() as any;
    const chatCount = db.prepare('SELECT COUNT(*) as count FROM chat_messages').get() as any;
    const consultationCount = db.prepare('SELECT COUNT(*) as count FROM consultation_history').get() as any;
    const dbSize = db.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get() as any;

    return {
      userCount: userCount.count,
      scanCount: scanCount.count,
      chatCount: chatCount.count,
      consultationCount: consultationCount.count,
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
      if (result.scansDeleted > 0 || result.chatsDeleted > 0 || result.consultationsDeleted > 0) {
        console.log(`Database cleanup completed: ${result.scansDeleted} scans deleted, ${result.chatsDeleted} chats deleted, ${result.consultationsDeleted} consultations deleted`);
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