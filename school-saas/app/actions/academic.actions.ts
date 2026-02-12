'use server';

import { AcademicYearService } from '@/services/academicYear.service';
import { TermService } from '@/services/term.service';
import {
  createAcademicYearSchema,
  updateAcademicYearSchema,
  academicYearIdSchema,
  createTermSchema,
  updateTermSchema,
  termIdSchema,
  CreateAcademicYearInput,
  UpdateAcademicYearInput,
  CreateTermInput,
  UpdateTermInput,
} from '@/lib/validators';
import { AcademicYear, Term, AcademicYearStatus, TermStatus, Role } from '@prisma/client';
import { ServiceContext, ServiceError } from '@/types/domain.types';
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
type TermSummary = { id: string; name: string; status: string };
type AcademicYearCount = { classes: number; enrollments: number };
type TermCount = { exams: number; attendances: number; invoices: number };
type AcademicYearWithRelations = AcademicYear & {
  terms: TermSummary[];
  _count: AcademicYearCount;
};
type TermWithRelations = Term & {
  academicYear: { id: string; name: string };
  _count: TermCount;
};

// ============================================
// ACADEMIC YEAR SERVER ACTIONS
// ============================================

/**
 * Create a new academic year
 */
export async function createAcademicYear(
  input: CreateAcademicYearInput
): Promise<{ success: true; data: AcademicYear } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const validation = createAcademicYearSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    const academicYear = await AcademicYearService.createAcademicYear(validation.data, context);
    revalidatePath('/academics/years');
    return { success: true, data: academicYear };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Get academic year by ID
 */
export async function getAcademicYearById(
  id: string
): Promise<{ success: true; data: AcademicYear & { terms: any[]; _count: any } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = academicYearIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid academic year ID' };

    const academicYear = await AcademicYearService.getAcademicYearById(idValidation.data, context);
    if (!academicYear) return { success: false, error: 'Academic year not found' };

    return { success: true, data: academicYear };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Get current academic year
 */
export async function getCurrentAcademicYear(
  schoolId: string
): Promise<{ success: true; data: AcademicYear | null } | { success: false; error: string }> {
  try {
    const academicYear = await AcademicYearService.getCurrentAcademicYear(schoolId);
    return { success: true, data: academicYear };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * List academic years
 */
export async function listAcademicYears(
  status?: AcademicYearStatus
): Promise<{ success: true; data: AcademicYear[] } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const academicYears = await AcademicYearService.listAcademicYears(context, status);
    return { success: true, data: academicYears };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Update academic year
 */
export async function updateAcademicYear(
  id: string,
  input: UpdateAcademicYearInput
): Promise<{ success: true; data: AcademicYear } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = academicYearIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid academic year ID' };

    const validation = updateAcademicYearSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    const academicYear = await AcademicYearService.updateAcademicYear(idValidation.data, validation.data, context);
    revalidatePath('/academics/years');
    return { success: true, data: academicYear };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Set academic year as current
 */
export async function setAcademicYearAsCurrent(
  id: string
): Promise<{ success: true; data: AcademicYear } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = academicYearIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid academic year ID' };

    const academicYear = await AcademicYearService.setAsCurrent(idValidation.data, context);
    revalidatePath('/academics/years');
    return { success: true, data: academicYear };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Delete academic year
 */
export async function deleteAcademicYear(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = academicYearIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid academic year ID' };

    await AcademicYearService.deleteAcademicYear(idValidation.data, context);
    revalidatePath('/academics/years');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}

// ============================================
// TERM SERVER ACTIONS
// ============================================

/**
 * Create a new term
 */
export async function createTerm(
  input: CreateTermInput
): Promise<{ success: true; data: Term } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const validation = createTermSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    const term = await TermService.createTerm(validation.data, context);
    revalidatePath('/academics/terms');
    return { success: true, data: term };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Get term by ID
 */
export async function getTermById(
  id: string
): Promise<{ success: true; data: Term & { academicYear: any; _count: any } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = termIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid term ID' };

    const term = await TermService.getTermById(idValidation.data, context);
    if (!term) return { success: false, error: 'Term not found' };

    return { success: true, data: term };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * List terms by academic year
 */
export async function listTermsByAcademicYear(
  academicYearId: string
): Promise<{ success: true; data: Term[] } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = academicYearIdSchema.safeParse(academicYearId);
    if (!idValidation.success) return { success: false, error: 'Invalid academic year ID' };

    const terms = await TermService.listTermsByAcademicYear(idValidation.data, context);
    return { success: true, data: terms };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * List all terms
 */
export async function listTerms(
  status?: TermStatus
): Promise<{ success: true; data: (Term & { academicYear: any })[] } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const terms = await TermService.listTerms(context, status);
    return { success: true, data: terms };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Update term
 */
export async function updateTerm(
  id: string,
  input: UpdateTermInput
): Promise<{ success: true; data: Term } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = termIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid term ID' };

    const validation = updateTermSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    const term = await TermService.updateTerm(idValidation.data, validation.data, context);
    revalidatePath('/academics/terms');
    return { success: true, data: term };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Lock term
 */
export async function lockTerm(
  id: string
): Promise<{ success: true; data: Term } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = termIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid term ID' };

    const term = await TermService.lockTerm(idValidation.data, context);
    revalidatePath('/academics/terms');
    return { success: true, data: term };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Unlock term
 */
export async function unlockTerm(
  id: string
): Promise<{ success: true; data: Term } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = termIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid term ID' };

    const term = await TermService.unlockTerm(idValidation.data, context);
    revalidatePath('/academics/terms');
    return { success: true, data: term };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Delete term
 */
export async function deleteTerm(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = termIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid term ID' };

    await TermService.deleteTerm(idValidation.data, context);
    revalidatePath('/academics/terms');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}
