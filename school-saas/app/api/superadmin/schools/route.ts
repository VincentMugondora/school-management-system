import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { Role, SchoolStatus } from '@prisma/client';

/**
 * POST /api/superadmin/schools
 *
 * Create a new school with initial admin user.
 * Only accessible to SUPERADMIN users.
 *
 * Features:
 * - Zod input validation
 * - Duplicate slug prevention
 * - School creation
 * - Initial admin assignment
 * - Audit log creation
 */

// Zod validation schema
const createSchoolSchema = z.object({
  name: z.string().min(1, 'School name is required').max(100, 'Name too long'),
  slug: z.string().min(1, 'Slug is required').max(50, 'Slug too long').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).default('ACTIVE'),
  initialAdmin: z.object({
    email: z.string().email('Admin email is required'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
  }).optional(),
});

type CreateSchoolInput = z.infer<typeof createSchoolSchema>;

/**
 * Check if user is SUPERADMIN
 */
async function verifySuperAdmin(clerkId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true },
  });

  return user?.role === Role.SUPER_ADMIN;
}

/**
 * Check if slug is already taken
 */
async function isSlugTaken(slug: string): Promise<boolean> {
  const existing = await prisma.school.findUnique({
    where: { slug },
    select: { id: true },
  });

  return !!existing;
}

/**
 * Create audit log entry
 */
async function createAuditLog(
  schoolId: string,
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  details?: string,
  ipAddress?: string
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      schoolId,
      userId,
      action,
      entity,
      entityId,
      details,
      ipAddress,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Verify authentication
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Step 2: Verify SUPERADMIN role
    const isSuperAdmin = await verifySuperAdmin(clerkId);

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - SUPERADMIN access required' },
        { status: 403 }
      );
    }

    // Step 3: Parse and validate request body
    const body = await request.json();

    const validationResult = createSchoolSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: 'Validation failed', errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Step 4: Check for duplicate slug
    const slugExists = await isSlugTaken(data.slug);

    if (slugExists) {
      return NextResponse.json(
        { error: 'Slug already taken', field: 'slug' },
        { status: 409 }
      );
    }

    // Step 5: Create school and initial admin in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the school
      const school = await tx.school.create({
        data: {
          name: data.name,
          slug: data.slug,
          address: data.address,
          phone: data.phone,
          email: data.email,
          status: data.status as SchoolStatus,
        },
      });

      // Create initial admin if provided
      let admin = null;
      if (data.initialAdmin) {
        // Check if email is already in use
        const existingUser = await tx.user.findUnique({
          where: { email: data.initialAdmin.email },
          select: { id: true },
        });

        if (existingUser) {
          throw new Error(`Email ${data.initialAdmin.email} is already registered`);
        }

        admin = await tx.user.create({
          data: {
            email: data.initialAdmin.email,
            firstName: data.initialAdmin.firstName,
            lastName: data.initialAdmin.lastName,
            role: Role.ADMIN,
            schoolId: school.id,
            clerkId: `pending_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // Placeholder until Clerk sync
          },
        });
      }

      return { school, admin };
    });

    // Step 6: Create audit log
    const superAdminUser = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (superAdminUser) {
      await createAuditLog(
        result.school.id,
        superAdminUser.id,
        'CREATE',
        'SCHOOL',
        result.school.id,
        `Created school "${result.school.name}"${result.admin ? ` with admin ${result.admin.email}` : ''}`,
        request.headers.get('x-forwarded-for') || undefined
      );
    }

    // Step 7: Return success response
    return NextResponse.json({
      success: true,
      data: {
        school: {
          id: result.school.id,
          name: result.school.name,
          slug: result.school.slug,
          status: result.school.status,
          createdAt: result.school.createdAt,
        },
        admin: result.admin
          ? {
              id: result.admin.id,
              email: result.admin.email,
              firstName: result.admin.firstName,
              lastName: result.admin.lastName,
              role: result.admin.role,
            }
          : null,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('[POST /api/superadmin/schools] Error:', error);

    // Handle transaction errors (like duplicate email)
    if (error instanceof Error && error.message.includes('already registered')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
