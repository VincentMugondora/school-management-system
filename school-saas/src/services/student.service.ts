import { prisma } from '@/lib/db';
import { Prisma, Gender, Role } from '@prisma/client';
import {
  ServiceContext,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '@/types/domain.types';
import {
  StudentStatus,
  EnrollmentStatus,
  GuardianRelationship,
  CreateStudentInput,
  CreateGuardianInput,
  UpdateStudentInput,
  StudentFilters,
} from '@/types/student.domain';

/**
 * StudentService
 *
 * Admin-level service for managing students in a multi-tenant school system.
 * All methods require explicit schoolId and enforce proper authorization.
 * Uses transactions for operations involving multiple entities.
 */
export const StudentService = {
  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create a new student with optional initial enrollment and guardians.
   * Uses Prisma transaction to ensure atomic creation.
   *
   * @param schoolId - The school ID (explicit multi-tenancy)
   * @param input - Student creation data
   * @param context - Service context for authorization
   * @returns The created student with relations
   * @throws ForbiddenError if user lacks permission
   * @throws ValidationError if required fields missing
   * @throws ConflictError if admission number exists
   */
  async createStudent(
    schoolId: string,
    input: CreateStudentInput,
    context: ServiceContext
  ) {
    // Authorization check
    if (!context.schoolId || context.schoolId !== schoolId) {
      throw new ForbiddenError('Cannot create students for this school');
    }

    if (context.role !== Role.ADMIN && context.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only admins can create students');
    }

    // Validation
    if (!input.firstName?.trim() || !input.lastName?.trim()) {
      throw new ValidationError('First name and last name are required');
    }

    if (!input.classId || !input.academicYearId) {
      throw new ValidationError('Class and academic year are required for enrollment');
    }

    // Check for duplicate admission number
    if (input.admissionNumber) {
      const existing = await prisma.student.findFirst({
        where: {
          schoolId,
          admissionNumber: input.admissionNumber,
          deletedAt: null,
        },
      });
      if (existing) {
        throw new ConflictError(`Admission number ${input.admissionNumber} already exists`);
      }
    }

    // Execute transaction
    const student = await prisma.$transaction(async (tx) => {
      // Create the student
      const newStudent = await tx.student.create({
        data: {
          schoolId,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
          email: input.email?.toLowerCase().trim(),
          phone: input.phone,
          address: input.address,
          admissionNumber: input.admissionNumber,
          status: 'ACTIVE' as StudentStatus,
        },
      });

      // Create initial enrollment
      await tx.enrollment.create({
        data: {
          schoolId,
          studentId: newStudent.id,
          academicYearId: input.academicYearId,
          classId: input.classId,
          enrollmentDate: input.enrollmentDate || new Date(),
          status: 'ACTIVE' as EnrollmentStatus,
        },
      });

      // Create guardians if provided
      if (input.guardians && input.guardians.length > 0) {
        for (const guardianInput of input.guardians) {
          const guardian = await tx.guardian.create({
            data: {
              schoolId,
              firstName: guardianInput.firstName.trim(),
              lastName: guardianInput.lastName.trim(),
              email: guardianInput.email?.toLowerCase().trim(),
              phone: guardianInput.phone,
              address: guardianInput.address,
              relationship: guardianInput.relationship,
              isPrimaryContact: guardianInput.isPrimaryContact ?? false,
              isEmergencyContact: guardianInput.isEmergencyContact ?? false,
            },
          });

          // Link guardian to student
          await tx.student.update({
            where: { id: newStudent.id },
            data: {
              guardians: {
                connect: { id: guardian.id },
              },
            },
          });
        }
      }

      // Return student with relations
      return tx.student.findUnique({
        where: { id: newStudent.id },
        include: {
          guardians: true,
          enrollments: {
            include: {
              academicYear: { select: { id: true, name: true, isCurrent: true } },
              class: { select: { id: true, name: true, grade: true } },
            },
          },
        },
      });
    });

    if (!student) {
      throw new ServiceError('Failed to create student', 'CREATE_FAILED', 500);
    }

    return student;
  },

  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Get a list of students with filtering and pagination.
   *
   * @param schoolId - The school ID (explicit multi-tenancy)
   * @param filters - Optional filters for search, gender, status, etc.
   * @param context - Service context for authorization
   * @returns List of students with pagination info
   * @throws ForbiddenError if user lacks permission
   */
  async getStudents(
    schoolId: string,
    filters: StudentFilters = {},
    context: ServiceContext
  ) {
    // Authorization check
    if (!context.schoolId || context.schoolId !== schoolId) {
      throw new ForbiddenError('Cannot access students from this school');
    }

    const {
      search,
      gender,
      status,
      classId,
      academicYearId,
      hasGuardian,
      page = 1,
      limit = 20,
    } = filters;

    // Build where clause
    const where: Prisma.StudentWhereInput = {
      schoolId,
      deletedAt: null, // Exclude soft-deleted
    };

    // Search by name or admission number
    if (search?.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { admissionNumber: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Apply filters
    if (gender) {
      where.gender = gender;
    }

    if (status) {
      where.status = status;
    }

    // Filter by current enrollment class/academic year
    if (classId || academicYearId) {
      where.enrollments = {
        some: {
          status: 'ACTIVE' as EnrollmentStatus,
          ...(classId && { classId }),
          ...(academicYearId && { academicYearId }),
        },
      };
    }

    // Filter by guardian presence
    if (hasGuardian !== undefined) {
      where.guardians = hasGuardian ? { some: {} } : { none: {} };
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          guardians: {
            where: { deletedAt: null },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              isPrimaryContact: true,
            },
          },
          enrollments: {
            where: { status: 'ACTIVE' as EnrollmentStatus },
            include: {
              academicYear: { select: { id: true, name: true, isCurrent: true } },
              class: { select: { id: true, name: true, grade: true } },
            },
          },
          _count: {
            select: {
              enrollments: true,
              results: true,
              attendances: true,
            },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    return {
      students,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get a single student by ID with full details.
   *
   * @param schoolId - The school ID (explicit multi-tenancy)
   * @param studentId - The student ID to fetch
   * @param context - Service context for authorization
   * @returns Student with all relations
   * @throws NotFoundError if student not found
   * @throws ForbiddenError if user lacks permission
   */
  async getStudentById(
    schoolId: string,
    studentId: string,
    context: ServiceContext
  ) {
    // Authorization check
    if (!context.schoolId || context.schoolId !== schoolId) {
      throw new ForbiddenError('Cannot access students from this school');
    }

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
        deletedAt: null,
      },
      include: {
        guardians: {
          where: { deletedAt: null },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        enrollments: {
          orderBy: { enrollmentDate: 'desc' },
          include: {
            academicYear: { select: { id: true, name: true, isCurrent: true } },
            class: { select: { id: true, name: true, grade: true } },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            results: true,
            attendances: true,
            invoices: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundError('Student', studentId);
    }

    return student;
  },

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update student information.
   *
   * @param schoolId - The school ID (explicit multi-tenancy)
   * @param studentId - The student ID to update
   * @param input - Update data
   * @param context - Service context for authorization
   * @returns Updated student
   * @throws NotFoundError if student not found
   * @throws ForbiddenError if user lacks permission
   * @throws ConflictError if admission number collision
   */
  async updateStudent(
    schoolId: string,
    studentId: string,
    input: UpdateStudentInput,
    context: ServiceContext
  ) {
    // Authorization check
    if (!context.schoolId || context.schoolId !== schoolId) {
      throw new ForbiddenError('Cannot update students from this school');
    }

    if (context.role !== Role.ADMIN && context.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only admins can update students');
    }

    // Verify student exists and belongs to school
    const existingStudent = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
        deletedAt: null,
      },
    });

    if (!existingStudent) {
      throw new NotFoundError('Student', studentId);
    }

    // Check admission number uniqueness if changing
    if (input.admissionNumber && input.admissionNumber !== existingStudent.admissionNumber) {
      const duplicate = await prisma.student.findFirst({
        where: {
          schoolId,
          admissionNumber: input.admissionNumber,
          deletedAt: null,
          id: { not: studentId },
        },
      });
      if (duplicate) {
        throw new ConflictError(`Admission number ${input.admissionNumber} already exists`);
      }
    }

    // Build update data
    const updateData: Prisma.StudentUpdateInput = {};

    if (input.firstName !== undefined) {
      updateData.firstName = input.firstName.trim();
    }
    if (input.lastName !== undefined) {
      updateData.lastName = input.lastName.trim();
    }
    if (input.dateOfBirth !== undefined) {
      updateData.dateOfBirth = input.dateOfBirth;
    }
    if (input.gender !== undefined) {
      updateData.gender = input.gender;
    }
    if (input.email !== undefined) {
      updateData.email = input.email?.toLowerCase().trim() || null;
    }
    if (input.phone !== undefined) {
      updateData.phone = input.phone;
    }
    if (input.address !== undefined) {
      updateData.address = input.address;
    }
    if (input.admissionNumber !== undefined) {
      updateData.admissionNumber = input.admissionNumber;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    updateData.updatedAt = new Date();

    // Update student
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: updateData,
      include: {
        guardians: {
          where: { deletedAt: null },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        enrollments: {
          where: { status: 'ACTIVE' as EnrollmentStatus },
          include: {
            academicYear: { select: { id: true, name: true } },
            class: { select: { id: true, name: true } },
          },
        },
      },
    });

    return updatedStudent;
  },

  // ============================================
  // STATUS OPERATIONS
  // ============================================

  /**
   * Suspend a student (updates student status and active enrollments).
   *
   * @param schoolId - The school ID (explicit multi-tenancy)
   * @param studentId - The student ID to suspend
   * @param context - Service context for authorization
   * @returns Updated student
   * @throws NotFoundError if student not found
   * @throws ForbiddenError if user lacks permission
   */
  async suspendStudent(
    schoolId: string,
    studentId: string,
    context: ServiceContext
  ) {
    // Authorization check
    if (!context.schoolId || context.schoolId !== schoolId) {
      throw new ForbiddenError('Cannot suspend students from this school');
    }

    if (context.role !== Role.ADMIN && context.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only admins can suspend students');
    }

    // Execute transaction
    const student = await prisma.$transaction(async (tx) => {
      // Verify student exists
      const existingStudent = await tx.student.findFirst({
        where: {
          id: studentId,
          schoolId,
          deletedAt: null,
        },
        include: {
          enrollments: {
            where: { status: 'ACTIVE' as EnrollmentStatus },
          },
        },
      });

      if (!existingStudent) {
        throw new NotFoundError('Student', studentId);
      }

      // Update student status
      const updated = await tx.student.update({
        where: { id: studentId },
        data: {
          status: 'SUSPENDED' as StudentStatus,
          updatedAt: new Date(),
        },
      });

      // Suspend active enrollments
      for (const enrollment of existingStudent.enrollments) {
        await tx.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: 'SUSPENDED' as EnrollmentStatus,
            updatedAt: new Date(),
          },
        });
      }

      return updated;
    });

    return student;
  },

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete a student (marks as deleted without removing data).
   * Also soft-deletes associated guardians that are not linked to other students.
   *
   * @param schoolId - The school ID (explicit multi-tenancy)
   * @param studentId - The student ID to delete
   * @param context - Service context for authorization
   * @returns Void
   * @throws NotFoundError if student not found
   * @throws ForbiddenError if user lacks permission
   * @throws ConflictError if student has unpaid invoices
   */
  async softDeleteStudent(
    schoolId: string,
    studentId: string,
    context: ServiceContext
  ) {
    // Authorization check
    if (!context.schoolId || context.schoolId !== schoolId) {
      throw new ForbiddenError('Cannot delete students from this school');
    }

    if (context.role !== Role.ADMIN && context.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only admins can delete students');
    }

    // Execute transaction
    await prisma.$transaction(async (tx) => {
      // Verify student exists and get related data
      const student = await tx.student.findFirst({
        where: {
          id: studentId,
          schoolId,
          deletedAt: null,
        },
        include: {
          invoices: {
            where: {
              status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
            },
          },
          guardians: true,
          enrollments: {
            where: { status: 'ACTIVE' as EnrollmentStatus },
          },
        },
      });

      if (!student) {
        throw new NotFoundError('Student', studentId);
      }

      // Check for unpaid invoices
      if (student.invoices.length > 0) {
        throw new ConflictError(
          `Cannot delete student with ${student.invoices.length} unpaid invoice(s)`
        );
      }

      // Drop active enrollments
      for (const enrollment of student.enrollments) {
        await tx.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: 'DROPPED' as EnrollmentStatus,
            updatedAt: new Date(),
          },
        });
      }

      // Soft delete the student
      await tx.student.update({
        where: { id: studentId },
        data: {
          deletedAt: new Date(),
          status: 'INACTIVE' as StudentStatus,
          updatedAt: new Date(),
        },
      });

      // Check guardians for cleanup (soft-delete if not linked to other students)
      for (const guardian of student.guardians) {
        const otherStudentsCount = await tx.student.count({
          where: {
            guardians: {
              some: { id: guardian.id },
            },
            id: { not: studentId },
            deletedAt: null,
          },
        });

        if (otherStudentsCount === 0) {
          await tx.guardian.update({
            where: { id: guardian.id },
            data: {
              deletedAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      }
    });
  },
};

// Export error types for consumers
export { ServiceError, NotFoundError, ForbiddenError, ValidationError, ConflictError };
