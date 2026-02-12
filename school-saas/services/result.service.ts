import { prisma } from '@/lib/db';
import { Result, Prisma } from '@prisma/client';
import {
  ServiceContext,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@/types/domain.types';
import { requireRole, RoleGroups } from '@/lib/auth';

// ============================================
// RESULT SERVICE
// ============================================

export const ResultService = {
  /**
   * Create or update a single result
   * @param data - Result data
   * @param context - Service context with user info
   * @returns Created or updated result
   */
  async upsertResult(
    data: {
      enrollmentId: string;
      examId: string;
      marks: number;
      grade?: string;
      remarks?: string;
    },
    context: ServiceContext
  ): Promise<Result> {
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

    // Verify exam belongs to school
    const exam = await prisma.exam.findFirst({
      where: {
        id: data.examId,
        schoolId: context.schoolId,
      },
    });

    if (!exam) {
      throw new NotFoundError('Exam', data.examId);
    }

    // Validate marks
    if (data.marks < 0 || data.marks > exam.maxMarks) {
      throw new ValidationError(`Marks must be between 0 and ${exam.maxMarks}`);
    }

    // Calculate grade if not provided
    let grade = data.grade;
    if (!grade) {
      grade = this.calculateGrade(data.marks, exam.maxMarks);
    }

    // Upsert result
    const result = await prisma.result.upsert({
      where: {
        enrollmentId_examId: {
          enrollmentId: data.enrollmentId,
          examId: data.examId,
        },
      },
      update: {
        marks: data.marks,
        grade,
        remarks: data.remarks,
      },
      create: {
        enrollmentId: data.enrollmentId,
        examId: data.examId,
        studentId: enrollment.studentId,
        schoolId: context.schoolId,
        marks: data.marks,
        grade,
        remarks: data.remarks,
      },
    });

    return result;
  },

  /**
   * Bulk enter results for a class/subject
   * @param data - Array of result entries
   * @param context - Service context with user info
   * @returns Results with success and error counts
   */
  async bulkEnterResults(
    data: {
      examId: string;
      results: {
        enrollmentId: string;
        marks: number;
        remarks?: string;
      }[];
    },
    context: ServiceContext
  ): Promise<{ 
    results: Result[]; 
    errors: { enrollmentId: string; error: string }[];
    successCount: number;
    errorCount: number;
  }> {
    requireRole(context, RoleGroups.ACADEMIC_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Verify exam belongs to school
    const exam = await prisma.exam.findFirst({
      where: {
        id: data.examId,
        schoolId: context.schoolId,
      },
    });

    if (!exam) {
      throw new NotFoundError('Exam', data.examId);
    }

    const results: Result[] = [];
    const errors: { enrollmentId: string; error: string }[] = [];

    // Process in transaction for atomicity
    await prisma.$transaction(async (tx) => {
      for (const entry of data.results) {
        try {
          // Verify enrollment belongs to school
          const enrollment = await tx.enrollment.findFirst({
            where: {
              id: entry.enrollmentId,
              schoolId: context.schoolId,
            },
          });

          if (!enrollment) {
            errors.push({ enrollmentId: entry.enrollmentId, error: 'Enrollment not found' });
            continue;
          }

          // Validate marks
          if (entry.marks < 0 || entry.marks > exam.maxMarks) {
            errors.push({ 
              enrollmentId: entry.enrollmentId, 
              error: `Marks must be between 0 and ${exam.maxMarks}` 
            });
            continue;
          }

          // Calculate grade
          const grade = this.calculateGrade(entry.marks, exam.maxMarks);

          // Upsert result
          const result = await tx.result.upsert({
            where: {
              enrollmentId_examId: {
                enrollmentId: entry.enrollmentId,
                examId: data.examId,
              },
            },
            update: {
              marks: entry.marks,
              grade,
              remarks: entry.remarks,
            },
            create: {
              enrollmentId: entry.enrollmentId,
              examId: data.examId,
              studentId: enrollment.studentId,
              schoolId: context.schoolId,
              marks: entry.marks,
              grade,
              remarks: entry.remarks,
            },
          });

          results.push(result);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ enrollmentId: entry.enrollmentId, error: errorMessage });
        }
      }
    });

    return {
      results,
      errors,
      successCount: results.length,
      errorCount: errors.length,
    };
  },

  /**
   * Get results for an exam
   * @param examId - Exam ID
   * @param context - Service context with user info
   * @returns List of results with rankings
   */
  async getResultsByExam(
    examId: string,
    context: ServiceContext
  ): Promise<
    (Result & {
      student: { firstName: string; lastName: string; studentId: string | null };
      enrollment: { class: { name: string; grade: string } };
      rank: number;
    })[]
  > {
    requireRole(context, RoleGroups.ALL_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Verify exam belongs to school
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        schoolId: context.schoolId,
      },
    });

    if (!exam) {
      throw new NotFoundError('Exam', examId);
    }

    const results = await prisma.result.findMany({
      where: {
        examId,
        schoolId: context.schoolId,
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentId: true,
          },
        },
        enrollment: {
          include: {
            class: {
              select: { name: true, grade: true },
            },
          },
        },
      },
      orderBy: { marks: 'desc' },
    });

    // Add rankings
    return results.map((result, index) => ({
      ...result,
      rank: index + 1,
    }));
  },

  /**
   * Get results for a student
   * @param studentId - Student ID
   * @param context - Service context with user info
   * @returns List of results
   */
  async getResultsByStudent(
    studentId: string,
    context: ServiceContext
  ): Promise<
    (Result & {
      exam: { name: string; maxMarks: number; subject: { name: string } };
    })[]
  > {
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

    const results = await prisma.result.findMany({
      where: {
        studentId,
        schoolId: context.schoolId,
      },
      include: {
        exam: {
          include: {
            subject: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return results;
  },

  /**
   * Calculate class averages and rankings for an exam
   * @param examId - Exam ID
   * @param context - Service context with user info
   * @returns Statistics and rankings
   */
  async calculateExamStatistics(
    examId: string,
    context: ServiceContext
  ): Promise<{
    totalStudents: number;
    averageMarks: number;
    highestMarks: number;
    lowestMarks: number;
    passCount: number;
    failCount: number;
    passPercentage: number;
  }> {
    requireRole(context, RoleGroups.ALL_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Verify exam belongs to school
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        schoolId: context.schoolId,
      },
    });

    if (!exam) {
      throw new NotFoundError('Exam', examId);
    }

    const results = await prisma.result.findMany({
      where: {
        examId,
        schoolId: context.schoolId,
      },
      select: { marks: true },
    });

    if (results.length === 0) {
      return {
        totalStudents: 0,
        averageMarks: 0,
        highestMarks: 0,
        lowestMarks: 0,
        passCount: 0,
        failCount: 0,
        passPercentage: 0,
      };
    }

    const marks = results.map(r => r.marks);
    const totalStudents = marks.length;
    const averageMarks = marks.reduce((a, b) => a + b, 0) / totalStudents;
    const highestMarks = Math.max(...marks);
    const lowestMarks = Math.min(...marks);
    
    // Calculate pass/fail (assuming 40% is passing)
    const passMark = exam.maxMarks * 0.4;
    const passCount = marks.filter(m => m >= passMark).length;
    const failCount = totalStudents - passCount;
    const passPercentage = (passCount / totalStudents) * 100;

    return {
      totalStudents,
      averageMarks: parseFloat(averageMarks.toFixed(2)),
      highestMarks,
      lowestMarks,
      passCount,
      failCount,
      passPercentage: parseFloat(passPercentage.toFixed(2)),
    };
  },

  /**
   * Calculate student overall performance across multiple exams
   * @param studentId - Student ID
   * @param academicYearId - Academic year ID
   * @param context - Service context with user info
   * @returns Overall statistics
   */
  async calculateStudentOverallPerformance(
    studentId: string,
    academicYearId: string,
    context: ServiceContext
  ): Promise<{
    totalExams: number;
    averagePercentage: number;
    highestPercentage: number;
    lowestPercentage: number;
    overallGrade: string;
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

    const results = await prisma.result.findMany({
      where: {
        studentId,
        schoolId: context.schoolId,
        exam: {
          academicYearId,
        },
      },
      include: {
        exam: {
          select: { maxMarks: true },
        },
      },
    });

    if (results.length === 0) {
      return {
        totalExams: 0,
        averagePercentage: 0,
        highestPercentage: 0,
        lowestPercentage: 0,
        overallGrade: 'N/A',
      };
    }

    const percentages = results.map(r => (r.marks / r.exam.maxMarks) * 100);
    const totalExams = percentages.length;
    const averagePercentage = percentages.reduce((a, b) => a + b, 0) / totalExams;
    const highestPercentage = Math.max(...percentages);
    const lowestPercentage = Math.min(...percentages);

    // Calculate overall grade based on average
    const overallGrade = this.calculateGradeFromPercentage(averagePercentage);

    return {
      totalExams,
      averagePercentage: parseFloat(averagePercentage.toFixed(2)),
      highestPercentage: parseFloat(highestPercentage.toFixed(2)),
      lowestPercentage: parseFloat(lowestPercentage.toFixed(2)),
      overallGrade,
    };
  },

  /**
   * Generate class performance report with rankings
   * @param classId - Class ID
   * @param examId - Optional exam ID filter
   * @param context - Service context with user info
   * @returns Student rankings
   */
  async generateClassRankings(
    classId: string,
    examId: string | null,
    context: ServiceContext
  ): Promise<{
    studentId: string;
    studentName: string;
    totalMarks: number;
    averagePercentage: number;
    rank: number;
  }[]> {
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

    // Get all students in class with their results
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
        results: examId ? {
          where: { examId },
          include: {
            exam: { select: { maxMarks: true } },
          },
        } : {
          include: {
            exam: { select: { maxMarks: true } },
          },
        },
      },
    });

    // Calculate rankings
    const studentPerformances = enrollments.map(enrollment => {
      const totalMarks = enrollment.results.reduce((sum, r) => sum + r.marks, 0);
      const totalMaxMarks = enrollment.results.reduce((sum, r) => sum + r.exam.maxMarks, 0);
      const averagePercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

      return {
        studentId: enrollment.student.id,
        studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
        totalMarks,
        averagePercentage,
      };
    });

    // Sort by average percentage descending
    studentPerformances.sort((a, b) => b.averagePercentage - a.averagePercentage);

    // Add ranks
    return studentPerformances.map((performance, index) => ({
      ...performance,
      rank: index + 1,
      averagePercentage: parseFloat(performance.averagePercentage.toFixed(2)),
    }));
  },

  /**
   * Delete result
   * @param id - Result ID
   * @param context - Service context with user info
   */
  async deleteResult(id: string, context: ServiceContext): Promise<void> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Check if result exists and belongs to school
    const existingResult = await prisma.result.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
    });

    if (!existingResult) {
      throw new NotFoundError('Result', id);
    }

    await prisma.result.delete({
      where: { id },
    });
  },

  /**
   * Calculate grade based on marks and max marks
   * @param marks - Obtained marks
   * @param maxMarks - Maximum marks
   * @returns Grade string
   */
  calculateGrade(marks: number, maxMarks: number): string {
    const percentage = (marks / maxMarks) * 100;
    return this.calculateGradeFromPercentage(percentage);
  },

  /**
   * Calculate grade from percentage
   * @param percentage - Percentage
   * @returns Grade string
   */
  calculateGradeFromPercentage(percentage: number): string {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  },
};

export default ResultService;
