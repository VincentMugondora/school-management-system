import { prisma } from '@/lib/db';
import { Exam, Prisma } from '@prisma/client';
import {
  ServiceContext,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@/types/domain.types';
import { requireRole, RoleGroups } from '@/lib/auth';

// ============================================
// EXAM SERVICE
// ============================================

export const ExamService = {
  /**
   * Create a new exam
   * @param data - Exam creation data
   * @param context - Service context with user info
   * @returns Created exam
   */
  async createExam(
    data: {
      name: string;
      maxMarks: number;
      examDate: Date;
      academicYearId: string;
      termId: string;
      classId: string;
      subjectId: string;
    },
    context: ServiceContext
  ): Promise<Exam> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Validate max marks
    if (data.maxMarks <= 0) {
      throw new ValidationError('Maximum marks must be greater than 0');
    }

    // Verify academic year belongs to school
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: data.academicYearId,
        schoolId: context.schoolId,
      },
    });

    if (!academicYear) {
      throw new NotFoundError('AcademicYear', data.academicYearId);
    }

    // Verify term belongs to school
    const term = await prisma.term.findFirst({
      where: {
        id: data.termId,
        schoolId: context.schoolId,
        academicYearId: data.academicYearId,
      },
    });

    if (!term) {
      throw new NotFoundError('Term', data.termId);
    }

    // Verify class belongs to school and academic year
    const classRecord = await prisma.class.findFirst({
      where: {
        id: data.classId,
        schoolId: context.schoolId,
        academicYearId: data.academicYearId,
      },
    });

    if (!classRecord) {
      throw new NotFoundError('Class', data.classId);
    }

    // Verify subject belongs to school
    const subject = await prisma.subject.findFirst({
      where: {
        id: data.subjectId,
        schoolId: context.schoolId,
      },
    });

    if (!subject) {
      throw new NotFoundError('Subject', data.subjectId);
    }

    const exam = await prisma.exam.create({
      data: {
        name: data.name.trim(),
        maxMarks: data.maxMarks,
        examDate: data.examDate,
        schoolId: context.schoolId,
        academicYearId: data.academicYearId,
        termId: data.termId,
        classId: data.classId,
        subjectId: data.subjectId,
      },
    });

    return exam;
  },

  /**
   * Get exam by ID
   * @param id - Exam ID
   * @param context - Service context with user info
   * @returns Exam or null
   */
  async getExamById(
    id: string,
    context: ServiceContext
  ): Promise<
    | (Exam & {
        academicYear: { id: string; name: string };
        term: { id: string; name: string };
        class: { id: string; name: string; grade: string };
        subject: { id: string; name: string; code: string | null };
        _count: { results: number };
      })
    | null
  > {
    requireRole(context, RoleGroups.ALL_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const exam = await prisma.exam.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
      include: {
        academicYear: {
          select: { id: true, name: true },
        },
        term: {
          select: { id: true, name: true },
        },
        class: {
          select: { id: true, name: true, grade: true },
        },
        subject: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { results: true },
        },
      },
    });

    return exam;
  },

  /**
   * List exams with filtering
   * @param context - Service context with user info
   * @param filters - Optional filters
   * @returns List of exams
   */
  async listExams(
    context: ServiceContext,
    filters?: {
      academicYearId?: string;
      termId?: string;
      classId?: string;
      subjectId?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ exams: Exam[]; total: number }> {
    requireRole(context, RoleGroups.ALL_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const where: Prisma.ExamWhereInput = {
      schoolId: context.schoolId,
    };

    if (filters?.academicYearId) {
      where.academicYearId = filters.academicYearId;
    }

    if (filters?.termId) {
      where.termId = filters.termId;
    }

    if (filters?.classId) {
      where.classId = filters.classId;
    }

    if (filters?.subjectId) {
      where.subjectId = filters.subjectId;
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [exams, total] = await Promise.all([
      prisma.exam.findMany({
        where,
        orderBy: { examDate: 'desc' },
        skip,
        take: limit,
        include: {
          term: {
            select: { name: true },
          },
          class: {
            select: { name: true, grade: true },
          },
          subject: {
            select: { name: true, code: true },
          },
          _count: {
            select: { results: true },
          },
        },
      }),
      prisma.exam.count({ where }),
    ]);

    return { exams, total };
  },

  /**
   * Update exam
   * @param id - Exam ID
   * @param data - Update data
   * @param context - Service context with user info
   * @returns Updated exam
   */
  async updateExam(
    id: string,
    data: {
      name?: string;
      maxMarks?: number;
      examDate?: Date;
    },
    context: ServiceContext
  ): Promise<Exam> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const existingExam = await prisma.exam.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
    });

    if (!existingExam) {
      throw new NotFoundError('Exam', id);
    }

    // Validate max marks
    if (data.maxMarks !== undefined && data.maxMarks <= 0) {
      throw new ValidationError('Maximum marks must be greater than 0');
    }

    const updateData: Prisma.ExamUpdateInput = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.maxMarks !== undefined) {
      updateData.maxMarks = data.maxMarks;
    }
    if (data.examDate !== undefined) {
      updateData.examDate = data.examDate;
    }

    const updatedExam = await prisma.exam.update({
      where: { id },
      data: updateData,
    });

    return updatedExam;
  },

  /**
   * Delete exam
   * @param id - Exam ID
   * @param context - Service context with user info
   */
  async deleteExam(id: string, context: ServiceContext): Promise<void> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Check if exam exists and belongs to school
    const existingExam = await prisma.exam.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
      include: {
        _count: {
          select: { results: true },
        },
      },
    });

    if (!existingExam) {
      throw new NotFoundError('Exam', id);
    }

    // Check for associated results
    if (existingExam._count.results > 0) {
      throw new ValidationError(
        'Cannot delete exam with associated results. Delete results first.'
      );
    }

    await prisma.exam.delete({
      where: { id },
    });
  },
};

export default ExamService;
