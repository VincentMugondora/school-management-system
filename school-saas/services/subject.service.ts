import { prisma } from '@/lib/db';
import { Subject, Prisma } from '@prisma/client';
import {
  ServiceContext,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/types/domain.types';
import { requireRole, RoleGroups } from '@/lib/auth';

// ============================================
// SUBJECT SERVICE
// ============================================

export const SubjectService = {
  /**
   * Create a new subject
   * @param data - Subject creation data
   * @param context - Service context with user info
   * @returns Created subject
   */
  async createSubject(
    data: {
      name: string;
      code?: string;
    },
    context: ServiceContext
  ): Promise<Subject> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Check if subject name already exists in school
    const existingSubject = await prisma.subject.findFirst({
      where: {
        name: { equals: data.name, mode: 'insensitive' },
        schoolId: context.schoolId,
      },
    });

    if (existingSubject) {
      throw new ConflictError('Subject with this name already exists in the school');
    }

    // Check if code is unique if provided
    if (data.code) {
      const existingByCode = await prisma.subject.findFirst({
        where: {
          code: data.code,
          schoolId: context.schoolId,
        },
      });
      if (existingByCode) {
        throw new ConflictError('Subject with this code already exists');
      }
    }

    const subject = await prisma.subject.create({
      data: {
        name: data.name.trim(),
        code: data.code?.trim() || null,
        schoolId: context.schoolId,
      },
    });

    return subject;
  },

  /**
   * Get subject by ID
   * @param id - Subject ID
   * @param context - Service context with user info
   * @returns Subject or null
   */
  async getSubjectById(
    id: string,
    context: ServiceContext
  ): Promise<
    | (Subject & {
        teachers: { id: string; user: { firstName: string | null; lastName: string | null } }[];
        classes: { id: string; name: string; grade: string }[];
        _count: { exams: number; classSubjects: number };
      })
    | null
  > {
    requireRole(context, RoleGroups.ALL_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const subject = await prisma.subject.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
      include: {
        teachers: {
          select: {
            id: true,
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        classSubjects: {
          include: {
            class: {
              select: { id: true, name: true, grade: true },
            },
          },
        },
        _count: {
          select: { exams: true, classSubjects: true },
        },
      },
    });

    if (!subject) return null;

    // Flatten classSubjects to classes array
    const classes = subject.classSubjects.map(cs => cs.class);

    return {
      ...subject,
      classes,
    };
  },

  /**
   * List subjects for a school
   * @param context - Service context with user info
   * @param filters - Optional filters
   * @returns List of subjects
   */
  async listSubjects(
    context: ServiceContext,
    filters?: {
      search?: string;
      teacherId?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ subjects: Subject[]; total: number }> {
    requireRole(context, RoleGroups.ALL_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const where: Prisma.SubjectWhereInput = {
      schoolId: context.schoolId,
    };

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.teacherId) {
      where.teachers = {
        some: { id: filters.teacherId },
      };
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [subjects, total] = await Promise.all([
      prisma.subject.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: {
          teachers: {
            select: {
              id: true,
              user: {
                select: { firstName: true, lastName: true },
              },
            },
          },
          _count: {
            select: { teachers: true, classSubjects: true },
          },
        },
      }),
      prisma.subject.count({ where }),
    ]);

    return { subjects, total };
  },

  /**
   * Update subject
   * @param id - Subject ID
   * @param data - Update data
   * @param context - Service context with user info
   * @returns Updated subject
   */
  async updateSubject(
    id: string,
    data: {
      name?: string;
      code?: string | null;
    },
    context: ServiceContext
  ): Promise<Subject> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const existingSubject = await prisma.subject.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
    });

    if (!existingSubject) {
      throw new NotFoundError('Subject', id);
    }

    // Check name uniqueness if changing
    if (data.name && data.name !== existingSubject.name) {
      const existing = await prisma.subject.findFirst({
        where: {
          name: { equals: data.name, mode: 'insensitive' },
          schoolId: context.schoolId,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictError('Subject with this name already exists');
      }
    }

    // Check code uniqueness if changing
    if (data.code && data.code !== existingSubject.code) {
      const existing = await prisma.subject.findFirst({
        where: {
          code: data.code,
          schoolId: context.schoolId,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictError('Subject with this code already exists');
      }
    }

    const updateData: Prisma.SubjectUpdateInput = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.code !== undefined) {
      updateData.code = data.code?.trim() || null;
    }

    const updatedSubject = await prisma.subject.update({
      where: { id },
      data: updateData,
    });

    return updatedSubject;
  },

  /**
   * Delete subject
   * @param id - Subject ID
   * @param context - Service context with user info
   */
  async deleteSubject(id: string, context: ServiceContext): Promise<void> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Check if subject exists and belongs to school
    const existingSubject = await prisma.subject.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
      include: {
        _count: {
          select: {
            exams: true,
            classSubjects: true,
            teachers: true,
          },
        },
      },
    });

    if (!existingSubject) {
      throw new NotFoundError('Subject', id);
    }

    // Check for associated records
    if (existingSubject._count.exams > 0) {
      throw new ConflictError(
        'Cannot delete subject with associated exams. Remove exams first.'
      );
    }

    if (existingSubject._count.classSubjects > 0) {
      throw new ConflictError(
        'Cannot delete subject assigned to classes. Remove class assignments first.'
      );
    }

    if (existingSubject._count.teachers > 0) {
      throw new ConflictError(
        'Cannot delete subject with assigned teachers. Remove teacher assignments first.'
      );
    }

    await prisma.subject.delete({
      where: { id },
    });
  },
};

export default SubjectService;
