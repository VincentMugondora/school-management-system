'use server';

import { prisma } from '@/lib/db';
import { StudentService } from '@/services/student.service';
import { EnrollmentService } from '@/services/enrollment.service';
import {
  createStudentSchema,
  updateStudentSchema,
  studentIdSchema,
  studentFilterSchema,
  createEnrollmentSchema,
  updateEnrollmentSchema,
  enrollmentIdSchema,
  CreateStudentInput,
  UpdateStudentInput,
  CreateEnrollmentInput,
  UpdateEnrollmentInput,
} from '@/lib/validators';
import { Student, Enrollment, EnrollmentStatus, Gender, Role } from '@prisma/client';
import { ServiceContext, ServiceError } from '@/types/domain.types';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';

// ============================================
// AUTHENTICATION - Using Clerk
// ============================================

async function getCurrentUser(): Promise<ServiceContext | null> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return null;
  }

  // Find user by clerkId with school relation
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      schoolId: true,
      role: true,
    },
  });

  if (!user || !user.schoolId) {
    return null;
  }

  return {
    userId: user.id,
    schoolId: user.schoolId,
    role: user.role,
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
type StudentParent = { id: string; user: { firstName: string; lastName: string } };
type StudentEnrollment = { id: string; status: string; academicYear: { name: string }; class: { name: string } };
type StudentCount = { enrollments: number; results: number; attendances: number };
type StudentWithRelations = Student & {
  parent: StudentParent | null;
  enrollments: StudentEnrollment[];
  _count: StudentCount;
};

// ============================================
// STUDENT SERVER ACTIONS
// ============================================

/**
 * Create a new student
 */
export async function createStudent(
  input: CreateStudentInput
): Promise<{ success: true; data: Student } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const validation = createStudentSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    const student = await StudentService.createStudent(validation.data, context);
    revalidatePath('/students');
    return { success: true, data: student };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Get student by ID
 */
export async function getStudentById(
  id: string
): Promise<{ success: true; data: StudentWithRelations } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = studentIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid student ID' };

    const student = await StudentService.getStudentById(idValidation.data, context);
    if (!student) return { success: false, error: 'Student not found' };

    return { success: true, data: student };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * List students
 */
export async function listStudents(
  filters?: {
    search?: string;
    gender?: Gender;
    hasParent?: boolean;
    page?: number;
    limit?: number;
  }
): Promise<{ success: true; data: { students: Student[]; total: number } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    console.log('[listStudents] Context:', context);
    
    if (!context) {
      console.log('[listStudents] No context - returning Unauthorized');
      return { success: false, error: 'Unauthorized' };
    }

    const result = await StudentService.listStudents(context, filters);
    console.log(`[listStudents] Found ${result.total} students for school ${context.schoolId}`);
    return { success: true, data: result };
  } catch (error) {
    console.error('[listStudents] Error:', error);
    return handleServiceError(error);
  }
}

/**
 * Update student
 */
export async function updateStudent(
  id: string,
  input: UpdateStudentInput
): Promise<{ success: true; data: Student } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = studentIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid student ID' };

    const validation = updateStudentSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    const student = await StudentService.updateStudent(idValidation.data, validation.data, context);
    revalidatePath('/students');
    return { success: true, data: student };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Soft delete student
 */
export async function deleteStudent(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = studentIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid student ID' };

    await StudentService.deleteStudent(idValidation.data, context);
    revalidatePath('/students');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Restore soft-deleted student
 */
export async function restoreStudent(
  id: string
): Promise<{ success: true; data: Student } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = studentIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid student ID' };

    const student = await StudentService.restoreStudent(idValidation.data, context);
    revalidatePath('/students');
    return { success: true, data: student };
  } catch (error) {
    return handleServiceError(error);
  }
}

// ============================================
// ENROLLMENT SERVER ACTIONS
// ============================================

type EnrollmentStudent = { id: string; firstName: string; lastName: string; studentId: string | null };
type EnrollmentYear = { id: string; name: string };
type EnrollmentClass = { id: string; name: string; grade: string };
type EnrollmentCount = { results: number; attendances: number; invoices: number };
type EnrollmentWithRelations = Enrollment & {
  student: EnrollmentStudent;
  academicYear: EnrollmentYear;
  class: EnrollmentClass;
  _count: EnrollmentCount;
};

/**
 * Create a new enrollment
 */
export async function createEnrollment(
  input: CreateEnrollmentInput
): Promise<{ success: true; data: Enrollment } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const validation = createEnrollmentSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    const enrollment = await EnrollmentService.createEnrollment(validation.data, context);
    revalidatePath('/enrollments');
    return { success: true, data: enrollment };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Get enrollment by ID
 */
export async function getEnrollmentById(
  id: string
): Promise<{ success: true; data: EnrollmentWithRelations } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = enrollmentIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid enrollment ID' };

    const enrollment = await EnrollmentService.getEnrollmentById(idValidation.data, context);
    if (!enrollment) return { success: false, error: 'Enrollment not found' };

    return { success: true, data: enrollment };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * List enrollments by student
 */
export async function listEnrollmentsByStudent(
  studentId: string
): Promise<{ success: true; data: Enrollment[] } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = studentIdSchema.safeParse(studentId);
    if (!idValidation.success) return { success: false, error: 'Invalid student ID' };

    const enrollments = await EnrollmentService.listEnrollmentsByStudent(idValidation.data, context);
    return { success: true, data: enrollments };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * List enrollments by class
 */
export async function listEnrollmentsByClass(
  classId: string,
  status?: EnrollmentStatus
): Promise<{ success: true; data: (Enrollment & { student: { firstName: string; lastName: string; studentId: string | null } })[] } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const enrollments = await EnrollmentService.listEnrollmentsByClass(classId, context, status);
    return { success: true, data: enrollments };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * List enrollments by academic year
 */
export async function listEnrollmentsByAcademicYear(
  academicYearId: string,
  status?: EnrollmentStatus
): Promise<{ success: true; data: (Enrollment & { student: { firstName: string; lastName: string; studentId: string | null }; class: { name: string; grade: string } })[] } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const enrollments = await EnrollmentService.listEnrollmentsByAcademicYear(academicYearId, context, status);
    return { success: true, data: enrollments };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Update enrollment
 */
export async function updateEnrollment(
  id: string,
  input: UpdateEnrollmentInput
): Promise<{ success: true; data: Enrollment } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = enrollmentIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid enrollment ID' };

    const validation = updateEnrollmentSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    const enrollment = await EnrollmentService.updateEnrollment(idValidation.data, validation.data, context);
    revalidatePath('/enrollments');
    return { success: true, data: enrollment };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Transfer student to another class
 */
export async function transferStudent(
  enrollmentId: string,
  newClassId: string
): Promise<{ success: true; data: Enrollment } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = enrollmentIdSchema.safeParse(enrollmentId);
    if (!idValidation.success) return { success: false, error: 'Invalid enrollment ID' };

    const enrollment = await EnrollmentService.transferStudent(idValidation.data, newClassId, context);
    revalidatePath('/enrollments');
    return { success: true, data: enrollment };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Drop enrollment
 */
export async function dropEnrollment(
  id: string
): Promise<{ success: true; data: Enrollment } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = enrollmentIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid enrollment ID' };

    const enrollment = await EnrollmentService.dropEnrollment(idValidation.data, context);
    revalidatePath('/enrollments');
    return { success: true, data: enrollment };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Complete enrollment
 */
export async function completeEnrollment(
  id: string
): Promise<{ success: true; data: Enrollment } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = enrollmentIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid enrollment ID' };

    const enrollment = await EnrollmentService.completeEnrollment(idValidation.data, context);
    revalidatePath('/enrollments');
    return { success: true, data: enrollment };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Promote students to next academic year
 */
export async function promoteStudents(
  input: {
    studentIds: string[];
    targetAcademicYearId: string;
    targetClassId: string;
    markPreviousAsCompleted?: boolean;
  }
): Promise<{ success: true; data: Enrollment[] } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const enrollments = await EnrollmentService.promoteStudents(input, context);
    revalidatePath('/enrollments');
    return { success: true, data: enrollments };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Bulk create enrollments
 */
export async function bulkCreateEnrollments(
  data: {
    studentId: string;
    academicYearId: string;
    classId: string;
    status?: EnrollmentStatus;
  }[]
): Promise<{ success: true; data: { enrollments: Enrollment[]; errors: { studentId: string; error: string }[] } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const result = await EnrollmentService.bulkCreateEnrollments(data, context);
    revalidatePath('/enrollments');
    return { success: true, data: result };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Mark previous enrollments as completed for a student
 */
export async function markPreviousEnrollmentsAsCompleted(
  studentId: string
): Promise<{ success: true; data: { count: number } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = studentIdSchema.safeParse(studentId);
    if (!idValidation.success) return { success: false, error: 'Invalid student ID' };

    const count = await EnrollmentService.markPreviousEnrollmentsAsCompleted(idValidation.data, context);
    revalidatePath('/enrollments');
    return { success: true, data: { count } };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Delete enrollment
 */
export async function deleteEnrollment(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = enrollmentIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid enrollment ID' };

    await EnrollmentService.deleteEnrollment(idValidation.data, context);
    revalidatePath('/enrollments');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}

// ============================================
// STUDENT PROFILE TAB ACTIONS
// ============================================

/**
 * Get student academic history
 */
export async function getStudentAcademicHistory(
  studentId: string
): Promise<{ success: true; data: Awaited<ReturnType<typeof StudentService.getStudentAcademicHistory>> } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const history = await StudentService.getStudentAcademicHistory(studentId, context);
    return { success: true, data: history };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Get student attendance summary
 */
export async function getStudentAttendance(
  studentId: string
): Promise<{ success: true; data: Awaited<ReturnType<typeof StudentService.getStudentAttendance>> } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const attendance = await StudentService.getStudentAttendance(studentId, context);
    return { success: true, data: attendance };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Get student results
 */
export async function getStudentResults(
  studentId: string
): Promise<{ success: true; data: Awaited<ReturnType<typeof StudentService.getStudentResults>> } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const results = await StudentService.getStudentResults(studentId, context);
    return { success: true, data: results };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Get student fees
 */
export async function getStudentFees(
  studentId: string
): Promise<{ success: true; data: Awaited<ReturnType<typeof StudentService.getStudentFees>> } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const fees = await StudentService.getStudentFees(studentId, context);
    return { success: true, data: fees };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Get student guardians
 */
export async function getStudentGuardians(
  studentId: string
): Promise<{ success: true; data: Awaited<ReturnType<typeof StudentService.getStudentGuardians>> } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const guardians = await StudentService.getStudentGuardians(studentId, context);
    return { success: true, data: guardians };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Suspend student
 */
export async function suspendStudent(
  studentId: string,
  reason: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    await StudentService.suspendStudent(studentId, reason, context);
    revalidatePath(`/admin/students/${studentId}`);
    revalidatePath('/admin/students');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Reactivate student
 */
export async function reactivateStudent(
  studentId: string,
  classId: string,
  academicYearId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    await StudentService.reactivateStudent(studentId, classId, academicYearId, context);
    revalidatePath(`/admin/students/${studentId}`);
    revalidatePath('/admin/students');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}
