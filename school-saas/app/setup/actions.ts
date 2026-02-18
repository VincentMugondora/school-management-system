'use server';

import { prisma } from '@/lib/db';
import { Role, UserStatus } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * Validation schema for user profile creation
 */
const createUserProfileSchema = z.object({
  clerkId: z.string().min(1, 'Clerk ID is required'),
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  schoolId: z.string().optional(),
  schoolName: z.string().optional(),
  isFirstUser: z.boolean().default(false),
});

export interface CreateUserProfileInput {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: Role;
  schoolId?: string;
  schoolName?: string;
  isFirstUser?: boolean;
}

export interface CreateUserProfileResult {
  success: boolean;
  data?: {
    id: string;
    email: string;
    role: Role;
    status: UserStatus;
    schoolId?: string | null;
  };
  error?: string;
  code?: string;
}

/**
 * Create user profile during setup with approval lifecycle
 * 
 * Rules:
 * - First user becomes SUPER_ADMIN and is auto-approved
 * - Subsequent users default to STUDENT role with PENDING status
 * - Users can request to join a school (pending approval)
 * - Users can specify a role (subject to approval for non-student roles)
 * - Clerk metadata is synced with DB userId
 * 
 * @param input User profile creation data
 * @returns CreateUserProfileResult with user data or error
 */
export async function createUserProfile(
  input: CreateUserProfileInput
): Promise<CreateUserProfileResult> {
  try {
    // Validate input with Zod
    const validationResult = createUserProfileSchema.safeParse(input);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      const errorMessage = Object.entries(errors)
        .map(([field, msgs]) => `${field}: ${msgs?.join(', ')}`)
        .join('; ');
      return {
        success: false,
        error: `Validation failed: ${errorMessage}`,
        code: 'VALIDATION_ERROR',
      };
    }

    const { clerkId, email, firstName, lastName, phone, role, schoolId, schoolName, isFirstUser } =
      validationResult.data;

    // Check if user already exists by clerkId
    const existingUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'User profile already exists',
        code: 'ALREADY_EXISTS',
      };
    }

    // Check if email is already taken
    const existingByEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingByEmail) {
      return {
        success: false,
        error: 'Email address is already registered',
        code: 'EMAIL_EXISTS',
      };
    }

    // Determine role and approval status
    let userRole: Role;
    let userStatus: UserStatus;
    let userSchoolId: string | null = null;
    let approvedAt: Date | null = null;

    if (isFirstUser) {
      // First user is always SUPER_ADMIN and auto-approved
      userRole = Role.SUPER_ADMIN;
      userStatus = UserStatus.APPROVED;
      approvedAt = new Date();

      // Create school for first user if school name provided
      if (schoolName) {
        try {
          const school = await prisma.school.create({
            data: {
              name: schoolName.trim(),
              slug: schoolName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, ''),
              email: email,
              phone: phone || null,
              status: 'ACTIVE',
            },
          });
          userSchoolId = school.id;
        } catch (error) {
          console.error('Failed to create school:', error);
          return {
            success: false,
            error: 'Failed to create school. Please try again.',
            code: 'SCHOOL_CREATION_FAILED',
          };
        }
      }
    } else {
      // Subsequent users
      userRole = role || Role.STUDENT;
      
      // Validate school if provided
      if (schoolId) {
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
        });

        if (!school) {
          return {
            success: false,
            error: 'Selected school not found',
            code: 'SCHOOL_NOT_FOUND',
          };
        }

        if (school.status !== 'ACTIVE') {
          return {
            success: false,
            error: 'Selected school is not currently accepting new users',
            code: 'SCHOOL_INACTIVE',
          };
        }

        userSchoolId = school.id;
      }

      // All non-super-admin users start as PENDING
      userStatus = UserStatus.PENDING;
    }

    // Create user in database
    const user = await prisma.user.create({
      data: {
        clerkId,
        email,
        firstName,
        lastName,
        role: userRole,
        status: userStatus,
        schoolId: userSchoolId,
        approvedAt,
        isActive: true,
      },
    });

    // Sync with Clerk metadata
    try {
      const clerk = await clerkClient();
      await clerk.users.updateUser(clerkId, {
        publicMetadata: {
          dbUserId: user.id,
          role: userRole,
          status: userStatus,
          schoolId: userSchoolId,
        },
        privateMetadata: {
          approvedAt: approvedAt?.toISOString() || null,
        },
      });
    } catch (clerkError) {
      console.error('Failed to sync with Clerk:', clerkError);
      // Don't fail the whole operation if Clerk sync fails
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        entity: 'USER',
        entityId: user.id,
        details: `User ${email} registered as ${userRole} with status ${userStatus}`,
        schoolId: userSchoolId || undefined,
      },
    });

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        schoolId: user.schoolId,
      },
    };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while creating your profile',
      code: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Get available schools for user to join
 * Used during setup to show school selection options
 */
export async function getAvailableSchools(): Promise<{
  success: boolean;
  schools?: { id: string; name: string; slug: string }[];
  error?: string;
}> {
  try {
    const schools = await prisma.school.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });

    return { success: true, schools };
  } catch (error) {
    console.error('Error fetching schools:', error);
    return {
      success: false,
      error: 'Failed to fetch available schools',
    };
  }
}

/**
 * Check if user is approved
 * Used by client components to check approval status
 */
export async function checkUserApproval(): Promise<{
  success: boolean;
  status?: UserStatus;
  isApproved?: boolean;
  error?: string;
}> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { status: true },
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    return {
      success: true,
      status: user.status,
      isApproved: user.status === UserStatus.APPROVED,
    };
  } catch (error) {
    console.error('Error checking user approval:', error);
    return {
      success: false,
      error: 'Failed to check approval status',
    };
  }
}
