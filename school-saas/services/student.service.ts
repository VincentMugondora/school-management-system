import { prisma } from '@/lib/db';
import { Student, Gender, Role, Prisma } from '@prisma/client';
import {
  ServiceContext,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/types/domain.types';
import { AuditService } from './audit.service';

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
    throw new ForbiddenError('Only ADMIN can manage students');
  }
}

// ============================================
// STUDENT SERVICE
// ============================================

export const StudentService = {
  /**
   * Create a new student
   * @param data - Student creation data
   * @param context - Service context with user info
   * @returns Created student
   */
  async createStudent(
    data: {
      firstName: string;
      lastName: string;
      dateOfBirth?: Date;
      gender?: Gender;
      address?: string;
      phone?: string;
      email?: string;
      studentId?: string;
      parentId?: string;
    },
    context: ServiceContext
  ): Promise<Student> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Check if studentId is unique if provided
    if (data.studentId) {
      const existing = await prisma.student.findFirst({
        where: {
          schoolId: context.schoolId,
          studentId: data.studentId,
        },
      });
      if (existing) {
        throw new ConflictError('Student ID already exists');
      }
    }

    const student = await prisma.student.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        address: data.address,
        phone: data.phone,
        email: data.email?.toLowerCase().trim(),
        studentId: data.studentId,
        parentId: data.parentId,
        schoolId: context.schoolId,
      },
    });

    return student;
  },

  /**
   * Get student by ID
   * @param id - Student ID
   * @param context - Service context with user info
   * @returns Student or null
   */
  async getStudentById(
    id: string,
    context: ServiceContext
  ) {
    requireAdminOrAbove(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const student = await prisma.student.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
        deletedAt: null,
      },
      include: {
        parent: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        enrollments: {
          select: {
            id: true,
            status: true,
            academicYear: {
              select: { name: true },
            },
            class: {
              select: { name: true },
            },
          },
          orderBy: { enrollmentDate: 'desc' },
        },
        _count: {
          select: {
            enrollments: true,
            results: true,
            attendances: true,
          },
        },
      },
    });

    return student;
  },

  /**
   * Get student by student ID (admission number)
   * @param studentId - Student admission ID
   * @param schoolId - School ID
   * @returns Student or null
   */
  async getStudentByStudentId(
    studentId: string,
    schoolId: string
  ): Promise<Student | null> {
    const student = await prisma.student.findFirst({
      where: {
        studentId,
        schoolId,
        deletedAt: null,
      },
    });

    return student;
  },

  /**
   * List students for a school
   * @param context - Service context with user info
   * @param filters - Optional filters
   * @returns List of students
   */
  async listStudents(
    context: ServiceContext,
    filters?: {
      search?: string;
      gender?: Gender;
      hasParent?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<{ students: Student[]; total: number }> {
    requireAdminOrAbove(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const where: Prisma.StudentWhereInput = {
      schoolId: context.schoolId,
      deletedAt: null,
    };

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { studentId: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.gender) {
      where.gender = filters.gender;
    }

    if (filters?.hasParent !== undefined) {
      where.parentId = filters.hasParent ? { not: null } : null;
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          parent: {
            select: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              enrollments: {
                where: { status: 'ACTIVE' },
              },
            },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    return { students, total };
  },

  /**
   * Update student
   * @param id - Student ID
   * @param data - Update data
   * @param context - Service context with user info
   * @returns Updated student
   */
  async updateStudent(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: Date | null;
      gender?: Gender | null;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      studentId?: string | null;
      parentId?: string | null;
    },
    context: ServiceContext
  ): Promise<Student> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Check if student exists and belongs to school
    const existingStudent = await prisma.student.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
        deletedAt: null,
      },
    });

    if (!existingStudent) {
      throw new NotFoundError('Student', id);
    }

    // Check studentId uniqueness if changing
    if (data.studentId && data.studentId !== existingStudent.studentId) {
      const existing = await prisma.student.findFirst({
        where: {
          schoolId: context.schoolId,
          studentId: data.studentId,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictError('Student ID already exists');
      }
    }

    const updateData: Prisma.StudentUpdateInput = {};

    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName.trim();
    }
    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName.trim();
    }
    if (data.dateOfBirth !== undefined) {
      updateData.dateOfBirth = data.dateOfBirth;
    }
    if (data.gender !== undefined) {
      updateData.gender = data.gender;
    }
    if (data.address !== undefined) {
      updateData.address = data.address;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone;
    }
    if (data.email !== undefined) {
      updateData.email = data.email?.toLowerCase().trim() || null;
    }
    if (data.studentId !== undefined) {
      updateData.studentId = data.studentId;
    }
    if (data.parentId !== undefined) {
      updateData.parent = data.parentId ? { connect: { id: data.parentId } } : { disconnect: true };
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: updateData,
    });

    // Audit log the update
    await AuditService.logUpdate(
      context,
      'STUDENT',
      id,
      {
        firstName: existingStudent.firstName,
        lastName: existingStudent.lastName,
        dateOfBirth: existingStudent.dateOfBirth,
        gender: existingStudent.gender,
        address: existingStudent.address,
        phone: existingStudent.phone,
        email: existingStudent.email,
        studentId: existingStudent.studentId,
        parentId: existingStudent.parentId,
      },
      {
        firstName: updatedStudent.firstName,
        lastName: updatedStudent.lastName,
        dateOfBirth: updatedStudent.dateOfBirth,
        gender: updatedStudent.gender,
        address: updatedStudent.address,
        phone: updatedStudent.phone,
        email: updatedStudent.email,
        studentId: updatedStudent.studentId,
        parentId: updatedStudent.parentId,
      }
    );

    return updatedStudent;
  },

  /**
   * Soft delete student
   * @param id - Student ID
   * @param context - Service context with user info
   */
  async deleteStudent(id: string, context: ServiceContext): Promise<void> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Check if student exists and belongs to school
    const existingStudent = await prisma.student.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            enrollments: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    });

    if (!existingStudent) {
      throw new NotFoundError('Student', id);
    }

    // Check if there are active enrollments
    if (existingStudent._count.enrollments > 0) {
      throw new ConflictError(
        'Cannot delete student with active enrollments. Archive or transfer them first.'
      );
    }

    // Soft delete
    await prisma.student.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  /**
   * Restore soft-deleted student
   * @param id - Student ID
   * @param context - Service context with user info
   * @returns Restored student
   */
  async restoreStudent(id: string, context: ServiceContext): Promise<Student> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const existingStudent = await prisma.student.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
        deletedAt: { not: null },
      },
    });

    if (!existingStudent) {
      throw new NotFoundError('Deleted student', id);
    }

    const restoredStudent = await prisma.student.update({
      where: { id },
      data: { deletedAt: null },
    });

    return restoredStudent;
  },

  /**
   * Permanently delete student
   * @param id - Student ID
   * @param context - Service context with user info
   */
  async permanentlyDeleteStudent(id: string, context: ServiceContext): Promise<void> {
    requireAdmin(context);

    if (context.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Only SUPER_ADMIN can permanently delete students');
    }

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const existingStudent = await prisma.student.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
    });

    if (!existingStudent) {
      throw new NotFoundError('Student', id);
    }

    await prisma.student.delete({
      where: { id },
    });
  },

  /**
   * Get student academic history
   * @param studentId - Student ID
   * @param context - Service context
   * @returns Academic history with enrollments
   */
  async getStudentAcademicHistory(
    studentId: string,
    context: ServiceContext
  ) {
    requireAdminOrAbove(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        schoolId: context.schoolId,
      },
      include: {
        academicYear: { select: { id: true, name: true } },
        class: { select: { id: true, name: true, grade: true } },
        results: {
          include: {
            exam: {
              select: {
                name: true,
                maxMarks: true,
                subject: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { enrollmentDate: 'desc' },
    });

    return enrollments;
  },

  /**
   * Get student attendance summary
   * @param studentId - Student ID
   * @param context - Service context
   * @returns Attendance data grouped by term
   */
  async getStudentAttendance(
    studentId: string,
    context: ServiceContext
  ) {
    requireAdminOrAbove(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId,
        schoolId: context.schoolId,
      },
      include: {
        term: { select: { id: true, name: true, academicYear: { select: { name: true } } } },
      },
      orderBy: { date: 'desc' },
    });

    // Group by term
    const grouped = attendanceRecords.reduce((acc, record) => {
      const key = record.termId;
      if (!acc[key]) {
        acc[key] = {
          termId: record.termId,
          termName: record.term.name,
          academicYearName: record.term.academicYear.name,
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
        };
      }
      acc[key].totalDays++;
      if (record.isPresent) {
        acc[key].presentDays++;
      } else {
        acc[key].absentDays++;
      }
      return acc;
    }, {} as Record<string, { termId: string; termName: string; academicYearName: string; totalDays: number; presentDays: number; absentDays: number }>);

    return Object.values(grouped).map((group) => ({
      ...group,
      percentage: Math.round((group.presentDays / group.totalDays) * 100) || 0,
    }));
  },

  /**
   * Get student results
   * @param studentId - Student ID
   * @param context - Service context
   * @returns Results grouped by academic year and term
   */
  async getStudentResults(
    studentId: string,
    context: ServiceContext
  ) {
    requireAdminOrAbove(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const results = await prisma.result.findMany({
      where: {
        studentId,
        schoolId: context.schoolId,
      },
      include: {
        exam: {
          include: {
            subject: { select: { name: true } },
            term: { select: { name: true, academicYear: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return results;
  },

  /**
   * Get student fees overview
   * @param studentId - Student ID
   * @param context - Service context
   * @returns Fee invoices with payments
   */
  async getStudentFees(
    studentId: string,
    context: ServiceContext
  ) {
    requireAdminOrAbove(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        studentId,
        schoolId: context.schoolId,
      },
      include: {
        term: { select: { name: true, academicYear: { select: { name: true } } } },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            paymentDate: true,
          },
          orderBy: { paymentDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invoices;
  },

  /**
   * Get student guardians
   * @param studentId - Student ID
   * @param context - Service context
   * @returns Parent/guardian details
   */
  async getStudentGuardians(
    studentId: string,
    context: ServiceContext
  ) {
    requireAdminOrAbove(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: context.schoolId,
      },
      include: {
        parent: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!student?.parentId) {
      return [];
    }

    const parent = await prisma.parent.findFirst({
      where: { id: student.parentId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return parent ? [parent] : [];
  },

  /**
   * Suspend student (soft suspension by status update)
   * @param studentId - Student ID
   * @param reason - Suspension reason
   * @param context - Service context
   */
  async suspendStudent(
    studentId: string,
    reason: string,
    context: ServiceContext
  ): Promise<void> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: context.schoolId,
        deletedAt: null,
      },
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!student) {
      throw new NotFoundError('Student', studentId);
    }

    // Update all active enrollments to DROPPED status
    await prisma.enrollment.updateMany({
      where: {
        studentId,
        status: 'ACTIVE',
      },
      data: {
        status: 'DROPPED',
      },
    });
  },

  /**
   * Reactivate suspended student
   * @param studentId - Student ID
   * @param classId - Class to enroll in
   * @param academicYearId - Academic year
   * @param context - Service context
   */
  async reactivateStudent(
    studentId: string,
    classId: string,
    academicYearId: string,
    context: ServiceContext
  ): Promise<void> {
    requireAdmin(context);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: context.schoolId,
        deletedAt: null,
      },
    });

    if (!student) {
      throw new NotFoundError('Student', studentId);
    }

    // Check if enrollment already exists
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        academicYearId,
      },
    });

    if (existingEnrollment) {
      // Reactivate existing enrollment
      await prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: { status: 'ACTIVE', classId },
      });
    } else {
      // Create new enrollment
      await prisma.enrollment.create({
        data: {
          studentId,
          classId,
          academicYearId,
          schoolId: context.schoolId,
          status: 'ACTIVE',
        },
      });
    }
  },
};

export default StudentService;
