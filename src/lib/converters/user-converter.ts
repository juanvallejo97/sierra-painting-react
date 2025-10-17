/**
 * User Document Converter
 *
 * Type-safe converter for User collection with Zod validation
 */

import { z } from 'zod';
import { createConverter } from './base-converter';
import { Timestamp } from 'firebase/firestore';

/**
 * User role enum
 */
export const UserRole = z.enum(['admin', 'manager', 'worker', 'viewer']);
export type UserRole = z.infer<typeof UserRole>;

/**
 * User status enum
 */
export const UserStatus = z.enum(['active', 'inactive', 'pending']);
export type UserStatus = z.infer<typeof UserStatus>;

/**
 * User document schema for Firestore
 */
export const userSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().min(2).max(100).optional(),
  photoURL: z.string().url().optional(),
  phone: z.string().max(20).optional(),
  role: UserRole,
  status: UserStatus.default('active'),
  companyId: z.string().optional(),
  lastLoginAt: z.union([z.date(), z.instanceof(Timestamp)]).optional(),
  createdAt: z.union([z.date(), z.instanceof(Timestamp)]).optional(),
  updatedAt: z.union([z.date(), z.instanceof(Timestamp)]).optional(),
});

/**
 * User document type
 */
export type User = z.infer<typeof userSchema>;

/**
 * User document interface (with Date types for app use)
 */
export interface UserDocument extends Omit<User, 'lastLoginAt' | 'createdAt' | 'updatedAt'> {
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User data for creation (signup)
 */
export const createUserInputSchema = userSchema.omit({
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
}).extend({
  status: UserStatus.default('active'),
  role: UserRole.default('viewer'),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

/**
 * User data for updates (profile)
 */
export const updateUserInputSchema = userSchema.partial().omit({
  uid: true,
  email: true,
  companyId: true,
  createdAt: true,
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

/**
 * User profile schema (public-safe data)
 */
export const userProfileSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().url().optional(),
  role: UserRole,
  companyId: z.string().optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

/**
 * User Firestore converter
 */
export const userConverter = createConverter<User>(
  userSchema,
  'users',
  {
    validateOnRead: true,
    validateOnWrite: true,
    convertTimestamps: true,
    stripUndefined: true,
  }
);

/**
 * Helper to validate user creation data
 */
export function validateCreateUser(data: unknown): CreateUserInput {
  return createUserInputSchema.parse(data);
}

/**
 * Helper to validate user update data
 */
export function validateUpdateUser(data: unknown): UpdateUserInput {
  return updateUserInputSchema.parse(data);
}

/**
 * Helper to extract safe user profile
 */
export function toUserProfile(user: User): UserProfile {
  return userProfileSchema.parse({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: user.role,
    companyId: user.companyId,
  });
}

/**
 * Check if user has permission for a role
 */
export function hasPermission(user: User, requiredRole: UserRole): boolean {
  const rolePriority: Record<string, number> = {
    admin: 3,
    manager: 2,
    worker: 1,
    viewer: 0,
  };

  const userPriority = rolePriority[user.role] ?? 0;
  const requiredPriority = rolePriority[requiredRole] ?? 0;

  return userPriority >= requiredPriority;
}

/**
 * Check if user is admin
 */
export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

/**
 * Check if user is manager or admin
 */
export function isManager(user: User): boolean {
  return user.role === 'manager' || user.role === 'admin';
}
