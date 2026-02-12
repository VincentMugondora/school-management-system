import { prisma } from '@/lib/db';
import { Teacher, Role, Prisma } from '@prisma/client';
import {
  ServiceContext,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/types/domain.types';
import { requireRole, RoleGroups } from '@/lib/auth';

// ============================================
// TEACHER SERVICE
// ============================================

export const TeacherService = {
  /**
   * Create a new teacher
   * @param data - Teacher creation data
   * @param context - Service context with user info
   * @returns Created teacher
   */
  async createTeacher(
    data: {
      userId: string;
      employeeId?: string;
    },
    context: ServiceContext
  ): Promise<Teacher> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Verify user exists and has TEACHER role
    const user = await prisma.user.findFirst({
      where: {
        id: data.userId,
        schoolId: context.schoolId,
        role: Role.TEACHER,
      },
    });

    if (!user) {
      throw new NotFoundError('User with TEACHER role', data.userId);
    }

    // Check if user is already a teacher
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        userId: data.userId,
        schoolId: context.schoolId,
      },
    });

    if (existingTeacher) {
      throw new ConflictError('User is already assigned as a teacher in this school');
    }

    // Check employeeId uniqueness if provided
    if (data.employeeId) {
      const existingByEmployeeId = await prisma.teacher.findFirst({
        where: {
          schoolId: context.schoolId,
          employeeId: data.employeeId,
        },
      });
      if (existingByEmployeeId) {
        throw new ConflictError('Employee ID already exists');
      }
    }

    const teacher = await prisma.teacher.create({
      data: {
        userId: data.userId,
        schoolId: context.schoolId,
        employeeId: data.employeeId,
      },
    });

    return teacher;
  },

  /**
   * Get teacher by ID
   * @param id - Teacher ID
   * @param context - Service context with user info
   * @returns Teacher or null
   */
  async getTeacherById(
    id: string,
    context: ServiceContext
  ): Promise<
    | (Teacher & {
        user: { id: string; firstName: string | null; lastName: string | null; email: string };
        classes: { id: string; name: string; grade: string }[];
        subjects: { id: string; name: string; code: string | null }[];
      })
    | null
  > {
    requireRole(context, RoleGroups.ALL_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const teacher = await prisma.teacher.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        classes: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
        subjects: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return teacher;
  },

  /**
   * Get teacher by user ID
   * @param userId - User ID
   * @param context - Service context with user info
   * @returns Teacher or null
   */
  async getTeacherByUserId(
    userId: string,
    context: ServiceContext
  ): Promise<Teacher | null> {
    requireRole(context, RoleGroups.ALL_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const teacher = await prisma.teacher.findFirst({
      where: {
        userId,
        schoolId: context.schoolId,
      },
    });

    return teacher;
  },

  /**
   * List teachers for a school
   * @param context - Service context with user info
   * @param filters - Optional filters
   * @returns List of teachers
   */
  async listTeachers(
    context: ServiceContext,
    filters?: {
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ teachers: Teacher[]; total: number }> {
    requireRole(context, RoleGroups.ALL_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const where: Prisma.TeacherWhereInput = {
      schoolId: context.schoolId,
    };

    if (filters?.search) {
      where.user = {
        OR: [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ],
      };
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [teachers, total] = await Promise.all([
      prisma.teacher.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              classes: true,
              subjects: true,
            },
          },
        },
      }),
      prisma.teacher.count({ where }),
    ]);

    return { teachers, total };
  },

  /**
   * Update teacher
   * @param id - Teacher ID
   * @param data - Update data
   * @param context - Service context with user info
   * @returns Updated teacher
   */
  async updateTeacher(
    id: string,
    data: {
      employeeId?: string | null;
    },
    context: ServiceContext
  ): Promise<Teacher> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
    });

    if (!existingTeacher) {
      throw new NotFoundError('Teacher', id);
    }

    // Check employeeId uniqueness if changing
    if (data.employeeId && data.employeeId !== existingTeacher.employeeId) {
      const existing = await prisma.teacher.findFirst({
        where: {
          schoolId: context.schoolId,
          employeeId: data.employeeId,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictError('Employee ID already exists');
      }
    }

    const updateData: Prisma.TeacherUpdateInput = {};

    if (data.employeeId !== undefined) {
      updateData.employeeId = data.employeeId;
    }

    const updatedTeacher = await prisma.teacher.update({
      where: { id },
      data: updateData,
    });

    return updatedTeacher;
  },

  /**
   * Assign teacher to class as class teacher
   * @param teacherId - Teacher ID
   * @param classId - Class ID
   * @param context - Service context with user info
   * @returns Updated class
   */
  async assignTeacherToClass(
    teacherId: string,
    classId: string,
    context: ServiceContext
  ): Promise<void> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Verify teacher belongs to school
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId: context.schoolId,
      },
    });

    if (!teacher) {
      throw new NotFoundError('Teacher', teacherId);
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

    // Update class with class teacher
    await prisma.class.update({
      where: { id: classId },
      data: {
        classTeacher: { connect: { id: teacherId } },
      },
    });
  },

  /**
   * Remove teacher from class
   * @param classId - Class ID
   * @param context - Service context with user info
   */
  async removeTeacherFromClass(
    classId: string,
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

    // Remove class teacher
    await prisma.class.update({
      where: { id: classId },
      data: {
        classTeacher: { disconnect: true },
      },
    });
  },

  /**
   * Assign teacher to subject
   * @param teacherId - Teacher ID
   * @param subjectId - Subject ID
   * @param context - Service context with user info
   */
  async assignTeacherToSubject(
    teacherId: string,
    subjectId: string,
    context: ServiceContext
  ): Promise<void> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Verify teacher belongs to school
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId: context.schoolId,
      },
    });

    if (!teacher) {
      throw new NotFoundError('Teacher', teacherId);
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

    // Connect teacher to subject
    await prisma.subject.update({
      where: { id: subjectId },
      data: {
        teachers: {
          connect: { id: teacherId },
        },
      },
    });
  },

  /**
   * Remove teacher from subject
   * @param teacherId - Teacher ID
   * @param subjectId - Subject ID
   * @param context - Service context with user info
   */
  async removeTeacherFromSubject(
    teacherId: string,
    subjectId: string,
    context: ServiceContext
  ): Promise<void> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Verify teacher belongs to school
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId: context.schoolId,
      },
    });

    if (!teacher) {
      throw new NotFoundError('Teacher', teacherId);
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

    // Disconnect teacher from subject
    await prisma.subject.update({
      where: { id: subjectId },
      data: {
        teachers: {
          disconnect: { id: teacherId },
        },
      },
    });
  },

  /**
   * Delete teacher
   * @param id - Teacher ID
   * @param context - Service context with user info
   */
  async deleteTeacher(id: string, context: ServiceContext): Promise<void> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Check if teacher exists and belongs to school
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
      include: {
        _count: {
          select: {
            classes: true,
            subjects: true,
          },
        },
      },
    });

    if (!existingTeacher) {
      throw new NotFoundError('Teacher', id);
    }

    // Check if teacher is assigned to classes
    if (existingTeacher._count.classes > 0) {
      throw new ConflictError(
        'Cannot delete teacher assigned to classes. Remove assignments first.'
      );
    }

    // Check if teacher is assigned to subjects
    if (existingTeacher._count.subjects > 0) {
      throw new ConflictError(
        'Cannot delete teacher assigned to subjects. Remove assignments first.'
      );
    }

    await prisma.teacher.delete({
      where: { id },
    });
  },

  /**
   * Get teacher's dashboard data
   * @param context - Service context with user info
   * @returns Teacher dashboard data
   */
  async getTeacherDashboard(
    context: ServiceContext
  ): Promise<{
    assignedClasses: { id: string; name: string; grade: string; academicYear: { name: string } }[];
    assignedSubjects: { id: string; name: string; code: string | null }[];
  }> {
    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Get teacher by user ID
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId: context.userId,
        schoolId: context.schoolId,
      },
      include: {
        classes: {
          include: {
            academicYear: {
              select: { name: true },
            },
          },
        },
        subjects: true,
      },
    });

    if (!teacher) {
      throw new NotFoundError('Teacher', context.userId);
    }

    return {
      assignedClasses: teacher.classes,
      assignedSubjects: teacher.subjects,
    };
  },
};

export default TeacherService;
