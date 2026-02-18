'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { Role, SchoolStatus, UserStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

/**
 * Create School with Initial Admin Server Action
 *
 * Creates a new school and assigns an initial admin user.
 * Only accessible to SUPERADMIN users.
 *
 * @action app/dashboard/superadmin/schools/new/actions.ts
 */

// Validation schema
const createSchoolSchema = z.object({
  // School fields
  schoolName: z.string().min(2, 'School name must be at least 2 characters'),
  schoolSlug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  schoolEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  schoolPhone: z.string().optional().or(z.literal('')),
  schoolAddress: z.string().optional().or(z.literal('')),

  // Admin fields
  adminEmail: z.string().email('Invalid admin email'),
  adminFirstName: z.string().min(1, 'First name is required'),
  adminLastName: z.string().min(1, 'Last name is required'),
  adminClerkId: z.string().min(1, 'Clerk ID is required'),
});

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;

export interface CreateSchoolResult {
  success: boolean;
  data?: {
    schoolId: string;
    adminId: string;
  };
  error?: string;
  fieldErrors?: Record<string, string>;
}

async function verifySuperAdmin(clerkId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true },
  });
  return user?.role === Role.SUPER_ADMIN;
}

export async function createSchoolWithAdmin(
  input: CreateSchoolInput
): Promise<CreateSchoolResult> {
  try {
    // Verify SuperAdmin access
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return { success: false, error: 'Unauthorized' };
    }

    const isSuperAdmin = await verifySuperAdmin(clerkId);
    if (!isSuperAdmin) {
      return { success: false, error: 'Forbidden - SuperAdmin access required' };
    }

    // Validate input
    const validationResult = createSchoolSchema.safeParse(input);
    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      return { success: false, error: 'Validation failed', fieldErrors };
    }

    const data = validationResult.data;

    // Check for duplicate school slug
    const existingSchool = await prisma.school.findUnique({
      where: { slug: data.schoolSlug },
    });

    if (existingSchool) {
      return {
        success: false,
        error: 'A school with this slug already exists',
        fieldErrors: { schoolSlug: 'This slug is already taken' },
      };
    }

    // Check for duplicate admin email
    const existingAdmin = await prisma.user.findUnique({
      where: { email: data.adminEmail },
    });

    if (existingAdmin) {
      return {
        success: false,
        error: 'An admin with this email already exists',
        fieldErrors: { adminEmail: 'This email is already registered' },
      };
    }

    // Create school and admin in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the school
      const school = await tx.school.create({
        data: {
          name: data.schoolName,
          slug: data.schoolSlug,
          email: data.schoolEmail || null,
          phone: data.schoolPhone || null,
          address: data.schoolAddress || null,
          status: SchoolStatus.ACTIVE,
        },
      });

      // Create the admin user
      const admin = await tx.user.create({
        data: {
          clerkId: data.adminClerkId,
          email: data.adminEmail,
          firstName: data.adminFirstName,
          lastName: data.adminLastName,
          role: Role.ADMIN,
          status: UserStatus.APPROVED,
          approvedAt: new Date(),
          schoolId: school.id,
          isActive: true,
        },
      });

      // Create audit log for school creation
      await tx.auditLog.create({
        data: {
          action: 'SCHOOL_CREATED',
          entityType: 'School',
          entityId: school.id,
          performedBy: clerkId,
          details: {
            schoolName: school.name,
            schoolSlug: school.slug,
            adminId: admin.id,
            adminEmail: admin.email,
          },
        },
      });

      // Create audit log for admin assignment
      await tx.auditLog.create({
        data: {
          action: 'ADMIN_CREATED',
          entityType: 'User',
          entityId: admin.id,
          performedBy: clerkId,
          details: {
            schoolId: school.id,
            schoolName: school.name,
            adminEmail: admin.email,
            adminName: `${admin.firstName} ${admin.lastName}`,
          },
        },
      });

      return { school, admin };
    });

    // Revalidate paths
    revalidatePath('/dashboard/superadmin/schools');
    revalidatePath('/dashboard/superadmin');

    return {
      success: true,
      data: {
        schoolId: result.school.id,
        adminId: result.admin.id,
      },
    };
  } catch (error) {
    console.error('Error creating school:', error);
    return {
      success: false,
      error: 'Failed to create school. Please try again.',
    };
  }
}
