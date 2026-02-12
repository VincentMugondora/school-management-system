'use server';

import { SchoolService } from '@/services/school.service';
import {
  createSchoolSchema,
  updateSchoolSchema,
  schoolFilterSchema,
  schoolIdSchema,
  CreateSchoolInput,
  UpdateSchoolInput,
  SchoolFilterInput,
} from '@/lib/validators';
import { Role, School } from '@prisma/client';
import { ServiceContext, ServiceError } from '@/types/domain.types';
import { revalidatePath } from 'next/cache';

// ============================================
// MOCK AUTHENTICATION - Replace with Clerk when ready
// ============================================

async function getCurrentUser(): Promise<ServiceContext | null> {
  // TODO: Replace with actual Clerk authentication
  // This is a mock for development purposes
  return {
    userId: 'mock-user-id',
    schoolId: null,
    role: Role.SUPER_ADMIN,
  };
}

// ============================================
// ERROR HANDLER
// ============================================

function handleServiceError(error: unknown): { success: false; error: string } {
  if (error instanceof ServiceError) {
    return {
      success: false,
      error: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: false,
    error: 'An unexpected error occurred',
  };
}

// ============================================
// SCHOOL SERVER ACTIONS
// ============================================

/**
 * Create a new school
 * @param input - School creation data
 * @returns Created school or error
 */
export async function createSchool(
  input: CreateSchoolInput
): Promise<{ success: true; data: School } | { success: false; error: string }> {
  try {
    // Authenticate
    const context = await getCurrentUser();
    if (!context) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate input
    const validationResult = createSchoolSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues.map(e => e.message).join(', '),
      };
    }

    // Create school
    const school = await SchoolService.createSchool(validationResult.data, context);

    // Revalidate paths
    revalidatePath('/platform/schools');

    return { success: true, data: school };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Get school by ID
 * @param id - School ID
 * @returns School or error
 */
export async function getSchoolById(
  id: string
): Promise<{ success: true; data: School } | { success: false; error: string }> {
  try {
    // Authenticate
    const context = await getCurrentUser();
    if (!context) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate ID
    const validationResult = schoolIdSchema.safeParse(id);
    if (!validationResult.success) {
      return { success: false, error: 'Invalid school ID' };
    }

    // Get school
    const school = await SchoolService.getSchoolById(validationResult.data, context);

    if (!school) {
      return { success: false, error: 'School not found' };
    }

    return { success: true, data: school };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Get school by slug
 * @param slug - School slug
 * @returns School or error
 */
export async function getSchoolBySlug(
  slug: string
): Promise<{ success: true; data: School } | { success: false; error: string }> {
  try {
    // Get school (public endpoint, no auth required)
    const school = await SchoolService.getSchoolBySlug(slug);

    if (!school) {
      return { success: false, error: 'School not found' };
    }

    return { success: true, data: school };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * List schools with pagination and filtering
 * @param filters - Filter options
 * @returns Paginated list of schools or error
 */
export async function listSchools(
  filters: SchoolFilterInput
): Promise<
  | { success: true; data: School[]; pagination: { total: number; page: number; limit: number; totalPages: number } }
  | { success: false; error: string }
> {
  try {
    // Authenticate
    const context = await getCurrentUser();
    if (!context) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate filters
    const validationResult = schoolFilterSchema.safeParse(filters);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues.map(e => e.message).join(', '),
      };
    }

    const { page, limit, ...filterData } = validationResult.data;

    // Get schools
    const { schools, total } = await SchoolService.listSchools(filterData, page, limit, context);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: schools,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Update school
 * @param id - School ID
 * @param input - Update data
 * @returns Updated school or error
 */
export async function updateSchool(
  id: string,
  input: UpdateSchoolInput
): Promise<{ success: true; data: School } | { success: false; error: string }> {
  try {
    // Authenticate
    const context = await getCurrentUser();
    if (!context) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate ID
    const idValidation = schoolIdSchema.safeParse(id);
    if (!idValidation.success) {
      return { success: false, error: 'Invalid school ID' };
    }

    // Validate input
    const validationResult = updateSchoolSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues.map(e => e.message).join(', '),
      };
    }

    // Clean up null values
    const cleanData: Record<string, unknown> = {};
    const data = validationResult.data;
    if (data.name !== undefined) cleanData.name = data.name;
    if (data.address !== undefined) cleanData.address = data.address === null ? undefined : data.address;
    if (data.phone !== undefined) cleanData.phone = data.phone === null ? undefined : data.phone;
    if (data.email !== undefined) cleanData.email = data.email === null ? undefined : data.email;
    if (data.status !== undefined) cleanData.status = data.status;

    // Update school
    const school = await SchoolService.updateSchool(idValidation.data, cleanData as UpdateSchoolInput, context);

    // Revalidate paths
    revalidatePath('/platform/schools');
    revalidatePath(`/s/${school.slug}`);

    return { success: true, data: school };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Delete (suspend) a school
 * @param id - School ID
 * @returns Success or error
 */
export async function deleteSchool(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // Authenticate
    const context = await getCurrentUser();
    if (!context) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate ID
    const validationResult = schoolIdSchema.safeParse(id);
    if (!validationResult.success) {
      return { success: false, error: 'Invalid school ID' };
    }

    // Delete school
    await SchoolService.deleteSchool(validationResult.data, context);

    // Revalidate paths
    revalidatePath('/platform/schools');

    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Permanently delete a school
 * WARNING: This is destructive and cannot be undone
 * @param id - School ID
 * @returns Success or error
 */
export async function permanentlyDeleteSchool(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // Authenticate
    const context = await getCurrentUser();
    if (!context) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate ID
    const validationResult = schoolIdSchema.safeParse(id);
    if (!validationResult.success) {
      return { success: false, error: 'Invalid school ID' };
    }

    // Permanently delete school
    await SchoolService.permanentlyDeleteSchool(validationResult.data, context);

    // Revalidate paths
    revalidatePath('/platform/schools');

    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}
