'use server';

import { ExamService } from '@/services/exam.service';
import { ResultService } from '@/services/result.service';
import { AttendanceService } from '@/services/attendance.service';
import {
  createExamSchema,
  updateExamSchema,
  examIdSchema,
  createResultSchema,
  updateResultSchema,
  resultIdSchema,
  bulkEnterResultsSchema,
  markAttendanceSchema,
  bulkUpdateAttendanceSchema,
  attendanceIdSchema,
} from '@/lib/validators';
import { Exam, Result, Attendance, Role } from '@prisma/client';
import { ServiceContext, ServiceError } from '@/types/domain.types';
import { revalidatePath } from 'next/cache';

// ============================================
// MOCK AUTHENTICATION - Replace with Clerk when ready
// ============================================

async function getCurrentUser(): Promise<ServiceContext | null> {
  return {
    userId: 'mock-user-id',
    schoolId: 'mock-school-id',
    role: Role.TEACHER,
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
// EXAM SERVER ACTIONS
// ============================================

export async function createExam(
  input: { name: string; maxMarks: number; examDate: Date; academicYearId: string; termId: string; classId: string; subjectId: string }
): Promise<{ success: true; data: Exam } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const validation = createExamSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map((i: { message: string }) => i.message).join(', ') };
    }

    const exam = await ExamService.createExam(validation.data, context);
    revalidatePath('/exams');
    return { success: true, data: exam };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function getExamById(
  id: string
): Promise<{ success: true; data: Exam & { academicYear: any; term: any; class: any; subject: any; _count: any } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = examIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid exam ID' };

    const exam = await ExamService.getExamById(idValidation.data, context);
    if (!exam) return { success: false, error: 'Exam not found' };

    return { success: true, data: exam };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function listExams(
  filters?: { academicYearId?: string; termId?: string; classId?: string; subjectId?: string; page?: number; limit?: number }
): Promise<{ success: true; data: { exams: Exam[]; total: number } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const result = await ExamService.listExams(context, filters);
    return { success: true, data: result };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function updateExam(
  id: string,
  input: { name?: string; maxMarks?: number; examDate?: Date }
): Promise<{ success: true; data: Exam } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = examIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid exam ID' };

    const validation = updateExamSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map((i: { message: string }) => i.message).join(', ') };
    }

    const exam = await ExamService.updateExam(idValidation.data, validation.data, context);
    revalidatePath('/exams');
    return { success: true, data: exam };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function deleteExam(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = examIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid exam ID' };

    await ExamService.deleteExam(idValidation.data, context);
    revalidatePath('/exams');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}

// ============================================
// RESULT SERVER ACTIONS
// ============================================

export async function upsertResult(
  input: { enrollmentId: string; examId: string; marks: number; grade?: string; remarks?: string }
): Promise<{ success: true; data: Result } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const validation = createResultSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map((i: { message: string }) => i.message).join(', ') };
    }

    const result = await ResultService.upsertResult(validation.data, context);
    revalidatePath('/results');
    return { success: true, data: result };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function bulkEnterResults(
  input: { examId: string; results: { enrollmentId: string; marks: number; remarks?: string }[] }
): Promise<{ success: true; data: { results: Result[]; errors: any[]; successCount: number; errorCount: number } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const validation = bulkEnterResultsSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map((i: { message: string }) => i.message).join(', ') };
    }

    const result = await ResultService.bulkEnterResults(validation.data, context);
    revalidatePath('/results');
    return { success: true, data: result };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function getResultsByExam(
  examId: string
): Promise<{ success: true; data: (Result & { student: any; enrollment: any; rank: number })[] } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const results = await ResultService.getResultsByExam(examId, context);
    return { success: true, data: results };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function getResultsByStudent(
  studentId: string
): Promise<{ success: true; data: (Result & { exam: any })[] } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const results = await ResultService.getResultsByStudent(studentId, context);
    return { success: true, data: results };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function calculateExamStatistics(
  examId: string
): Promise<{ success: true; data: { totalStudents: number; averageMarks: number; highestMarks: number; lowestMarks: number; passCount: number; failCount: number; passPercentage: number } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const stats = await ResultService.calculateExamStatistics(examId, context);
    return { success: true, data: stats };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function calculateStudentOverallPerformance(
  studentId: string,
  academicYearId: string
): Promise<{ success: true; data: { totalExams: number; averagePercentage: number; highestPercentage: number; lowestPercentage: number; overallGrade: string } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const performance = await ResultService.calculateStudentOverallPerformance(studentId, academicYearId, context);
    return { success: true, data: performance };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function generateClassRankings(
  classId: string,
  examId: string | null
): Promise<{ success: true; data: { studentId: string; studentName: string; totalMarks: number; averagePercentage: number; rank: number }[] } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const rankings = await ResultService.generateClassRankings(classId, examId, context);
    return { success: true, data: rankings };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function deleteResult(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = resultIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid result ID' };

    await ResultService.deleteResult(idValidation.data, context);
    revalidatePath('/results');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}

// ============================================
// ATTENDANCE SERVER ACTIONS
// ============================================

export async function markAttendance(
  input: { enrollmentId: string; termId: string; date: Date; isPresent: boolean; remarks?: string }
): Promise<{ success: true; data: Attendance } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const validation = markAttendanceSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map((i: { message: string }) => i.message).join(', ') };
    }

    const attendance = await AttendanceService.markAttendance(validation.data, context);
    revalidatePath('/attendance');
    return { success: true, data: attendance };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function bulkUpdateAttendance(
  input: { classId: string; termId: string; date: Date; attendances: { enrollmentId: string; isPresent: boolean; remarks?: string }[] }
): Promise<{ success: true; data: { attendances: Attendance[]; errors: any[]; successCount: number; errorCount: number } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const validation = bulkUpdateAttendanceSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map((i: { message: string }) => i.message).join(', ') };
    }

    const result = await AttendanceService.bulkUpdateAttendance(validation.data, context);
    revalidatePath('/attendance');
    return { success: true, data: result };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function getAttendanceByClassAndDate(
  classId: string,
  date: Date
): Promise<{ success: true; data: (Attendance & { student: any })[] } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const attendances = await AttendanceService.getAttendanceByClassAndDate(classId, date, context);
    return { success: true, data: attendances };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function getAttendanceByStudentAndTerm(
  studentId: string,
  termId: string
): Promise<{ success: true; data: { attendances: Attendance[]; totalDays: number; presentDays: number; absentDays: number; attendancePercentage: number } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const result = await AttendanceService.getAttendanceByStudentAndTerm(studentId, termId, context);
    return { success: true, data: result };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function getClassAttendanceSummary(
  classId: string,
  termId: string
): Promise<{ success: true; data: { totalStudents: number; totalDays: number; averageAttendancePercentage: number; studentSummaries: any[] } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const summary = await AttendanceService.getClassAttendanceSummary(classId, termId, context);
    return { success: true, data: summary };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function getAttendanceReport(
  classId: string,
  startDate: Date,
  endDate: Date
): Promise<{ success: true; data: { dates: Date[]; studentAttendance: any[] } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const report = await AttendanceService.getAttendanceReport(classId, startDate, endDate, context);
    return { success: true, data: report };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function deleteAttendance(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = attendanceIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid attendance ID' };

    await AttendanceService.deleteAttendance(idValidation.data, context);
    revalidatePath('/attendance');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}
