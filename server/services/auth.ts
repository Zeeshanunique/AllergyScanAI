import bcrypt from "bcryptjs";
import { storage } from "../database";
import type { RegisterData, LoginData, User } from "@shared/schema";

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static async register(data: RegisterData): Promise<{ user: Omit<User, 'passwordHash'>, message: string }> {
    try {
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        throw new Error("Email already registered");
      }

      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        throw new Error("Username already taken");
      }

      // Hash password
      const passwordHash = await this.hashPassword(data.password);

      // Create user
      const userData = {
        username: data.username,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        allergies: [],
        medications: [],
        isEmailVerified: false,
      };

      const user = await storage.createUser(userData);

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        message: "Registration successful"
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Registration failed");
    }
  }

  static async login(data: LoginData): Promise<{ user: Omit<User, 'passwordHash'>, message: string }> {
    try {
      // Find user by email
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        throw new Error("Invalid email or password");
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(data.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error("Invalid email or password");
      }

      // Update last login
      await storage.updateUserLastLogin(user.id);

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        message: "Login successful"
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Login failed");
    }
  }

  static async getCurrentUser(userId: string): Promise<Omit<User, 'passwordHash'> | null> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return null;
      }

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      return null;
    }
  }
}