import { Request, Response, NextFunction } from "express";
import type { User } from "@shared/schema";

// Simple in-memory storage for development-only authentication
const activeSessions = new Map<string, Omit<User, 'passwordHash'>>();

declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, 'passwordHash'>;
      userId?: string;
    }
  }
}

// Simple token-based auth for development
export function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function createSession(user: Omit<User, 'passwordHash'>): string {
  const token = generateToken();
  activeSessions.set(token, user);
  return token;
}

export function destroySession(token: string): void {
  activeSessions.delete(token);
}

export function getSessionUser(token: string): Omit<User, 'passwordHash'> | undefined {
  return activeSessions.get(token);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const user = getSessionUser(token);
  if (!user) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  req.user = user;
  req.userId = user.id;
  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    const user = getSessionUser(token);
    if (user) {
      req.user = user;
      req.userId = user.id;
    }
  }
  next();
}

export function guestOnly(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token && getSessionUser(token)) {
    return res.status(403).json({ message: "Already authenticated" });
  }
  next();
}