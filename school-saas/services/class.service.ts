import { prisma } from '@/lib/db';
import { Class, Prisma } from '@prisma/client';
import {
  ServiceContext,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/types/domain.types';
import { requireRole, RoleGroups } from '@/lib/auth';

// ============================================
// CLASS SERVICE
// ============================================

export const ClassService = {
  /**
   * Create a new class
   * @param data - Class creation data
   * @param context - Service context with user info
   * @returns Created class
   */
  async createClass(
    data: {
      name: string;
      grade: string;
      stream?: string;
      academicYearId: string;
      classTeacherId?: string;
    },
    context: ServiceContext
  ): Promise<Class> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
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

    // Verify class teacher if provided
    if (data.classTeacherId) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          id: data.classTeacherId,
          schoolId: context.schoolId,
        },
      });

      if (!teacher) {
        throw new NotFoundError('Teacher', data.classTeacherId);
      }
    }

    const classRecord = await prisma.class.create({
      data: {
        name: data.name.trim(),
        grade: data.grade.trim(),
        stream: data.stream?.trim(),
        academicYearId: data.academicYearId,
        schoolId: context.schoolId,
        classTeacherId: data.classTeacherId,
      },
    });

    return classRecord;
  },

  /**
   * Get class by ID
   * @param id - Class ID
   * @param context - Service context with user info
   * @returns Class or null
   */
  async getClassById(
    id: string,
    context: ServiceContext
  ): Promise<
    | (Class & {
        academicYear: { id: string; name: string };
        classTeacher: { id: string; user: { firstName: string | null; lastName: string | null } } | null;
        subjects: { id: string; name: string; code: string | null }[];
        _count: { enrollments: number };
      })
    | null
  > {
    requireRole(context, RoleGroups.ALL_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const classRecord = await prisma.class.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
      include: {
        academicYear: {
          select: { id: true, name: true },
        },
        classTeacher: {
          select: {
            id: true,
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        subjects: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    return classRecord;
  },

  /**
   * List classes for a school
   * @param context - Service context with user info
   * @param filters - Optional filters
   * @returns List of classes
   */
  async listClasses(
    context: ServiceContext,
    filters?: {
      academicYearId?: string;
      grade?: string;
      classTeacherId?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ classes: Class[]; total: number }> {
    requireRole(context, RoleGroups.ALL_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const where: Prisma.ClassWhereInput = {
      schoolId: context.schoolId,
    };

    if (filters?.academicYearId) {
      where.academicYearId = filters.academicYearId;
    }

    if (filters?.grade) {
      where.grade = filters.grade;
    }

    if (filters?.classTeacherId) {
      where.classTeacherId = filters.classTeacherId;
    }

    if (filters?.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [classes, total] = await Promise.all([
      prisma.class.findMany({
        where,
        orderBy: [{ grade: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
        include: {
          academicYear: {
            select: { name: true },
          },
          classTeacher: {
            select: {
              user: {
                select: { firstName: true, lastName: true },
              },
            },
          },
          _count: {
            select: { enrollments: true },
          },
        },
      }),
      prisma.class.count({ where }),
    ]);

    return { classes, total };
  },

  /**
   * Update class
   * @param id - Class ID
   * @param data - Update data
   * @param context - Service context with user info
   * @returns Updated class
   */
  async updateClass(
    id: string,
    data: {
      name?: string;
      grade?: string;
      stream?: string | null;
      classTeacherId?: string | null;
    },
    context: ServiceContext
  ): Promise<Class> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const existingClass = await prisma.class.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
    });

    if (!existingClass) {
      throw new NotFoundError('Class', id);
    }

    // Verify new class teacher if provided
    if (data.classTeacherId) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          id: data.classTeacherId,
          schoolId: context.schoolId,
        },
      });

      if (!teacher) {
        throw new NotFoundError('Teacher', data.classTeacherId);
      }
    }

    const updateData: Prisma.ClassUpdateInput = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.grade !== undefined) {
      updateData.grade = data.grade.trim();
    }
    if (data.stream !== undefined) {
      updateData.stream = data.stream?.trim() || null;
    }
    if (data.classTeacherId !== undefined) {
      updateData.classTeacher = data.classTeacherId
        ? { connect: { id: data.classTeacherId } }
        : { disconnect: true };
    }

    const updatedClass = await prisma.class.update({
      where: { id },
      data: updateData,
    });

    return updatedClass;
  },

  /**
   * Delete class
   * @param id - Class ID
   * @param context - Service context with user info
   */
  async deleteClass(id: string, context: ServiceContext): Promise<void> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Check if class exists and belongs to school
    const existingClass = await prisma.class.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
      include: {
        _count: {
          select: {
            enrollments: true,
            exams: true,
          },
        },
      },
    });

    if (!existingClass) {
      throw new NotFoundError('Class', id);
    }

    // Check for associated records
    if (existingClass._count.enrollments > 0) {
      throw new ConflictError(
        'Cannot delete class with existing enrollments. Transfer or remove students first.'
      );
    }

    if (existingClass._count.exams > 0) {
      throw new ConflictError(
        'Cannot delete class with associated exams. Remove exams first.'
      );
    }

    await prisma.class.delete({
      where: { id },
    });
  },

  /**
   * Assign subject to class
   * @param classId - Class ID
   * @param subjectId - Subject ID
   * @param teacherId - Optional teacher ID
   * @param context - Service context with user info
   */
  async assignSubjectToClass(
    classId: string,
    subjectId: string,
    teacherId: string | null,
    context: ServiceContext
  ): Promise<void> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Verify class belongs to school
    const classRecord = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: context.schoolId,
      },
    });

    if (!classRecord) {
      throw new NotFoundError('Class', classId);
    }

    // Verify subject belongs to school
    const subject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        schoolId: context.schoolId,
      },
    });

    if (!subject) {
      throw new NotFoundError('Subject', subjectId);
    }

    // Verify teacher if provided
    if (teacherId) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          id: teacherId,
          schoolId: context.schoolId,
        },
      });

      if (!teacher) {
        throw new NotFoundError('Teacher', teacherId);
      }
    }

    // Create ClassSubject relation
    await prisma.classSubject.create({
      data: {
        classId,
        subjectId,
        teacherId,
        schoolId: context.schoolId,
      },
    });
  },

  /**
   * Remove subject from class
   * @param classId - Class ID
   * @param subjectId - Subject ID
   * @param context - Service context with user info
   */
  async removeSubjectFromClass(
    classId: string,
    subjectId: string,
    context: ServiceContext
  ): Promise<void> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Find and delete ClassSubject relation
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        classId,
        subjectId,
        schoolId: context.schoolId,
      },
    });

    if (!classSubject) {
      throw new NotFoundError('ClassSubject relation', `${classId}-${subjectId}`);
    }

    await prisma.classSubject.delete({
      where: { id: classSubject.id },
    });
  },
};

export default ClassService;
