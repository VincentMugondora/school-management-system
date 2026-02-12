import { prisma } from '@/lib/db';
import { Enrollment, EnrollmentStatus, Role, Prisma } from '@prisma/client';
import {
  ServiceContext,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '@/types/domain.types';

// ============================================
// AUTHORIZATION HELPERS
// ============================================

function requireAdminOrAbove(context: ServiceContext): void {
  if (
    context.role !== Role.SUPER_ADMIN &&
    context.role !== Role.ADMIN &&
    context.role !== Role.TEACHER
  ) {
    throw new ForbiddenError('Insufficient permissions');
  }
}

function requireAdmin(context: ServiceContext): void {
  if (context.role !== Role.SUPER_ADMIN && context.role !== Role.ADMIN) {
    throw new ForbiddenError('Only ADMIN can manage enrollments');
  }
}

// ============================================
// ENROLLMENT SERVICE
// ============================================

export const EnrollmentService = {
  /**
   * Create a new enrollment
   * @param data - Enrollment creation data
   * @param context - Service context with user info
   * @returns Created enrollment
   */
  async createEnrollment(
    data: {
      studentId: string;
      academicYearId: string;
      classId: string;
      status?: EnrollmentStatus;
    },
    context: ServiceContext
  ): Promise<Enrollment> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Verify student belongs to school
    const student = await prisma.student.findFirst({
      where: {
        id: data.studentId,
        schoolId: context.schoolId,
        deletedAt: null,
      },
    });

    if (!student) {
      throw new NotFoundError('Student', data.studentId);
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

    // Check if student already enrolled in this academic year
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: data.studentId,
        academicYearId: data.academicYearId,
      },
    });

    if (existingEnrollment) {
      throw new ConflictError('Student is already enrolled in this academic year');
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: data.studentId,
        academicYearId: data.academicYearId,
        classId: data.classId,
        schoolId: context.schoolId,
        status: data.status ?? EnrollmentStatus.ACTIVE,
      },
    });

    return enrollment;
  },

  /**
   * Get enrollment by ID
   * @param id - Enrollment ID
   * @param context - Service context with user info
   * @returns Enrollment or null
   */
  async getEnrollmentById(
    id: string,
    context: ServiceContext
  ): Promise<
    | (Enrollment & {
        student: { id: string; firstName: string; lastName: string; studentId: string | null };
        academicYear: { id: string; name: string };
        class: { id: string; name: string; grade: string };
        _count: { results: number; attendances: number; invoices: number };
      })
    | null
  > {
    requireAdminOrAbove(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            name: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
        _count: {
          select: {
            results: true,
            attendances: true,
            invoices: true,
          },
        },
      },
    });

    return enrollment;
  },

  /**
   * List enrollments for a student
   * @param studentId - Student ID
   * @param context - Service context with user info
   * @returns List of enrollments
   */
  async listEnrollmentsByStudent(
    studentId: string,
    context: ServiceContext
  ): Promise<Enrollment[]> {
    requireAdminOrAbove(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Verify student belongs to school
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: context.schoolId,
      },
    });

    if (!student) {
      throw new NotFoundError('Student', studentId);
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        schoolId: context.schoolId,
      },
      orderBy: { enrollmentDate: 'desc' },
      include: {
        academicYear: {
          select: { name: true },
        },
        class: {
          select: { name: true, grade: true },
        },
      },
    });

    return enrollments;
  },

  /**
   * List enrollments for a class
   * @param classId - Class ID
   * @param context - Service context with user info
   * @param status - Optional status filter
   * @returns List of enrollments
   */
  async listEnrollmentsByClass(
    classId: string,
    context: ServiceContext,
    status?: EnrollmentStatus
  ): Promise<
    (Enrollment & {
      student: { firstName: string; lastName: string; studentId: string | null };
    })[]
  > {
    requireAdminOrAbove(context);

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

    const where: Prisma.EnrollmentWhereInput = {
      classId,
      schoolId: context.schoolId,
    };

    if (status) {
      where.status = status;
    }

    const enrollments = await prisma.enrollment.findMany({
      where,
      orderBy: { enrollmentDate: 'desc' },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentId: true,
          },
        },
      },
    });

    return enrollments;
  },

  /**
   * List enrollments for an academic year
   * @param academicYearId - Academic year ID
   * @param context - Service context with user info
   * @param status - Optional status filter
   * @returns List of enrollments
   */
  async listEnrollmentsByAcademicYear(
    academicYearId: string,
    context: ServiceContext,
    status?: EnrollmentStatus
  ): Promise<
    (Enrollment & {
      student: { firstName: string; lastName: string; studentId: string | null };
      class: { name: string; grade: string };
    })[]
  > {
    requireAdminOrAbove(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Verify academic year belongs to school
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        schoolId: context.schoolId,
      },
    });

    if (!academicYear) {
      throw new NotFoundError('AcademicYear', academicYearId);
    }

    const where: Prisma.EnrollmentWhereInput = {
      academicYearId,
      schoolId: context.schoolId,
    };

    if (status) {
      where.status = status;
    }

    const enrollments = await prisma.enrollment.findMany({
      where,
      orderBy: { enrollmentDate: 'desc' },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentId: true,
          },
        },
        class: {
          select: {
            name: true,
            grade: true,
          },
        },
      },
    });

    return enrollments;
  },

  /**
   * Update enrollment
   * @param id - Enrollment ID
   * @param data - Update data
   * @param context - Service context with user info
   * @returns Updated enrollment
   */
  async updateEnrollment(
    id: string,
    data: {
      classId?: string;
      status?: EnrollmentStatus;
    },
    context: ServiceContext
  ): Promise<Enrollment> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Check if enrollment exists and belongs to school
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
    });

    if (!existingEnrollment) {
      throw new NotFoundError('Enrollment', id);
    }

    // Verify new class belongs to school and same academic year
    if (data.classId) {
      const classRecord = await prisma.class.findFirst({
        where: {
          id: data.classId,
          schoolId: context.schoolId,
          academicYearId: existingEnrollment.academicYearId,
        },
      });

      if (!classRecord) {
        throw new NotFoundError('Class', data.classId);
      }
    }

    const updateData: Prisma.EnrollmentUpdateInput = {};

    if (data.classId !== undefined) {
      updateData.class = { connect: { id: data.classId } };
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    const updatedEnrollment = await prisma.enrollment.update({
      where: { id },
      data: updateData,
    });

    return updatedEnrollment;
  },

  /**
   * Transfer student to another class
   * @param id - Enrollment ID
   * @param newClassId - New class ID
   * @param context - Service context with user info
   * @returns Updated enrollment
   */
  async transferStudent(
    id: string,
    newClassId: string,
    context: ServiceContext
  ): Promise<Enrollment> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
    });

    if (!existingEnrollment) {
      throw new NotFoundError('Enrollment', id);
    }

    if (existingEnrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ValidationError('Can only transfer active enrollments');
    }

    // Verify new class belongs to same school and academic year
    const newClass = await prisma.class.findFirst({
      where: {
        id: newClassId,
        schoolId: context.schoolId,
        academicYearId: existingEnrollment.academicYearId,
      },
    });

    if (!newClass) {
      throw new NotFoundError('Class', newClassId);
    }

    const updatedEnrollment = await prisma.enrollment.update({
      where: { id },
      data: {
        class: { connect: { id: newClassId } },
      },
    });

    return updatedEnrollment;
  },

  /**
   * Drop enrollment
   * @param id - Enrollment ID
   * @param context - Service context with user info
   * @returns Dropped enrollment
   */
  async dropEnrollment(id: string, context: ServiceContext): Promise<Enrollment> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
    });

    if (!existingEnrollment) {
      throw new NotFoundError('Enrollment', id);
    }

    const droppedEnrollment = await prisma.enrollment.update({
      where: { id },
      data: { status: EnrollmentStatus.DROPPED },
    });

    return droppedEnrollment;
  },

  /**
   * Complete enrollment (when academic year ends)
   * @param id - Enrollment ID
   * @param context - Service context with user info
   * @returns Completed enrollment
   */
  async completeEnrollment(id: string, context: ServiceContext): Promise<Enrollment> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
    });

    if (!existingEnrollment) {
      throw new NotFoundError('Enrollment', id);
    }

    const completedEnrollment = await prisma.enrollment.update({
      where: { id },
      data: { status: EnrollmentStatus.COMPLETED },
    });

    return completedEnrollment;
  },

  /**
   * Delete enrollment
   * @param id - Enrollment ID
   * @param context - Service context with user info
   */
  async deleteEnrollment(id: string, context: ServiceContext): Promise<void> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Check if enrollment exists and belongs to school
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
      include: {
        _count: {
          select: {
            results: true,
            attendances: true,
            invoices: true,
          },
        },
      },
    });

    if (!existingEnrollment) {
      throw new NotFoundError('Enrollment', id);
    }

    // Check for associated records
    if (existingEnrollment._count.results > 0) {
      throw new ConflictError('Cannot delete enrollment with associated exam results');
    }

    if (existingEnrollment._count.attendances > 0) {
      throw new ConflictError('Cannot delete enrollment with associated attendance records');
    }

    if (existingEnrollment._count.invoices > 0) {
      throw new ConflictError('Cannot delete enrollment with associated invoices');
    }

    await prisma.enrollment.delete({
      where: { id },
    });
  },
};

export default EnrollmentService;
