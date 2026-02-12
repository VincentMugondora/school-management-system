'use server';

import { UserService } from '@/services/user.service';
import {
  createUserSchema,
  updateUserSchema,
  userIdSchema,
  CreateUserInput,
  UpdateUserInput,
} from '@/lib/validators';
import { User, Role } from '@prisma/client';
import { ServiceContext, ServiceError } from '@/types/domain.types';
import { requireRole, RoleGroups } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// ============================================
// MOCK AUTHENTICATION - Replace with Clerk when ready
// ============================================

async function getCurrentUser(): Promise<ServiceContext | null> {
  // TODO: Replace with actual Clerk authentication
  return {
    userId: 'mock-user-id',
    schoolId: 'mock-school-id',
    role: Role.ADMIN,
  };
}

// ============================================
// ERROR HANDLER
// ============================================

function handleServiceError(error: unknown): { success: false; error: string } {
  if (error instanceof ServiceError) {
    return { success: false, error: error.message };
  }
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  return { success: false, error: 'An unexpected error occurred' };
}

// Type definitions for return data
type UserSchool = { id: string; name: string };
type UserWithRelations = User & {
  school: UserSchool | null;
};

// ============================================
// USER SERVER ACTIONS
// ============================================

/**
 * Create a new user
 * Only SUPER_ADMIN and ADMIN can create users
 */
export async function createUser(
  input: CreateUserInput
): Promise<{ success: true; data: User } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    // Enforce role-based access: Only school admins can create users
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    const validation = createUserSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    const user = await UserService.createUser(validation.data, context);
    revalidatePath('/users');
    return { success: true, data: user };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Get user by ID
 * Only staff members can view user details
 */
export async function getUserById(
  id: string
): Promise<{ success: true; data: UserWithRelations } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    // Enforce role-based access: Only staff can view users
    requireRole(context, RoleGroups.ALL_STAFF);

    const idValidation = userIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid user ID' };

    const user = await UserService.getUserById(idValidation.data, context);
    if (!user) return { success: false, error: 'User not found' };

    return { success: true, data: user };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * List users with filtering
 * Only staff members can list users
 */
export async function listUsers(
  filters?: {
    role?: Role;
    schoolId?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }
): Promise<{ success: true; data: { users: User[]; total: number } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    // Enforce role-based access: Only staff can list users
    requireRole(context, RoleGroups.ALL_STAFF);

    const result = await UserService.listUsers(context, filters);
    return { success: true, data: result };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Update user
 * Only SUPER_ADMIN and ADMIN can update users
 */
export async function updateUser(
  id: string,
  input: UpdateUserInput
): Promise<{ success: true; data: User } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    // Enforce role-based access: Only school admins can update users
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    const idValidation = userIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid user ID' };

    const validation = updateUserSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    const user = await UserService.updateUser(idValidation.data, validation.data, context);
    revalidatePath('/users');
    return { success: true, data: user };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Deactivate user (soft delete alternative)
 * Only SUPER_ADMIN and ADMIN can deactivate users
 */
export async function deactivateUser(
  id: string
): Promise<{ success: true; data: User } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    // Enforce role-based access: Only school admins can deactivate users
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    const idValidation = userIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid user ID' };

    const user = await UserService.deactivateUser(idValidation.data, context);
    revalidatePath('/users');
    return { success: true, data: user };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Activate user
 * Only SUPER_ADMIN and ADMIN can activate users
 */
export async function activateUser(
  id: string
): Promise<{ success: true; data: User } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    // Enforce role-based access: Only school admins can activate users
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    const idValidation = userIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid user ID' };

    const user = await UserService.activateUser(idValidation.data, context);
    revalidatePath('/users');
    return { success: true, data: user };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Delete user permanently
 * Only SUPER_ADMIN can permanently delete users
 */
export async function deleteUser(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    // Enforce role-based access: Only SUPER_ADMIN can delete users
    requireRole(context, [Role.SUPER_ADMIN]);

    const idValidation = userIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid user ID' };

    await UserService.deleteUser(idValidation.data, context);
    revalidatePath('/users');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Get current user profile
 * Any authenticated user can view their own profile
 */
export async function getCurrentUserProfile(): Promise<
  { success: true; data: User & { school: { id: string; name: string; slug: string } | null } } | 
  { success: false; error: string }
> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    // Any authenticated user can view their own profile
    const user = await UserService.getCurrentUserProfile(context);
    return { success: true, data: user };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Update current user profile
 * Any authenticated user can update their own profile
 */
export async function updateCurrentUserProfile(
  input: { firstName?: string; lastName?: string }
): Promise<{ success: true; data: User } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    // Any authenticated user can update their own profile
    const user = await UserService.updateCurrentUserProfile(input, context);
    revalidatePath('/profile');
    return { success: true, data: user };
  } catch (error) {
    return handleServiceError(error);
  }
}
