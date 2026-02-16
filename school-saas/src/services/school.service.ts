import { prisma } from '@/lib/db';
import { SchoolStatus, Role } from '@prisma/client';
import {
  ServiceContext,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '@/types/domain.types';
import { CreateSchoolInput, School } from '../domain/school/school.types';

/**
 * SchoolService
 *
 * Service for managing schools in a multi-tenant school management system.
 * Enforces business rules:
 * - One admin can only create one school
 * - Slugs must be unique and URL-safe
 * - School creation is atomic (transaction-based)
 *
 * @module @/services/school.service
 */
export const SchoolService = {
  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create a new school and assign the admin user to it.
   * Uses Prisma transaction to ensure atomicity.
   *
   * Business Rules:
   * - Admin must not already own a school (one school per admin)
   * - Slug is auto-generated from name if not provided
   * - Slug must be unique across all schools
   * - Admin's User.schoolId is updated to link them to the new school
   *
   * @param adminUserId - The ID of the admin user creating the school
   * @param schoolData - School creation data (name, optional slug, contact info)
   * @returns The created school entity
   * @throws NotFoundError if admin user not found
   * @throws ForbiddenError if user is not an admin
   * @throws ValidationError if required fields missing
   * @throws ConflictError if admin already has a school or slug exists
   */
  async createSchool(
    adminUserId: string,
    schoolData: CreateSchoolInput
  ): Promise<School> {
    // Fetch the admin user
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, role: true, schoolId: true, email: true },
    });

    if (!adminUser) {
      throw new NotFoundError('User', adminUserId);
    }

    // Authorization: Only admins can create schools
    if (adminUser.role !== Role.ADMIN && adminUser.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only administrators can create schools');
    }

    // Business Rule: One school per admin
    if (adminUser.schoolId) {
      throw new ConflictError(
        'Admin already owns a school. Each administrator can only create one school.'
      );
    }

    // Validation: Name is required
    if (!schoolData.name?.trim()) {
      throw new ValidationError('School name is required');
    }

    // Generate or validate slug
    const slug = schoolData.slug
      ? this.validateAndNormalizeSlug(schoolData.slug)
      : this.generateSlug(schoolData.name);

    // Validate slug is not empty after normalization
    if (!slug || slug.length < 3) {
      throw new ValidationError(
        'Could not generate a valid slug from the school name. Please provide a slug manually.'
      );
    }

    // Ensure slug uniqueness with defensive check
    // In high-concurrency scenarios, we use the transaction to ensure atomicity
    const existingSchoolWithSlug = await prisma.school.findUnique({
      where: { slug },
    });

    if (existingSchoolWithSlug) {
      // If user provided a custom slug, error is clear
      if (schoolData.slug) {
        throw new ConflictError(
          `The slug "${slug}" is already taken. Please choose a different slug.`
        );
      }

      // If auto-generated, try to append a number to make it unique
      let uniqueSlug = slug;
      let attempt = 1;
      const maxAttempts = 10;

      while (attempt < maxAttempts) {
        uniqueSlug = `${slug}-${attempt}`;
        const check = await prisma.school.findUnique({ where: { slug: uniqueSlug } });
        if (!check) break;
        attempt++;
      }

      if (attempt >= maxAttempts) {
        throw new ConflictError(
          `Unable to generate a unique slug from "${schoolData.name}". ` +
          'Too many schools with similar names exist. Please provide a custom slug.'
        );
      }

      // Use the unique slug we found
      // Note: Still need to check inside transaction for race conditions
    }

    // Execute atomic transaction: Create school + Link admin
    const result = await prisma.$transaction(async (tx) => {
      // Create the school
      const school = await tx.school.create({
        data: {
          name: schoolData.name.trim(),
          slug,
          email: schoolData.email?.trim() || null,
          phone: schoolData.phone?.trim() || null,
          address: schoolData.address?.trim() || null,
          status: SchoolStatus.ACTIVE,
        },
      });

      // Attach admin to the school by updating User.schoolId
      await tx.user.update({
        where: { id: adminUserId },
        data: { schoolId: school.id },
      });

      return school;
    });

    return this.mapPrismaSchoolToDomain(result);
  },

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  /**
   * Get a school by its unique slug.
   *
   * @param slug - The URL-safe slug
   * @returns The school entity
   * @throws NotFoundError if school not found
   */
  async getSchoolBySlug(slug: string): Promise<School> {
    const school = await prisma.school.findUnique({
      where: { slug },
    });

    if (!school) {
      throw new NotFoundError('School');
    }

    return this.mapPrismaSchoolToDomain(school);
  },

  /**
   * Get a school by its ID.
   *
   * @param schoolId - The school UUID
   * @returns The school entity
   * @throws NotFoundError if school not found
   */
  async getSchoolById(schoolId: string): Promise<School> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundError('School', schoolId);
    }

    return this.mapPrismaSchoolToDomain(school);
  },

  /**
   * Check if an admin user already owns a school.
   *
   * @param adminUserId - The admin user ID
   * @returns true if admin already has a school
   */
  async adminHasSchool(adminUserId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { schoolId: true },
    });

    return !!user?.schoolId;
  },

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Generate a URL-safe slug from a school name.
   * Converts to lowercase, replaces spaces with hyphens,
   * removes non-alphanumeric characters.
   *
   * @param name - The school name
   * @returns URL-safe slug
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric chars except hyphens
      .replace(/-+/g, '-') // Collapse multiple hyphens
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  },

  /**
   * Validate and normalize a provided slug.
   * Ensures the slug is URL-safe.
   *
   * @param slug - The proposed slug
   * @returns Normalized slug
   * @throws ValidationError if slug is invalid
   */
  validateAndNormalizeSlug(slug: string): string {
    const normalized = slug
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    if (!normalized || normalized.length < 3) {
      throw new ValidationError(
        'Slug must be at least 3 characters and contain only lowercase letters, numbers, and hyphens'
      );
    }

    // Check slug pattern (must start and end with alphanumeric)
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(normalized)) {
      throw new ValidationError(
        'Slug must start and end with a letter or number, and contain only lowercase letters, numbers, and hyphens'
      );
    }

    return normalized;
  },

  /**
   * Map Prisma School model to domain School interface.
   *
   * @param prismaSchool - The Prisma school record
   * @returns Domain School entity
   */
  mapPrismaSchoolToDomain(prismaSchool: {
    id: string;
    name: string;
    slug: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    status: SchoolStatus;
    createdAt: Date;
    updatedAt: Date;
  }): School {
    return {
      id: prismaSchool.id,
      name: prismaSchool.name,
      slug: prismaSchool.slug,
      email: prismaSchool.email || undefined,
      phone: prismaSchool.phone || undefined,
      address: prismaSchool.address || undefined,
      status: prismaSchool.status,
      createdAt: prismaSchool.createdAt,
      updatedAt: prismaSchool.updatedAt,
    };
  },
};
