'use server';

import { prisma } from '@/lib/db';
import { TeacherService } from '@/services/teacher.service';
import { ClassService } from '@/services/class.service';
import { SubjectService } from '@/services/subject.service';
import { createUser } from '@/app/actions/user.actions';
import {
  createTeacherSchema,
  updateTeacherSchema,
  teacherIdSchema,
  createClassSchema,
  updateClassSchema,
  classIdSchema,
  createSubjectSchema,
  updateSubjectSchema,
  subjectIdSchema,
  assignTeacherToClassSchema,
  assignTeacherToSubjectSchema,
  assignSubjectToClassSchema,
} from '@/lib/validators';
import { Teacher, Class, Subject, Role } from '@prisma/client';
import { ServiceContext, ServiceError } from '@/types/domain.types';
import { revalidatePath } from 'next/cache';

// ============================================
// MOCK AUTHENTICATION - Replace with Clerk when ready
// ============================================

async function getCurrentUser(): Promise<ServiceContext | null> {
  // Fetch or create the first available school from the database
  let school = await prisma.school.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });

  // Auto-create a default school if none exists
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: 'Default School',
        slug: 'default-school',
        status: 'ACTIVE',
      },
    });
  }

  return {
    userId: 'mock-user-id',
    schoolId: school.id,
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

// ============================================
// TEACHER SERVER ACTIONS
// ============================================

export async function createTeacher(
  input: { firstName: string; lastName: string; email: string; employeeId?: string; phone?: string; specialization?: string }
): Promise<{ success: true; data: Teacher } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context || !context.schoolId) return { success: false, error: 'Unauthorized' };

    // First, create a User with TEACHER role
    const userResult = await createUser({
      clerkId: `teacher-${Date.now()}`, // Generate a unique clerkId
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      role: Role.TEACHER,
      schoolId: context.schoolId,
    });

    if (!userResult.success) {
      return { success: false, error: `Failed to create user: ${userResult.error}` };
    }

    const userId = userResult.data.id;

    // Now create the Teacher with the new userId
    const validation = createTeacherSchema.safeParse({
      userId,
      employeeId: input.employeeId,
    });
    
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    const teacher = await TeacherService.createTeacher(validation.data, context);
    revalidatePath('/teachers');
    return { success: true, data: teacher };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function getTeacherById(
  id: string
): Promise<{ success: true; data: Teacher & { user: any; classes: any[]; subjects: any[] } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = teacherIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid teacher ID' };

    const teacher = await TeacherService.getTeacherById(idValidation.data, context);
    if (!teacher) return { success: false, error: 'Teacher not found' };

    return { success: true, data: teacher };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function listTeachers(
  filters?: { search?: string; page?: number; limit?: number }
): Promise<{ success: true; data: { teachers: Teacher[]; total: number } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const result = await TeacherService.listTeachers(context, filters);
    return { success: true, data: result };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function updateTeacher(
  id: string,
  input: { employeeId?: string | null }
): Promise<{ success: true; data: Teacher } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = teacherIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid teacher ID' };

    const validation = updateTeacherSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    const teacher = await TeacherService.updateTeacher(idValidation.data, validation.data, context);
    revalidatePath('/teachers');
    return { success: true, data: teacher };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function deleteTeacher(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = teacherIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid teacher ID' };

    await TeacherService.deleteTeacher(idValidation.data, context);
    revalidatePath('/teachers');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}

// ============================================
// TEACHER ASSIGNMENT ACTIONS
// ============================================

export async function assignTeacherToClass(
  input: { teacherId: string; classId: string }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const validation = assignTeacherToClassSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    await TeacherService.assignTeacherToClass(input.teacherId, input.classId, context);
    revalidatePath('/classes');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function removeTeacherFromClass(
  classId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    await TeacherService.removeTeacherFromClass(classId, context);
    revalidatePath('/classes');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function assignTeacherToSubject(
  input: { teacherId: string; subjectId: string }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const validation = assignTeacherToSubjectSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    await TeacherService.assignTeacherToSubject(input.teacherId, input.subjectId, context);
    revalidatePath('/subjects');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function removeTeacherFromSubject(
  teacherId: string,
  subjectId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    await TeacherService.removeTeacherFromSubject(teacherId, subjectId, context);
    revalidatePath('/subjects');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function getTeacherDashboard(): Promise<
  { success: true; data: { assignedClasses: any[]; assignedSubjects: any[] } } | { success: false; error: string }
> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const data = await TeacherService.getTeacherDashboard(context);
    return { success: true, data };
  } catch (error) {
    return handleServiceError(error);
  }
}

// ============================================
// CLASS SERVER ACTIONS
// ============================================

export async function createClass(
  input: { name: string; grade: string; stream?: string; academicYearId?: string; classTeacherId?: string }
): Promise<{ success: true; data: Class } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context || !context.schoolId) return { success: false, error: 'Unauthorized' };

    // Auto-create academic year if not provided
    let academicYearId = input.academicYearId;
    if (!academicYearId) {
      const currentYear = new Date().getFullYear();
      const yearName = `${currentYear}-${currentYear + 1}`;
      
      let academicYear = await prisma.academicYear.findFirst({
        where: { 
          schoolId: context.schoolId,
          name: yearName,
        },
      });
      
      if (!academicYear) {
        academicYear = await prisma.academicYear.create({
          data: {
            name: yearName,
            startDate: new Date(`${currentYear}-09-01`),
            endDate: new Date(`${currentYear + 1}-08-31`),
            schoolId: context.schoolId!,
            isCurrent: true,
          },
        });
      }
      
      academicYearId = academicYear.id;
    }

    const classData = {
      name: input.name,
      grade: input.grade,
      stream: input.stream,
      academicYearId,
      classTeacherId: input.classTeacherId,
    };

    const validation = createClassSchema.safeParse(classData);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    const classRecord = await ClassService.createClass(validation.data, context);
    revalidatePath('/classes');
    return { success: true, data: classRecord };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function getClassById(
  id: string
): Promise<{ success: true; data: Class & { academicYear: any; classTeacher: any; subjects: any[]; _count: any } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = classIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid class ID' };

    const classRecord = await ClassService.getClassById(idValidation.data, context);
    if (!classRecord) return { success: false, error: 'Class not found' };

    return { success: true, data: classRecord };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function listClasses(
  filters?: { academicYearId?: string; grade?: string; classTeacherId?: string; search?: string; page?: number; limit?: number }
): Promise<{ success: true; data: { classes: Class[]; total: number } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const result = await ClassService.listClasses(context, filters);
    return { success: true, data: result };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function updateClass(
  id: string,
  input: { name?: string; grade?: string; stream?: string | null; classTeacherId?: string | null }
): Promise<{ success: true; data: Class } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = classIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid class ID' };

    const validation = updateClassSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    const classRecord = await ClassService.updateClass(idValidation.data, validation.data, context);
    revalidatePath('/classes');
    return { success: true, data: classRecord };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function deleteClass(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = classIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid class ID' };

    await ClassService.deleteClass(idValidation.data, context);
    revalidatePath('/classes');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function assignSubjectToClass(
  input: { classId: string; subjectId: string; teacherId?: string }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const validation = assignSubjectToClassSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    await ClassService.assignSubjectToClass(input.classId, input.subjectId, input.teacherId || null, context);
    revalidatePath('/classes');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function removeSubjectFromClass(
  classId: string,
  subjectId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    await ClassService.removeSubjectFromClass(classId, subjectId, context);
    revalidatePath('/classes');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}

// ============================================
// SUBJECT SERVER ACTIONS
// ============================================

export async function createSubject(
  input: { name: string; code?: string }
): Promise<{ success: true; data: Subject } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const validation = createSubjectSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    const subject = await SubjectService.createSubject(validation.data, context);
    revalidatePath('/subjects');
    return { success: true, data: subject };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function getSubjectById(
  id: string
): Promise<{ success: true; data: Subject & { teachers: any[]; classes: any[]; _count: any } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = subjectIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid subject ID' };

    const subject = await SubjectService.getSubjectById(idValidation.data, context);
    if (!subject) return { success: false, error: 'Subject not found' };

    return { success: true, data: subject };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function listSubjects(
  filters?: { search?: string; teacherId?: string; page?: number; limit?: number }
): Promise<{ success: true; data: { subjects: Subject[]; total: number } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const result = await SubjectService.listSubjects(context, filters);
    return { success: true, data: result };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function updateSubject(
  id: string,
  input: { name?: string; code?: string | null }
): Promise<{ success: true; data: Subject } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = subjectIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid subject ID' };

    const validation = updateSubjectSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
    }

    const subject = await SubjectService.updateSubject(idValidation.data, validation.data, context);
    revalidatePath('/subjects');
    return { success: true, data: subject };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function deleteSubject(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = subjectIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid subject ID' };

    await SubjectService.deleteSubject(idValidation.data, context);
    revalidatePath('/subjects');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}

// ============================================
// EXAM SERVER ACTIONS
// ============================================

export async function createExam(
  input: { name: string; subjectId: string; classId: string; date: Date; maxMarks: number }
): Promise<{ success: true; data: { id: string } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context || !context.schoolId) return { success: false, error: 'Unauthorized' };

    // Get class info for academicYearId
    const classRecord = await prisma.class.findUnique({
      where: { id: input.classId },
      select: { academicYearId: true },
    });
    if (!classRecord) return { success: false, error: 'Class not found' };

    // Get or create term
    let term = await prisma.term.findFirst({
      where: { academicYearId: classRecord.academicYearId },
    });
    if (!term) {
      term = await prisma.term.create({
        data: {
          name: 'Term 1',
          academicYearId: classRecord.academicYearId,
          schoolId: context.schoolId,
          startDate: new Date(),
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
        },
      });
    }

    // Create exam record
    const exam = await prisma.exam.create({
      data: {
        name: input.name,
        subjectId: input.subjectId,
        classId: input.classId,
        examDate: input.date,
        maxMarks: input.maxMarks,
        schoolId: context.schoolId,
        academicYearId: classRecord.academicYearId,
        termId: term.id,
      },
    });

    revalidatePath('/exams');
    return { success: true, data: { id: exam.id } };
  } catch (error) {
    return handleServiceError(error);
  }
}
