import { prisma } from '@/lib/db';
import { User, Role, Prisma } from '@prisma/client';
import {
  ServiceContext,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/types/domain.types';
import {
  requireRole,
  requireSchoolContext,
  canAccessSchoolResource,
  RoleGroups,
} from '@/lib/auth';

// ============================================
// USER SERVICE
// ============================================

export const UserService = {
  /**
   * Create a new user
   * @param data - User creation data
   * @param context - Service context with user info
   * @returns Created user
   */
  async createUser(
    data: {
      clerkId: string;
      email: string;
      firstName?: string;
      lastName?: string;
      role: Role;
      schoolId?: string;
    },
    context: ServiceContext
  ): Promise<User> {
    // Only platform admins or school admins can create users
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    // Check if user can create users in the target school
    if (data.schoolId && !canAccessSchoolResource(context, data.schoolId)) {
      throw new ForbiddenError('You do not have access to this school');
    }

    // Only SUPER_ADMIN can create other SUPER_ADMINs
    if (data.role === Role.SUPER_ADMIN && context.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only SUPER_ADMIN can create other SUPER_ADMINs');
    }

    // Only SUPER_ADMIN can create platform-level users (without schoolId)
    if (!data.schoolId && context.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only SUPER_ADMIN can create platform-level users');
    }

    // Check if clerkId already exists
    const existingByClerkId = await prisma.user.findUnique({
      where: { clerkId: data.clerkId },
    });
    if (existingByClerkId) {
      throw new ConflictError('User with this Clerk ID already exists');
    }

    // Check if email already exists
    const existingByEmail = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existingByEmail) {
      throw new ConflictError('User with this email already exists');
    }

    const user = await prisma.user.create({
      data: {
        clerkId: data.clerkId,
        email: data.email.toLowerCase().trim(),
        firstName: data.firstName?.trim(),
        lastName: data.lastName?.trim(),
        role: data.role,
        schoolId: data.schoolId,
        isActive: true,
      },
    });

    return user;
  },

  /**
   * Get user by ID
   * @param id - User ID
   * @param context - Service context with user info
   * @returns User or null
   */
  async getUserById(
    id: string,
    context: ServiceContext
  ): Promise<
    | (User & {
        school: { id: string; name: string } | null;
      })
    | null
  > {
    // Any staff member can view users
    requireRole(context, RoleGroups.ALL_STAFF);

    const user = await prisma.user.findFirst({
      where: { id },
      include: {
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Users can only see users from their own school (except SUPER_ADMIN)
    if (user.schoolId && !canAccessSchoolResource(context, user.schoolId)) {
      throw new ForbiddenError('You do not have access to view this user');
    }

    return user;
  },

  /**
   * Get user by Clerk ID
   * @param clerkId - Clerk ID
   * @returns User or null
   */
  async getUserByClerkId(clerkId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    return user;
  },

  /**
   * Get user by email
   * @param email - User email
   * @returns User or null
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    return user;
  },

  /**
   * List users with filtering
   * @param context - Service context with user info
   * @param filters - Optional filters
   * @returns List of users and total count
   */
  async listUsers(
    context: ServiceContext,
    filters?: {
      role?: Role;
      schoolId?: string;
      isActive?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ users: User[]; total: number }> {
    // Any staff member can list users
    requireRole(context, RoleGroups.ALL_STAFF);

    const where: Prisma.UserWhereInput = {};

    // Filter by role
    if (filters?.role) {
      where.role = filters.role;
    }

    // Filter by school - SUPER_ADMIN can see all, others only their school
    if (context.role === Role.SUPER_ADMIN) {
      if (filters?.schoolId) {
        where.schoolId = filters.schoolId;
      }
    } else {
      // Non-super admins can only see users from their school
      requireSchoolContext(context);
      where.schoolId = context.schoolId;
    }

    // Filter by active status
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Search by name or email
    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          school: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  },

  /**
   * Update user
   * @param id - User ID
   * @param data - Update data
   * @param context - Service context with user info
   * @returns Updated user
   */
  async updateUser(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      role?: Role;
      schoolId?: string | null;
      isActive?: boolean;
    },
    context: ServiceContext
  ): Promise<User> {
    // Only school admins can update users
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundError('User', id);
    }

    // Check if updater can access this user
    if (existingUser.schoolId && !canAccessSchoolResource(context, existingUser.schoolId)) {
      throw new ForbiddenError('You do not have access to update this user');
    }

    // Only SUPER_ADMIN can modify SUPER_ADMIN users
    if (existingUser.role === Role.SUPER_ADMIN && context.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only SUPER_ADMIN can modify SUPER_ADMIN users');
    }

    // Only SUPER_ADMIN can change role to SUPER_ADMIN
    if (data.role === Role.SUPER_ADMIN && context.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only SUPER_ADMIN can assign SUPER_ADMIN role');
    }

    // Only SUPER_ADMIN can remove SUPER_ADMIN role
    if (existingUser.role === Role.SUPER_ADMIN && data.role && data.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only SUPER_ADMIN can remove SUPER_ADMIN role');
    }

    // Check if user can access the target school
    if (data.schoolId && !canAccessSchoolResource(context, data.schoolId)) {
      throw new ForbiddenError('You do not have access to the target school');
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName.trim();
    }
    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName.trim();
    }
    if (data.role !== undefined) {
      updateData.role = data.role;
    }
    if (data.schoolId !== undefined) {
      updateData.school = data.schoolId ? { connect: { id: data.schoolId } } : { disconnect: true };
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return updatedUser;
  },

  /**
   * Deactivate user (soft delete alternative)
   * @param id - User ID
   * @param context - Service context with user info
   * @returns Deactivated user
   */
  async deactivateUser(id: string, context: ServiceContext): Promise<User> {
    // Only school admins can deactivate users
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundError('User', id);
    }

    // Check if deactivator can access this user
    if (existingUser.schoolId && !canAccessSchoolResource(context, existingUser.schoolId)) {
      throw new ForbiddenError('You do not have access to deactivate this user');
    }

    // Only SUPER_ADMIN can deactivate SUPER_ADMIN users
    if (existingUser.role === Role.SUPER_ADMIN && context.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only SUPER_ADMIN can deactivate SUPER_ADMIN users');
    }

    const deactivatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return deactivatedUser;
  },

  /**
   * Activate user
   * @param id - User ID
   * @param context - Service context with user info
   * @returns Activated user
   */
  async activateUser(id: string, context: ServiceContext): Promise<User> {
    // Only school admins can activate users
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundError('User', id);
    }

    // Check if activator can access this user
    if (existingUser.schoolId && !canAccessSchoolResource(context, existingUser.schoolId)) {
      throw new ForbiddenError('You do not have access to activate this user');
    }

    const activatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    return activatedUser;
  },

  /**
   * Delete user permanently
   * @param id - User ID
   * @param context - Service context with user info
   */
  async deleteUser(id: string, context: ServiceContext): Promise<void> {
    // Only SUPER_ADMIN can permanently delete users
    requireRole(context, [Role.SUPER_ADMIN]);

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundError('User', id);
    }

    await prisma.user.delete({
      where: { id },
    });
  },

  /**
   * Get current user profile
   * @param context - Service context with user info
   * @returns User profile
   */
  async getCurrentUserProfile(
    context: ServiceContext
  ): Promise<
    User & {
      school: { id: string; name: string; slug: string } | null;
    }
  > {
    const user = await prisma.user.findFirst({
      where: { id: context.userId },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User', context.userId);
    }

    return user;
  },

  /**
   * Update current user profile
   * @param data - Update data
   * @param context - Service context with user info
   * @returns Updated user
   */
  async updateCurrentUserProfile(
    data: {
      firstName?: string;
      lastName?: string;
    },
    context: ServiceContext
  ): Promise<User> {
    const updateData: Prisma.UserUpdateInput = {};

    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName.trim();
    }
    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName.trim();
    }

    const updatedUser = await prisma.user.update({
      where: { id: context.userId },
      data: updateData,
    });

    return updatedUser;
  },
};

export default UserService;
