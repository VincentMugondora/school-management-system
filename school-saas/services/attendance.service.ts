import { prisma } from '@/lib/db';
import { Attendance, Prisma } from '@prisma/client';
import {
  ServiceContext,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '@/types/domain.types';
import { requireRole, RoleGroups } from '@/lib/auth';

// ============================================
// ATTENDANCE SERVICE
// ============================================

export const AttendanceService = {
  /**
   * Mark attendance for a single student
   * @param data - Attendance data
   * @param context - Service context with user info
   * @returns Created or updated attendance
   */
  async markAttendance(
    data: {
      enrollmentId: string;
      termId: string;
      date: Date;
      isPresent: boolean;
      remarks?: string;
    },
    context: ServiceContext
  ): Promise<Attendance> {
    requireRole(context, RoleGroups.ACADEMIC_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Verify enrollment belongs to school
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: data.enrollmentId,
        schoolId: context.schoolId,
      },
      include: { student: true },
    });

    if (!enrollment) {
      throw new NotFoundError('Enrollment', data.enrollmentId);
    }

    // Verify term belongs to school
    const term = await prisma.term.findFirst({
      where: {
        id: data.termId,
        schoolId: context.schoolId,
      },
    });

    if (!term) {
      throw new NotFoundError('Term', data.termId);
    }

    // Check if term is locked
    if (term.isLocked) {
      throw new ValidationError('Cannot mark attendance for a locked term');
    }

    // Normalize date to start of day
    const normalizedDate = new Date(data.date);
    normalizedDate.setHours(0, 0, 0, 0);

    // Upsert attendance
    const attendance = await prisma.attendance.upsert({
      where: {
        enrollmentId_date: {
          enrollmentId: data.enrollmentId,
          date: normalizedDate,
        },
      },
      update: {
        isPresent: data.isPresent,
        remarks: data.remarks,
        termId: data.termId,
      },
      create: {
        enrollmentId: data.enrollmentId,
        studentId: enrollment.studentId,
        termId: data.termId,
        schoolId: context.schoolId,
        date: normalizedDate,
        isPresent: data.isPresent,
        remarks: data.remarks,
      },
    });

    return attendance;
  },

  /**
   * Bulk update attendance for a class
   * @param data - Bulk attendance data
   * @param context - Service context with user info
   * @returns Attendance records with success and error counts
   */
  async bulkUpdateAttendance(
    data: {
      classId: string;
      termId: string;
      date: Date;
      attendances: {
        enrollmentId: string;
        isPresent: boolean;
        remarks?: string;
      }[];
    },
    context: ServiceContext
  ): Promise<{
    attendances: Attendance[];
    errors: { enrollmentId: string; error: string }[];
    successCount: number;
    errorCount: number;
  }> {
    requireRole(context, RoleGroups.ACADEMIC_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Verify class belongs to school
    const classRecord = await prisma.class.findFirst({
      where: {
        id: data.classId,
        schoolId: context.schoolId,
      },
    });

    if (!classRecord) {
      throw new NotFoundError('Class', data.classId);
    }

    // Verify term belongs to school
    const term = await prisma.term.findFirst({
      where: {
        id: data.termId,
        schoolId: context.schoolId,
      },
    });

    if (!term) {
      throw new NotFoundError('Term', data.termId);
    }

    // Check if term is locked
    if (term.isLocked) {
      throw new ValidationError('Cannot mark attendance for a locked term');
    }

    // Normalize date
    const normalizedDate = new Date(data.date);
    normalizedDate.setHours(0, 0, 0, 0);

    const results: Attendance[] = [];
    const errors: { enrollmentId: string; error: string }[] = [];

    // Process in transaction
    await prisma.$transaction(async (tx) => {
      for (const entry of data.attendances) {
        try {
          // Verify enrollment belongs to class and school
          const enrollment = await tx.enrollment.findFirst({
            where: {
              id: entry.enrollmentId,
              classId: data.classId,
              schoolId: context.schoolId,
              status: 'ACTIVE',
            },
          });

          if (!enrollment) {
            errors.push({ enrollmentId: entry.enrollmentId, error: 'Enrollment not found in class' });
            continue;
          }

          // Upsert attendance
          const attendance = await tx.attendance.upsert({
            where: {
              enrollmentId_date: {
                enrollmentId: entry.enrollmentId,
                date: normalizedDate,
              },
            },
            update: {
              isPresent: entry.isPresent,
              remarks: entry.remarks,
              termId: data.termId,
            },
            create: {
              enrollmentId: entry.enrollmentId,
              studentId: enrollment.studentId,
              termId: data.termId,
              schoolId: context.schoolId,
              date: normalizedDate,
              isPresent: entry.isPresent,
              remarks: entry.remarks,
            },
          });

          results.push(attendance);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ enrollmentId: entry.enrollmentId, error: errorMessage });
        }
      }
    });

    return {
      attendances: results,
      errors,
      successCount: results.length,
      errorCount: errors.length,
    };
  },

  /**
   * Get attendance for a specific date and class
   * @param classId - Class ID
   * @param date - Date
   * @param context - Service context with user info
   * @returns List of attendance records
   */
  async getAttendanceByClassAndDate(
    classId: string,
    date: Date,
    context: ServiceContext
  ): Promise<
    (Attendance & {
      student: { firstName: string; lastName: string; studentId: string | null };
    })[]
  > {
    requireRole(context, RoleGroups.ALL_STAFF);

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

    // Normalize date
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const attendances = await prisma.attendance.findMany({
      where: {
        date: normalizedDate,
        schoolId: context.schoolId,
        enrollment: {
          classId,
        },
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentId: true,
          },
        },
      },
      orderBy: {
        student: {
          firstName: 'asc',
        },
      },
    });

    return attendances;
  },

  /**
   * Get attendance for a student in a term
   * @param studentId - Student ID
   * @param termId - Term ID
   * @param context - Service context with user info
   * @returns Attendance records and statistics
   */
  async getAttendanceByStudentAndTerm(
    studentId: string,
    termId: string,
    context: ServiceContext
  ): Promise<{
    attendances: Attendance[];
    totalDays: number;
    presentDays: number;
    absentDays: number;
    attendancePercentage: number;
  }> {
    requireRole(context, RoleGroups.ALL_STAFF);

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

    // Verify term belongs to school
    const term = await prisma.term.findFirst({
      where: {
        id: termId,
        schoolId: context.schoolId,
      },
    });

    if (!term) {
      throw new NotFoundError('Term', termId);
    }

    const attendances = await prisma.attendance.findMany({
      where: {
        studentId,
        termId,
        schoolId: context.schoolId,
      },
      orderBy: { date: 'desc' },
    });

    const totalDays = attendances.length;
    const presentDays = attendances.filter(a => a.isPresent).length;
    const absentDays = totalDays - presentDays;
    const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return {
      attendances,
      totalDays,
      presentDays,
      absentDays,
      attendancePercentage: parseFloat(attendancePercentage.toFixed(2)),
    };
  },

  /**
   * Get attendance summary for a class in a term
   * @param classId - Class ID
   * @param termId - Term ID
   * @param context - Service context with user info
   * @returns Class attendance statistics
   */
  async getClassAttendanceSummary(
    classId: string,
    termId: string,
    context: ServiceContext
  ): Promise<{
    totalStudents: number;
    totalDays: number;
    averageAttendancePercentage: number;
    studentSummaries: {
      studentId: string;
      studentName: string;
      totalDays: number;
      presentDays: number;
      attendancePercentage: number;
    }[];
  }> {
    requireRole(context, RoleGroups.ALL_STAFF);

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

    // Verify term belongs to school
    const term = await prisma.term.findFirst({
      where: {
        id: termId,
        schoolId: context.schoolId,
      },
    });

    if (!term) {
      throw new NotFoundError('Term', termId);
    }

    // Get all active enrollments in class
    const enrollments = await prisma.enrollment.findMany({
      where: {
        classId,
        schoolId: context.schoolId,
        status: 'ACTIVE',
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        attendances: {
          where: { termId },
        },
      },
    });

    // Calculate unique attendance days in the term for this class
    const uniqueDays = await prisma.attendance.count({
      where: {
        termId,
        schoolId: context.schoolId,
        enrollment: {
          classId,
        },
      },
      distinct: ['date'],
    });

    const studentSummaries = enrollments.map(enrollment => {
      const totalDays = enrollment.attendances.length;
      const presentDays = enrollment.attendances.filter(a => a.isPresent).length;
      const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      return {
        studentId: enrollment.student.id,
        studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
        totalDays,
        presentDays,
        attendancePercentage: parseFloat(attendancePercentage.toFixed(2)),
      };
    });

    // Sort by attendance percentage descending
    studentSummaries.sort((a, b) => b.attendancePercentage - a.attendancePercentage);

    // Calculate class average
    const averageAttendancePercentage =
      studentSummaries.length > 0
        ? studentSummaries.reduce((sum, s) => sum + s.attendancePercentage, 0) /
          studentSummaries.length
        : 0;

    return {
      totalStudents: enrollments.length,
      totalDays: uniqueDays,
      averageAttendancePercentage: parseFloat(averageAttendancePercentage.toFixed(2)),
      studentSummaries,
    };
  },

  /**
   * Get attendance report for a date range
   * @param classId - Class ID
   * @param startDate - Start date
   * @param endDate - End date
   * @param context - Service context with user info
   * @returns Attendance records grouped by date
   */
  async getAttendanceReport(
    classId: string,
    startDate: Date,
    endDate: Date,
    context: ServiceContext
  ): Promise<{
    dates: Date[];
    studentAttendance: {
      studentId: string;
      studentName: string;
      attendanceByDate: { [date: string]: boolean };
      totalPresent: number;
      totalAbsent: number;
    }[];
  }> {
    requireRole(context, RoleGroups.ALL_STAFF);

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

    // Get all active enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: {
        classId,
        schoolId: context.schoolId,
        status: 'ACTIVE',
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        attendances: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    });

    // Get unique dates
    const attendances = await prisma.attendance.findMany({
      where: {
        schoolId: context.schoolId,
        enrollment: { classId },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      distinct: ['date'],
      select: { date: true },
      orderBy: { date: 'asc' },
    });

    const dates = attendances.map(a => a.date);

    // Build student attendance map
    const studentAttendance = enrollments.map(enrollment => {
      const attendanceByDate: { [date: string]: boolean } = {};
      let totalPresent = 0;
      let totalAbsent = 0;

      enrollment.attendances.forEach(a => {
        const dateStr = a.date.toISOString().split('T')[0];
        attendanceByDate[dateStr] = a.isPresent;
        if (a.isPresent) totalPresent++;
        else totalAbsent++;
      });

      return {
        studentId: enrollment.student.id,
        studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
        attendanceByDate,
        totalPresent,
        totalAbsent,
      };
    });

    return { dates, studentAttendance };
  },

  /**
   * Delete attendance record
   * @param id - Attendance ID
   * @param context - Service context with user info
   */
  async deleteAttendance(id: string, context: ServiceContext): Promise<void> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Check if attendance exists and belongs to school
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
    });

    if (!existingAttendance) {
      throw new NotFoundError('Attendance', id);
    }

    await prisma.attendance.delete({
      where: { id },
    });
  },
};

export default AttendanceService;
