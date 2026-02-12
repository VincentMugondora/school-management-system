import { prisma } from '@/lib/db';
import { Term, TermStatus, Role, Prisma } from '@prisma/client';
import {
  ServiceContext,
  NotFoundError,
  ForbiddenError,
  ValidationError,
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
    throw new ForbiddenError('Only ADMIN can manage terms');
  }
}

// ============================================
// VALIDATION HELPERS
// ============================================

function validateDateRange(
  startDate: Date,
  endDate: Date,
  fieldName: string = 'Term'
): void {
  if (endDate <= startDate) {
    throw new ValidationError(`${fieldName} end date must be after start date`);
  }
}

// ============================================
// TERM SERVICE
// ============================================

export const TermService = {
  /**
   * Create a new term
   * @param data - Term creation data
   * @param context - Service context with user info
   * @returns Created term
   */
  async createTerm(
    data: {
      academicYearId: string;
      name: string;
      startDate: Date;
      endDate: Date;
    },
    context: ServiceContext
  ): Promise<Term> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Validate dates
    validateDateRange(data.startDate, data.endDate);

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

    const term = await prisma.term.create({
      data: {
        name: data.name.trim(),
        startDate: data.startDate,
        endDate: data.endDate,
        schoolId: context.schoolId,
        academicYearId: data.academicYearId,
        status: TermStatus.ACTIVE,
      },
    });

    return term;
  },

  /**
   * Get term by ID
   * @param id - Term ID
   * @param context - Service context with user info
   * @returns Term or null
   */
  async getTermById(
    id: string,
    context: ServiceContext
  ): Promise<
    | (Term & {
        academicYear: { id: string; name: string };
        _count: { exams: number; attendances: number; invoices: number };
      })
    | null
  > {
    requireAdminOrAbove(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const term = await prisma.term.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
      include: {
        academicYear: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            exams: true,
            attendances: true,
            invoices: true,
          },
        },
      },
    });

    return term;
  },

  /**
   * List terms for an academic year
   * @param academicYearId - Academic year ID
   * @param context - Service context with user info
   * @returns List of terms
   */
  async listTermsByAcademicYear(
    academicYearId: string,
    context: ServiceContext
  ): Promise<Term[]> {
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

    const terms = await prisma.term.findMany({
      where: {
        academicYearId,
        schoolId: context.schoolId,
      },
      orderBy: { startDate: 'asc' },
      include: {
        _count: {
          select: {
            exams: true,
            attendances: true,
          },
        },
      },
    });

    return terms;
  },

  /**
   * List all terms for a school
   * @param context - Service context with user info
   * @param status - Optional status filter
   * @returns List of terms
   */
  async listTerms(
    context: ServiceContext,
    status?: TermStatus
  ): Promise<
    (Term & {
      academicYear: { id: string; name: string };
    })[]
  > {
    requireAdminOrAbove(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const where: Prisma.TermWhereInput = {
      schoolId: context.schoolId,
    };

    if (status) {
      where.status = status;
    }

    const terms = await prisma.term.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        academicYear: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return terms;
  },

  /**
   * Update term
   * @param id - Term ID
   * @param data - Update data
   * @param context - Service context with user info
   * @returns Updated term
   */
  async updateTerm(
    id: string,
    data: {
      name?: string;
      startDate?: Date;
      endDate?: Date;
      status?: TermStatus;
    },
    context: ServiceContext
  ): Promise<Term> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Check if term exists and belongs to school
    const existingTerm = await prisma.term.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
    });

    if (!existingTerm) {
      throw new NotFoundError('Term', id);
    }

    // Validate dates if both provided
    if (data.startDate && data.endDate) {
      validateDateRange(data.startDate, data.endDate);
    }

    // If unlocking, verify no conflicting locked terms
    if (data.status === TermStatus.ACTIVE && existingTerm.status === TermStatus.LOCKED) {
      // Additional validation for unlocking
    }

    const updateData: Prisma.TermUpdateInput = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate;
    }
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    const updatedTerm = await prisma.term.update({
      where: { id },
      data: updateData,
    });

    return updatedTerm;
  },

  /**
   * Lock term (prevent edits)
   * @param id - Term ID
   * @param context - Service context with user info
   * @returns Locked term
   */
  async lockTerm(id: string, context: ServiceContext): Promise<Term> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const existingTerm = await prisma.term.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
    });

    if (!existingTerm) {
      throw new NotFoundError('Term', id);
    }

    const lockedTerm = await prisma.term.update({
      where: { id },
      data: { status: TermStatus.LOCKED },
    });

    return lockedTerm;
  },

  /**
   * Unlock term (allow edits)
   * @param id - Term ID
   * @param context - Service context with user info
   * @returns Unlocked term
   */
  async unlockTerm(id: string, context: ServiceContext): Promise<Term> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const existingTerm = await prisma.term.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
    });

    if (!existingTerm) {
      throw new NotFoundError('Term', id);
    }

    const unlockedTerm = await prisma.term.update({
      where: { id },
      data: { status: TermStatus.ACTIVE },
    });

    return unlockedTerm;
  },

  /**
   * Delete term
   * @param id - Term ID
   * @param context - Service context with user info
   */
  async deleteTerm(id: string, context: ServiceContext): Promise<void> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Check if term exists and belongs to school
    const existingTerm = await prisma.term.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
      include: {
        _count: {
          select: {
            exams: true,
            attendances: true,
            invoices: true,
          },
        },
      },
    });

    if (!existingTerm) {
      throw new NotFoundError('Term', id);
    }

    // Check for associated records
    if (existingTerm._count.exams > 0) {
      throw new ValidationError('Cannot delete term with associated exams');
    }

    if (existingTerm._count.attendances > 0) {
      throw new ValidationError('Cannot delete term with associated attendance records');
    }

    if (existingTerm._count.invoices > 0) {
      throw new ValidationError('Cannot delete term with associated invoices');
    }

    await prisma.term.delete({
      where: { id },
    });
  },
};

export default TermService;
