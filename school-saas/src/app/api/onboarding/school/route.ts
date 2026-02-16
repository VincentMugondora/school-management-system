/**
 * @fileoverview School Onboarding API Route
 * @description Handles school creation during onboarding flow.
 * Validates admin privileges, ensures one-school-per-admin rule,
 * and delegates creation to SchoolService.
 *
 * @module @/app/api/onboarding/school/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { SchoolService } from '@/src/services/school.service';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';

/**
 * Zod schema for school creation validation
 */
const createSchoolSchema = z.object({
  name: z.string()
    .min(2, 'School name must be at least 2 characters')
    .max(100, 'School name must be less than 100 characters')
    .transform(val => val.trim()),

  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Slug must be lowercase, start/end with alphanumeric, and contain only letters, numbers, and hyphens')
    .optional()
    .transform(val => val?.trim().toLowerCase()),

  email: z.string()
    .email('Invalid email format')
    .optional()
    .transform(val => val?.trim()),

  phone: z.string()
    .min(5, 'Phone number must be at least 5 characters')
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .transform(val => val?.trim()),

  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must be less than 200 characters')
    .optional()
    .transform(val => val?.trim()),
});

/**
 * Type for validated school creation input
 */
type CreateSchoolInput = z.infer<typeof createSchoolSchema>;

/**
 * POST /api/onboarding/school
 *
 * Creates a new school for an authenticated admin user.
 * Enforces:
 * - User must be authenticated
 * - User must have ADMIN or SUPER_ADMIN role
 * - User must not already own a school
 * - School data passes validation
 *
 * @param request - The Next.js request with school creation data
 * @returns JSON response with created school or error details
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Authenticate user via Clerk
    const { userId: clerkId } = await getAuth(request);

    if (!clerkId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHENTICATED',
        },
        { status: 401 }
      );
    }

    // Step 2: Fetch user from database to verify role and school ownership
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        role: true,
        schoolId: true,
        email: true,
      },
    });

    // User not found in database - needs profile setup first
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User profile not found. Complete setup first.',
          code: 'USER_NOT_FOUND',
          redirectUrl: '/setup',
        },
        { status: 404 }
      );
    }

    // Step 3: Verify admin privileges
    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only administrators can create schools',
          code: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // Step 4: Prevent multiple schools per admin
    if (user.schoolId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin already owns a school. Each administrator can only create one school.',
          code: 'SCHOOL_ALREADY_EXISTS',
          existingSchoolId: user.schoolId,
        },
        { status: 409 }
      );
    }

    // Step 5: Parse and validate request body
    const body = await request.json();
    const validationResult = createSchoolSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;

      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors,
        },
        { status: 400 }
      );
    }

    const schoolData = validationResult.data;

    // Step 6: Call SchoolService to create school
    // This handles transaction, slug uniqueness, and user association
    const school = await SchoolService.createSchool(user.id, schoolData);

    // Step 7: Return success response
    return NextResponse.json(
      {
        success: true,
        school,
        message: 'School created successfully',
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('School onboarding error:', error);

    // Handle specific domain errors from SchoolService
    if (error instanceof Error) {
      // Check for known error types and map to appropriate responses
      if (error.name === 'ConflictError' || error.message.includes('already exists')) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            code: 'CONFLICT',
          },
          { status: 409 }
        );
      }

      if (error.name === 'ValidationError') {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }

      if (error.name === 'ForbiddenError') {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            code: 'FORBIDDEN',
          },
          { status: 403 }
        );
      }
    }

    // Generic error fallback
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create school. Please try again.',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
