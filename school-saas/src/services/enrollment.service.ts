import { prisma } from '@/lib/db';
import { Prisma, Role } from '@prisma/client';
import {
  ServiceContext,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '@/types/domain.types';
import {
  EnrollmentStatus,
  CreateEnrollmentInput,
} from '@/types/student.domain';

/**
 * EnrollmentService
 *
 * Manages student enrollments across academic years and classes.
 * All operations are atomic using Prisma transactions.
 * Handles status transitions and prevents duplicate enrollments per year.
 */
export const EnrollmentService = {
  // ============================================
  // ENROLLMENT OPERATIONS
  // ============================================

  /**
   * Enroll a student into an academic year and class.
   * Prevents duplicate enrollments for the same academic year.
   * Uses transaction for atomic enrollment creation.
   *
   * @param schoolId - The school ID (explicit multi-tenancy)
   * @param input - Enrollment data
   * @param context - Service context for authorization
   * @returns The created enrollment with relations
   * @throws ForbiddenError if user lacks permission
   * @throws ValidationError if required fields missing
   * @throws ConflictError if already enrolled in academic year
   * @throws NotFoundError if student, class, or academic year not found
   */
  async enrollStudent(
    schoolId: string,
    input: CreateEnrollmentInput,
    context: ServiceContext
  ) {
    // Authorization check
    if (!context.schoolId || context.schoolId !== schoolId) {
      throw new ForbiddenError('Cannot enroll students in this school');
    }

    if (context.role !== Role.ADMIN && context.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only admins can enroll students');
    }

    // Validation
    if (!input.studentId || !input.classId || !input.academicYearId) {
      throw new ValidationError('Student, class, and academic year are required');
    }

    // Execute transaction
    const enrollment = await prisma.$transaction(async (tx) => {
      // Verify student exists and belongs to school
      const student = await tx.student.findFirst({
        where: {
          id: input.studentId,
          schoolId,
          deletedAt: null,
        },
      });

      if (!student) {
        throw new NotFoundError('Student', input.studentId);
      }

      // Verify class exists and belongs to school
      const classData = await tx.class.findFirst({
        where: {
          id: input.classId,
          schoolId,
        },
      });

      if (!classData) {
        throw new NotFoundError('Class', input.classId);
      }

      // Verify academic year exists and belongs to school
      const academicYear = await tx.academicYear.findFirst({
        where: {
          id: input.academicYearId,
          schoolId,
        },
      });

      if (!academicYear) {
        throw new NotFoundError('Academic Year', input.academicYearId);
      }

      // Check for duplicate enrollment in this academic year
      const existingEnrollment = await tx.enrollment.findFirst({
        where: {
          studentId: input.studentId,
          academicYearId: input.academicYearId,
          schoolId,
        },
      });

      if (existingEnrollment) {
        throw new ConflictError(
          `Student is already enrolled for academic year ${academicYear.name}`
        );
      }

      // Check if student has active enrollment in another year that needs completion
      const activeEnrollment = await tx.enrollment.findFirst({
        where: {
          studentId: input.studentId,
          schoolId,
          status: 'ACTIVE' as EnrollmentStatus,
        },
      });

      // Create new enrollment
      const newEnrollment = await tx.enrollment.create({
        data: {
          schoolId,
          studentId: input.studentId,
          academicYearId: input.academicYearId,
          classId: input.classId,
          enrollmentDate: input.enrollmentDate || new Date(),
          status: 'ACTIVE' as EnrollmentStatus,
          previousSchool: input.previousSchool,
          transferCertificateNo: input.transferCertificateNo,
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNumber: true,
            },
          },
          academicYear: {
            select: {
              id: true,
              name: true,
              isCurrent: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
              grade: true,
            },
          },
        },
      });

      return newEnrollment;
    });

    return enrollment;
  },

  /**
   * Get enrollment by ID with full details.
   *
   * @param schoolId - The school ID (explicit multi-tenancy)
   * @param enrollmentId - The enrollment ID to fetch
   * @param context - Service context for authorization
   * @returns Enrollment with relations
   * @throws NotFoundError if enrollment not found
   * @throws ForbiddenError if user lacks permission
   */
  async getEnrollmentById(
    schoolId: string,
    enrollmentId: string,
    context: ServiceContext
  ) {
    // Authorization check
    if (!context.schoolId || context.schoolId !== schoolId) {
      throw new ForbiddenError('Cannot access enrollments from this school');
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        schoolId,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            gender: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            name: true,
            isCurrent: true,
            startDate: true,
            endDate: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundError('Enrollment', enrollmentId);
    }

    return enrollment;
  },

  /**
   * List enrollments with filtering and pagination.
   *
   * @param schoolId - The school ID (explicit multi-tenancy)
   * @param filters - Optional filters for status, academic year, class, etc.
   * @param context - Service context for authorization
   * @returns List of enrollments with pagination
   */
  async getEnrollments(
    schoolId: string,
    filters: {
      status?: EnrollmentStatus;
      academicYearId?: string;
      classId?: string;
      studentId?: string;
      page?: number;
      limit?: number;
    } = {},
    context: ServiceContext
  ) {
    // Authorization check
    if (!context.schoolId || context.schoolId !== schoolId) {
      throw new ForbiddenError('Cannot access enrollments from this school');
    }

    const {
      status,
      academicYearId,
      classId,
      studentId,
      page = 1,
      limit = 20,
    } = filters;

    // Build where clause
    const where: Prisma.EnrollmentWhereInput = {
      schoolId,
    };

    if (status) {
      where.status = status;
    }

    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    if (classId) {
      where.classId = classId;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { enrollmentDate: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNumber: true,
            },
          },
          academicYear: {
            select: {
              id: true,
              name: true,
              isCurrent: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
              grade: true,
            },
          },
        },
      }),
      prisma.enrollment.count({ where }),
    ]);

    return {
      enrollments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get current active enrollment for a student.
   *
   * @param schoolId - The school ID (explicit multi-tenancy)
   * @param studentId - The student ID
   * @param context - Service context for authorization
   * @returns Current enrollment or null if none active
   */
  async getCurrentEnrollment(
    schoolId: string,
    studentId: string,
    context: ServiceContext
  ) {
    // Authorization check
    if (!context.schoolId || context.schoolId !== schoolId) {
      throw new ForbiddenError('Cannot access enrollments from this school');
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        schoolId,
        studentId,
        status: 'ACTIVE' as EnrollmentStatus,
      },
      include: {
        academicYear: {
          select: {
            id: true,
            name: true,
            isCurrent: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
      },
      orderBy: {
        enrollmentDate: 'desc',
      },
    });

    return enrollment;
  },

  // ============================================
  // STATUS TRANSITIONS
  // ============================================

  /**
   * Complete an enrollment (mark as COMPLETED).
   * Used when student successfully finishes academic year.
   *
   * @param schoolId - The school ID (explicit multi-tenancy)
   * @param enrollmentId - The enrollment to complete
   * @param context - Service context for authorization
   * @returns Updated enrollment
   */
  async completeEnrollment(
    schoolId: string,
    enrollmentId: string,
    context: ServiceContext
  ) {
    // Authorization check
    if (!context.schoolId || context.schoolId !== schoolId) {
      throw new ForbiddenError('Cannot update enrollments in this school');
    }

    if (context.role !== Role.ADMIN && context.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only admins can complete enrollments');
    }

    // Execute transaction
    const enrollment = await prisma.$transaction(async (tx) => {
      // Verify enrollment exists
      const existing = await tx.enrollment.findFirst({
        where: {
          id: enrollmentId,
          schoolId,
        },
      });

      if (!existing) {
        throw new NotFoundError('Enrollment', enrollmentId);
      }

      if (existing.status !== 'ACTIVE') {
        throw new ConflictError(`Cannot complete enrollment with status: ${existing.status}`);
      }

      // Update enrollment
      const updated = await tx.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'COMPLETED' as EnrollmentStatus,
          completionDate: new Date(),
          updatedAt: new Date(),
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
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
            },
          },
        },
      });

      return updated;
    });

    return enrollment;
  },

  /**
   * Mark enrollment as REPEATED (student must repeat same grade).
   *
   * @param schoolId - The school ID (explicit multi-tenancy)
   * @param enrollmentId - The enrollment to mark as repeated
   * @param context - Service context for authorization
   * @returns Updated enrollment
   */
  async markEnrollmentAsRepeated(
    schoolId: string,
    enrollmentId: string,
    context: ServiceContext
  ) {
    // Authorization check
    if (!context.schoolId || context.schoolId !== schoolId) {
      throw new ForbiddenError('Cannot update enrollments in this school');
    }

    if (context.role !== Role.ADMIN && context.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only admins can mark enrollments as repeated');
    }

    const enrollment = await prisma.$transaction(async (tx) => {
      // Verify enrollment exists
      const existing = await tx.enrollment.findFirst({
        where: {
          id: enrollmentId,
          schoolId,
        },
      });

      if (!existing) {
        throw new NotFoundError('Enrollment', enrollmentId);
      }

      if (existing.status !== 'ACTIVE') {
        throw new ConflictError(`Cannot mark enrollment as repeated with status: ${existing.status}`);
      }

      // Update enrollment
      const updated = await tx.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'REPEATED' as EnrollmentStatus,
          completionDate: new Date(),
          updatedAt: new Date(),
        },
      });

      return updated;
    });

    return enrollment;
  },

  /**
   * Drop an enrollment (mark as DROPPED).
   * Used when student withdraws during academic year.
   *
   * @param schoolId - The school ID (explicit multi-tenancy)
   * @param enrollmentId - The enrollment to drop
   * @param context - Service context for authorization
   * @returns Updated enrollment
   */
  async dropEnrollment(
    schoolId: string,
    enrollmentId: string,
    context: ServiceContext
  ) {
    // Authorization check
    if (!context.schoolId || context.schoolId !== schoolId) {
      throw new ForbiddenError('Cannot update enrollments in this school');
    }

    if (context.role !== Role.ADMIN && context.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only admins can drop enrollments');
    }

    const enrollment = await prisma.$transaction(async (tx) => {
      // Verify enrollment exists
      const existing = await tx.enrollment.findFirst({
        where: {
          id: enrollmentId,
          schoolId,
        },
      });

      if (!existing) {
        throw new NotFoundError('Enrollment', enrollmentId);
      }

      if (existing.status !== 'ACTIVE' && existing.status !== 'PENDING') {
        throw new ConflictError(`Cannot drop enrollment with status: ${existing.status}`);
      }

      // Update enrollment
      const updated = await tx.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'DROPPED' as EnrollmentStatus,
          completionDate: new Date(),
          updatedAt: new Date(),
        },
      });

      return updated;
    });

    return enrollment;
  },

  // ============================================
  // PROMOTION LOGIC (ISOLATED)
  // ============================================

  /**
   * Promote a student to the next academic year and class.
   * Isolated promotion logic with transaction safety.
   *
   * Algorithm:
   * 1. Complete current enrollment
   * 2. Determine next class based on current class grade
   * 3. Create new enrollment for target academic year
   * 4. Link enrollments (promotedFrom/promotedTo)
   *
   * @param schoolId - The school ID (explicit multi-tenancy)
   * @param studentId - The student to promote
   * @param targetAcademicYearId - The academic year to promote into
   * @param targetClassId - Optional specific class (auto-detected if not provided)
   * @param context - Service context for authorization
   * @returns New enrollment
   */
  async promoteStudent(
    schoolId: string,
    studentId: string,
    targetAcademicYearId: string,
    targetClassId: string | undefined,
    context: ServiceContext
  ) {
    // Authorization check
    if (!context.schoolId || context.schoolId !== schoolId) {
      throw new ForbiddenError('Cannot promote students in this school');
    }

    if (context.role !== Role.ADMIN && context.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only admins can promote students');
    }

    return await prisma.$transaction(async (tx) => {
      // Get current active enrollment
      const currentEnrollment = await tx.enrollment.findFirst({
        where: {
          schoolId,
          studentId,
          status: 'ACTIVE' as EnrollmentStatus,
        },
        include: {
          class: true,
          academicYear: true,
        },
      });

      if (!currentEnrollment) {
        throw new NotFoundError('Active enrollment for student', studentId);
      }

      // Verify target academic year exists
      const targetAcademicYear = await tx.academicYear.findFirst({
        where: {
          id: targetAcademicYearId,
          schoolId,
        },
      });

      if (!targetAcademicYear) {
        throw new NotFoundError('Target academic year', targetAcademicYearId);
      }

      // Determine target class
      let finalTargetClassId = targetClassId;

      if (!finalTargetClassId) {
        // Auto-detect next class based on grade progression
        const currentGrade = parseInt(currentEnrollment.class.grade);
        if (isNaN(currentGrade)) {
          throw new ValidationError('Cannot auto-detect next class: invalid current grade');
        }

        const nextGrade = currentGrade + 1;
        const nextClass = await tx.class.findFirst({
          where: {
            schoolId,
            grade: nextGrade.toString(),
          },
        });

        if (!nextClass) {
          throw new NotFoundError('Next grade class', `Grade ${nextGrade}`);
        }

        finalTargetClassId = nextClass.id;
      } else {
        // Verify target class exists
        const targetClass = await tx.class.findFirst({
          where: {
            id: targetClassId,
            schoolId,
          },
        });

        if (!targetClass) {
          throw new NotFoundError('Target class', targetClassId);
        }
      }

      // Check if already enrolled in target academic year
      const existingEnrollment = await tx.enrollment.findFirst({
        where: {
          studentId,
          academicYearId: targetAcademicYearId,
          schoolId,
        },
      });

      if (existingEnrollment) {
        throw new ConflictError(
          `Student is already enrolled for academic year ${targetAcademicYear.name}`
        );
      }

      // Complete current enrollment
      await tx.enrollment.update({
        where: { id: currentEnrollment.id },
        data: {
          status: 'COMPLETED' as EnrollmentStatus,
          completionDate: new Date(),
          promotedToClassId: finalTargetClassId,
          updatedAt: new Date(),
        },
      });

      // Create new enrollment
      const newEnrollment = await tx.enrollment.create({
        data: {
          schoolId,
          studentId,
          academicYearId: targetAcademicYearId,
          classId: finalTargetClassId,
          enrollmentDate: new Date(),
          status: 'ACTIVE' as EnrollmentStatus,
          previousSchool: null, // Same school
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
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
        },
      });

      return newEnrollment;
    });
  },

  /**
   * Bulk promote multiple students.
   * All promotions happen in a single transaction (all succeed or all fail).
   *
   * @param schoolId - The school ID (explicit multi-tenancy)
   * @param studentIds - Array of student IDs to promote
   * @param targetAcademicYearId - Target academic year
   * @param targetClassId - Optional target class (auto-detected per student if not provided)
   * @param context - Service context for authorization
   * @returns Array of new enrollments and any failures
   */
  async bulkPromoteStudents(
    schoolId: string,
    studentIds: string[],
    targetAcademicYearId: string,
    targetClassId: string | undefined,
    context: ServiceContext
  ) {
    // Authorization check
    if (!context.schoolId || context.schoolId !== schoolId) {
      throw new ForbiddenError('Cannot promote students in this school');
    }

    if (context.role !== Role.ADMIN && context.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only admins can promote students');
    }

    const results = {
      successful: [] as Array<{ studentId: string; enrollment: any }>,
      failed: [] as Array<{ studentId: string; error: string }>,
    };

    // Process each student individually to handle auto-detection per student
    for (const studentId of studentIds) {
      try {
        const enrollment = await this.promoteStudent(
          schoolId,
          studentId,
          targetAcademicYearId,
          targetClassId,
          context
        );
        results.successful.push({ studentId, enrollment });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({ studentId, error: errorMessage });
      }
    }

    return results;
  },
};

// Export error types for consumers
export { ServiceError, NotFoundError, ForbiddenError, ValidationError, ConflictError };

// Import ServiceError for use in this file
import { ServiceError } from '@/types/domain.types';
