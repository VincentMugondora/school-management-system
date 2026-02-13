import { School, SchoolStatus, Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  CreateSchoolInput,
  UpdateSchoolInput,
  SchoolFilterInput,
  ServiceContext,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '@/types/domain.types';

// ============================================
// AUTHORIZATION HELPERS
// ============================================

function requireSuperAdmin(context: ServiceContext): void {
  if (context.role !== Role.SUPER_ADMIN) {
    throw new ForbiddenError('Only SUPER_ADMIN can manage schools');
  }
}

function requireAdminOrAbove(context: ServiceContext): void {
  if (context.role !== Role.SUPER_ADMIN && context.role !== Role.ADMIN) {
    throw new ForbiddenError('Insufficient permissions');
  }
}

// ============================================
// VALIDATION HELPERS
// ============================================

function validateSlug(slug: string): void {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    throw new ValidationError(
      'Slug must contain only lowercase letters, numbers, and hyphens'
    );
  }
  if (slug.length < 3 || slug.length > 50) {
    throw new ValidationError('Slug must be between 3 and 50 characters');
  }
}

function validateSchoolName(name: string): void {
  if (!name || name.trim().length < 2) {
    throw new ValidationError('School name must be at least 2 characters');
  }
  if (name.length > 100) {
    throw new ValidationError('School name must not exceed 100 characters');
  }
}

// ============================================
// SCHOOL SERVICE
// ============================================

export const SchoolService = {
  /**
   * Create a new school
   * @param input - School creation data
   * @param context - Service context with user info
   * @returns Created school
   * @throws ForbiddenError if user is not SUPER_ADMIN
   * @throws ValidationError if input is invalid
   * @throws ConflictError if slug already exists
   */
  async createSchool(
    input: CreateSchoolInput,
    context: ServiceContext
  ): Promise<School> {
    requireSuperAdmin(context);

    // Validate inputs
    validateSchoolName(input.name);
    validateSlug(input.slug);

    // Check for slug uniqueness
    const existingSchool = await prisma.school.findUnique({
      where: { slug: input.slug },
    });

    if (existingSchool) {
      throw new ConflictError(`School with slug '${input.slug}' already exists`);
    }

    // Create school
    const school = await prisma.school.create({
      data: {
        name: input.name.trim(),
        slug: input.slug.toLowerCase(),
        address: input.address?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim().toLowerCase() || null,
        status: SchoolStatus.ACTIVE,
      },
    });

    return school;
  },

  /**
   * Get school by ID
   * @param id - School ID
   * @param context - Service context with user info
   * @returns School or null if not found
   */
  async getSchoolById(
    id: string,
    context: ServiceContext
  ): Promise<School | null> {
    // If not SUPER_ADMIN, can only access their own school
    if (context.role !== Role.SUPER_ADMIN) {
      if (context.schoolId !== id) {
        throw new ForbiddenError('You can only access your own school');
      }
    }

    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            students: true,
            classes: true,
            academicYears: true,
          },
        },
      },
    });

    return school;
  },

  /**
   * Get school by slug
   * @param slug - School slug
   * @returns School or null if not found
   */
  async getSchoolBySlug(slug: string): Promise<School | null> {
    const school = await prisma.school.findUnique({
      where: { slug: slug.toLowerCase() },
    });

    return school;
  },

  /**
   * List all schools with pagination and filtering
   * @param filters - Filter options
   * @param page - Page number (1-based)
   * @param limit - Items per page
   * @param context - Service context with user info
   * @returns Paginated list of schools
   * @throws ForbiddenError if user is not SUPER_ADMIN
   */
  async listSchools(
    filters: SchoolFilterInput,
    page: number,
    limit: number,
    context: ServiceContext
  ): Promise<{ schools: School[]; total: number }> {
    requireSuperAdmin(context);

    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [schools, total] = await Promise.all([
      prisma.school.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              students: true,
              classes: true,
              academicYears: true,
            },
          },
        },
      }),
      prisma.school.count({ where }),
    ]);

    return { schools, total };
  },

  /**
   * Update school information
   * @param id - School ID
   * @param input - Update data
   * @param context - Service context with user info
   * @returns Updated school
   * @throws NotFoundError if school not found
   * @throws ForbiddenError if user lacks permissions
   * @throws ValidationError if input is invalid
   */
  async updateSchool(
    id: string,
    input: UpdateSchoolInput,
    context: ServiceContext
  ): Promise<School> {
    // Check permissions
    if (context.role === Role.SUPER_ADMIN) {
      // SUPER_ADMIN can update any school
    } else if (context.role === Role.ADMIN) {
      if (context.schoolId !== id) {
        throw new ForbiddenError('You can only update your own school');
      }
    } else {
      throw new ForbiddenError('Insufficient permissions');
    }

    // Check if school exists
    const existingSchool = await prisma.school.findUnique({
      where: { id },
    });

    if (!existingSchool) {
      throw new NotFoundError('School', id);
    }

    // Validate inputs if provided
    if (input.name !== undefined) {
      validateSchoolName(input.name);
    }

    // Build update data
    const updateData: any = {};

    if (input.name !== undefined) {
      updateData.name = input.name.trim();
    }

    if (input.address !== undefined) {
      updateData.address = input.address?.trim() || null;
    }

    if (input.phone !== undefined) {
      updateData.phone = input.phone?.trim() || null;
    }

    if (input.email !== undefined) {
      updateData.email = input.email?.trim().toLowerCase() || null;
    }

    // Only SUPER_ADMIN can change status
    if (input.status !== undefined) {
      requireSuperAdmin(context);
      updateData.status = input.status;
    }

    const updatedSchool = await prisma.school.update({
      where: { id },
      data: updateData,
    });

    return updatedSchool;
  },

  /**
   * Delete (soft delete by suspending) a school
   * @param id - School ID
   * @param context - Service context with user info
   * @throws NotFoundError if school not found
   * @throws ForbiddenError if user is not SUPER_ADMIN
   */
  async deleteSchool(id: string, context: ServiceContext): Promise<void> {
    requireSuperAdmin(context);

    const existingSchool = await prisma.school.findUnique({
      where: { id },
    });

    if (!existingSchool) {
      throw new NotFoundError('School', id);
    }

    // Soft delete by suspending
    await prisma.school.update({
      where: { id },
      data: { status: SchoolStatus.SUSPENDED },
    });
  },

  /**
   * Permanently delete a school and all related data
   * WARNING: This is destructive and cannot be undone
   * @param id - School ID
   * @param context - Service context with user info
   * @throws NotFoundError if school not found
   * @throws ForbiddenError if user is not SUPER_ADMIN
   */
  async permanentlyDeleteSchool(
    id: string,
    context: ServiceContext
  ): Promise<void> {
    requireSuperAdmin(context);

    const existingSchool = await prisma.school.findUnique({
      where: { id },
    });

    if (!existingSchool) {
      throw new NotFoundError('School', id);
    }

    // Prisma will cascade delete all related records due to onDelete: Cascade
    await prisma.school.delete({
      where: { id },
    });
  },
};

export default SchoolService;
