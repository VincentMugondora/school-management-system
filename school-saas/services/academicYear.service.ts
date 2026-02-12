import { prisma } from '@/lib/db';
import {
  AcademicYear,
  AcademicYearStatus,
  Role,
  Prisma,
} from '@prisma/client';
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
    throw new ForbiddenError('Only ADMIN can manage academic years');
  }
}

// ============================================
// VALIDATION HELPERS
// ============================================

function validateDateRange(
  startDate: Date,
  endDate: Date,
  fieldName: string = 'Academic year'
): void {
  if (endDate <= startDate) {
    throw new ValidationError(`${fieldName} end date must be after start date`);
  }
}

// ============================================
// ACADEMIC YEAR SERVICE
// ============================================

export const AcademicYearService = {
  /**
   * Create a new academic year
   * @param data - Academic year creation data
   * @param context - Service context with user info
   * @returns Created academic year
   */
  async createAcademicYear(
    data: {
      name: string;
      startDate: Date;
      endDate: Date;
      isCurrent?: boolean;
    },
    context: ServiceContext
  ): Promise<AcademicYear> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Validate dates
    validateDateRange(data.startDate, data.endDate);

    // If setting as current, unset any existing current academic year
    if (data.isCurrent) {
      await prisma.academicYear.updateMany({
        where: {
          schoolId: context.schoolId,
          isCurrent: true,
        },
        data: { isCurrent: false },
      });
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        name: data.name.trim(),
        startDate: data.startDate,
        endDate: data.endDate,
        isCurrent: data.isCurrent ?? false,
        schoolId: context.schoolId,
        status: AcademicYearStatus.ACTIVE,
      },
    });

    return academicYear;
  },

  /**
   * Get academic year by ID
   * @param id - Academic year ID
   * @param context - Service context with user info
   * @returns Academic year or null
   */
  async getAcademicYearById(
    id: string,
    context: ServiceContext
  ): Promise<
    | (AcademicYear & {
        terms: { id: string; name: string; status: string }[];
        _count: { classes: number; enrollments: number };
      })
    | null
  > {
    requireAdminOrAbove(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
      include: {
        terms: {
          select: {
            id: true,
            name: true,
            status: true,
          },
          orderBy: { startDate: 'asc' },
        },
        _count: {
          select: {
            classes: true,
            enrollments: true,
          },
        },
      },
    });

    return academicYear;
  },

  /**
   * Get current academic year for a school
   * @param schoolId - School ID
   * @returns Current academic year or null
   */
  async getCurrentAcademicYear(
    schoolId: string
  ): Promise<AcademicYear | null> {
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        isCurrent: true,
        status: AcademicYearStatus.ACTIVE,
      },
    });

    return academicYear;
  },

  /**
   * List academic years for a school
   * @param context - Service context with user info
   * @param status - Optional status filter
   * @returns List of academic years
   */
  async listAcademicYears(
    context: ServiceContext,
    status?: AcademicYearStatus
  ): Promise<AcademicYear[]> {
    requireAdminOrAbove(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const where: Prisma.AcademicYearWhereInput = {
      schoolId: context.schoolId,
    };

    if (status) {
      where.status = status;
    }

    const academicYears = await prisma.academicYear.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: {
            classes: true,
            enrollments: true,
            terms: true,
          },
        },
      },
    });

    return academicYears;
  },

  /**
   * Update academic year
   * @param id - Academic year ID
   * @param data - Update data
   * @param context - Service context with user info
   * @returns Updated academic year
   */
  async updateAcademicYear(
    id: string,
    data: {
      name?: string;
      startDate?: Date;
      endDate?: Date;
      isCurrent?: boolean;
      status?: AcademicYearStatus;
    },
    context: ServiceContext
  ): Promise<AcademicYear> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Check if academic year exists and belongs to school
    const existingYear = await prisma.academicYear.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
    });

    if (!existingYear) {
      throw new NotFoundError('AcademicYear', id);
    }

    // Validate dates if both provided
    if (data.startDate && data.endDate) {
      validateDateRange(data.startDate, data.endDate);
    }

    // If setting as current, unset any existing current academic year
    if (data.isCurrent) {
      await prisma.academicYear.updateMany({
        where: {
          schoolId: context.schoolId,
          isCurrent: true,
          id: { not: id },
        },
        data: { isCurrent: false },
      });
    }

    const updateData: Prisma.AcademicYearUpdateInput = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate;
    }
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate;
    }
    if (data.isCurrent !== undefined) {
      updateData.isCurrent = data.isCurrent;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    const updatedYear = await prisma.academicYear.update({
      where: { id },
      data: updateData,
    });

    return updatedYear;
  },

  /**
   * Set academic year as current
   * @param id - Academic year ID
   * @param context - Service context with user info
   * @returns Updated academic year
   */
  async setAsCurrent(id: string, context: ServiceContext): Promise<AcademicYear> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Check if academic year exists and belongs to school
    const existingYear = await prisma.academicYear.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
    });

    if (!existingYear) {
      throw new NotFoundError('AcademicYear', id);
    }

    // Unset any existing current academic year
    await prisma.academicYear.updateMany({
      where: {
        schoolId: context.schoolId,
        isCurrent: true,
      },
      data: { isCurrent: false },
    });

    // Set this one as current
    const updatedYear = await prisma.academicYear.update({
      where: { id },
      data: { isCurrent: true },
    });

    return updatedYear;
  },

  /**
   * Delete academic year
   * @param id - Academic year ID
   * @param context - Service context with user info
   */
  async deleteAcademicYear(id: string, context: ServiceContext): Promise<void> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Check if academic year exists and belongs to school
    const existingYear = await prisma.academicYear.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
      include: {
        _count: {
          select: {
            enrollments: true,
            classes: true,
          },
        },
      },
    });

    if (!existingYear) {
      throw new NotFoundError('AcademicYear', id);
    }

    // Check if there are enrollments
    if (existingYear._count.enrollments > 0) {
      throw new ConflictError(
        'Cannot delete academic year with existing enrollments. Archive it instead.'
      );
    }

    // Check if there are classes
    if (existingYear._count.classes > 0) {
      throw new ConflictError(
        'Cannot delete academic year with existing classes. Remove classes first.'
      );
    }

    await prisma.academicYear.delete({
      where: { id },
    });
  },
};

export default AcademicYearService;
