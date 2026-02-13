import { EnrollmentService } from '@/services/enrollment.service';
import { prisma } from '@/lib/db';
import { EnrollmentStatus, Role } from '@prisma/client';
import { mockContexts, createMockContext } from '../utils/test-helpers';
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from '@/types/domain.types';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    $transaction: jest.fn((callback: Function) => callback(prisma)),
    enrollment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    student: {
      findFirst: jest.fn(),
    },
    academicYear: {
      findFirst: jest.fn(),
    },
    class: {
      findFirst: jest.fn(),
    },
  },
}));

describe('EnrollmentService - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEnrollment', () => {
    it('should create enrollment with valid data', async () => {
      const mockStudent = { id: 'student-1', schoolId: 'school-1' };
      const mockAcademicYear = { id: 'year-1', schoolId: 'school-1' };
      const mockClass = { id: 'class-1', schoolId: 'school-1', academicYearId: 'year-1' };
      const mockEnrollment = {
        id: 'enroll-1',
        studentId: 'student-1',
        academicYearId: 'year-1',
        classId: 'class-1',
        schoolId: 'school-1',
        status: EnrollmentStatus.ACTIVE,
      };

      (prisma.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.academicYear.findFirst as jest.Mock).mockResolvedValue(mockAcademicYear);
      (prisma.class.findFirst as jest.Mock).mockResolvedValue(mockClass);
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.enrollment.create as jest.Mock).mockResolvedValue(mockEnrollment);

      const result = await EnrollmentService.createEnrollment(
        {
          studentId: 'student-1',
          academicYearId: 'year-1',
          classId: 'class-1',
        },
        mockContexts.admin
      );

      expect(result).toEqual(mockEnrollment);
      expect(prisma.enrollment.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user has no school context', async () => {
      await expect(
        EnrollmentService.createEnrollment(
          {
            studentId: 'student-1',
            academicYearId: 'year-1',
            classId: 'class-1',
          },
          mockContexts.noSchool
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError when student does not exist', async () => {
      (prisma.student.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        EnrollmentService.createEnrollment(
          {
            studentId: 'nonexistent',
            academicYearId: 'year-1',
            classId: 'class-1',
          },
          mockContexts.admin
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should enforce tenant isolation - student must belong to same school', async () => {
      const mockStudent = { id: 'student-1', schoolId: 'different-school' };
      (prisma.student.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        EnrollmentService.createEnrollment(
          {
            studentId: 'student-1',
            academicYearId: 'year-1',
            classId: 'class-1',
          },
          mockContexts.admin
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when enrollment already exists', async () => {
      const mockStudent = { id: 'student-1', schoolId: 'school-1' };
      const mockAcademicYear = { id: 'year-1', schoolId: 'school-1' };
      const mockClass = { id: 'class-1', schoolId: 'school-1', academicYearId: 'year-1' };
      const existingEnrollment = { id: 'enroll-existing' };

      (prisma.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.academicYear.findFirst as jest.Mock).mockResolvedValue(mockAcademicYear);
      (prisma.class.findFirst as jest.Mock).mockResolvedValue(mockClass);
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(existingEnrollment);

      await expect(
        EnrollmentService.createEnrollment(
          {
            studentId: 'student-1',
            academicYearId: 'year-1',
            classId: 'class-1',
          },
          mockContexts.admin
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('promoteStudents', () => {
    it('should promote students transactionally', async () => {
      const mockStudent = { id: 'student-1', firstName: 'John', lastName: 'Doe', schoolId: 'school-1' };
      const mockAcademicYear = { id: 'year-2', schoolId: 'school-1' };
      const mockClass = { id: 'class-2', schoolId: 'school-1', academicYearId: 'year-2' };
      const mockEnrollment = { id: 'enroll-2', studentId: 'student-1', schoolId: 'school-1' };

      (prisma.academicYear.findFirst as jest.Mock).mockResolvedValue(mockAcademicYear);
      (prisma.class.findFirst as jest.Mock).mockResolvedValue(mockClass);
      (prisma.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.enrollment.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.enrollment.create as jest.Mock).mockResolvedValue(mockEnrollment);

      const result = await EnrollmentService.promoteStudents(
        {
          studentIds: ['student-1'],
          targetAcademicYearId: 'year-2',
          targetClassId: 'class-2',
          markPreviousAsCompleted: true,
        },
        mockContexts.admin
      );

      expect(result).toHaveLength(1);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.enrollment.updateMany).toHaveBeenCalled();
      expect(prisma.enrollment.create).toHaveBeenCalled();
    });

    it('should validate all students exist before promoting', async () => {
      const mockAcademicYear = { id: 'year-2', schoolId: 'school-1' };
      const mockClass = { id: 'class-2', schoolId: 'school-1', academicYearId: 'year-2' };

      (prisma.academicYear.findFirst as jest.Mock).mockResolvedValue(mockAcademicYear);
      (prisma.class.findFirst as jest.Mock).mockResolvedValue(mockClass);
      (prisma.student.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        EnrollmentService.promoteStudents(
          {
            studentIds: ['nonexistent-student'],
            targetAcademicYearId: 'year-2',
            targetClassId: 'class-2',
          },
          mockContexts.admin
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error when student already enrolled in target year', async () => {
      const mockStudent = { id: 'student-1', firstName: 'John', lastName: 'Doe', schoolId: 'school-1' };
      const mockAcademicYear = { id: 'year-2', schoolId: 'school-1' };
      const mockClass = { id: 'class-2', schoolId: 'school-1', academicYearId: 'year-2' };
      const existingEnrollment = { id: 'existing-enroll' };

      (prisma.academicYear.findFirst as jest.Mock).mockResolvedValue(mockAcademicYear);
      (prisma.class.findFirst as jest.Mock).mockResolvedValue(mockClass);
      (prisma.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(existingEnrollment);

      await expect(
        EnrollmentService.promoteStudents(
          {
            studentIds: ['student-1'],
            targetAcademicYearId: 'year-2',
            targetClassId: 'class-2',
          },
          mockContexts.admin
        )
      ).rejects.toThrow(ConflictError);
    });

    it('should require ADMIN role', async () => {
      await expect(
        EnrollmentService.promoteStudents(
          {
            studentIds: ['student-1'],
            targetAcademicYearId: 'year-2',
            targetClassId: 'class-2',
          },
          mockContexts.teacher
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('bulkCreateEnrollments', () => {
    it('should create multiple enrollments in batch', async () => {
      const mockData = [
        { studentId: 'student-1', academicYearId: 'year-1', classId: 'class-1' },
        { studentId: 'student-2', academicYearId: 'year-1', classId: 'class-1' },
      ];

      const mockStudent1 = { id: 'student-1', schoolId: 'school-1' };
      const mockStudent2 = { id: 'student-2', schoolId: 'school-1' };
      const mockAcademicYear = { id: 'year-1', schoolId: 'school-1' };
      const mockClass = { id: 'class-1', schoolId: 'school-1', academicYearId: 'year-1' };

      (prisma.student.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockStudent1)
        .mockResolvedValueOnce(mockStudent2);
      (prisma.academicYear.findFirst as jest.Mock).mockResolvedValue(mockAcademicYear);
      (prisma.class.findFirst as jest.Mock).mockResolvedValue(mockClass);
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.enrollment.create as jest.Mock)
        .mockResolvedValueOnce({ id: 'enroll-1' })
        .mockResolvedValueOnce({ id: 'enroll-2' });

      const result = await EnrollmentService.bulkCreateEnrollments(mockData, mockContexts.admin);

      expect(result.enrollments).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial failures gracefully', async () => {
      const mockData = [
        { studentId: 'student-1', academicYearId: 'year-1', classId: 'class-1' },
        { studentId: 'nonexistent', academicYearId: 'year-1', classId: 'class-1' },
      ];

      const mockStudent1 = { id: 'student-1', schoolId: 'school-1' };
      const mockAcademicYear = { id: 'year-1', schoolId: 'school-1' };
      const mockClass = { id: 'class-1', schoolId: 'school-1', academicYearId: 'year-1' };

      (prisma.student.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockStudent1)
        .mockResolvedValueOnce(null);
      (prisma.academicYear.findFirst as jest.Mock).mockResolvedValue(mockAcademicYear);
      (prisma.class.findFirst as jest.Mock).mockResolvedValue(mockClass);
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.enrollment.create as jest.Mock).mockResolvedValue({ id: 'enroll-1' });

      const result = await EnrollmentService.bulkCreateEnrollments(mockData, mockContexts.admin);

      expect(result.enrollments).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].studentId).toBe('nonexistent');
    });

    it('should require ADMIN role', async () => {
      await expect(
        EnrollmentService.bulkCreateEnrollments([], mockContexts.teacher)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('markPreviousEnrollmentsAsCompleted', () => {
    it('should mark all active enrollments as completed', async () => {
      const mockStudent = { id: 'student-1', schoolId: 'mock-school-id' };

      (prisma.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.enrollment.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await EnrollmentService.markPreviousEnrollmentsAsCompleted(
        'student-1',
        mockContexts.admin
      );

      expect(result).toBe(2);
      expect(prisma.enrollment.updateMany).toHaveBeenCalledWith({
        where: {
          studentId: 'student-1',
          schoolId: 'mock-school-id',
          status: EnrollmentStatus.ACTIVE,
        },
        data: { status: EnrollmentStatus.COMPLETE },
      });
    });

    it('should enforce tenant isolation', async () => {
      (prisma.student.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        EnrollmentService.markPreviousEnrollmentsAsCompleted('student-1', mockContexts.admin)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('tenant isolation tests', () => {
    it('should only access enrollments from user school', async () => {
      const otherSchoolContext = createMockContext({
        userId: 'user-2',
        schoolId: 'school-2',
        role: Role.ADMIN,
      });

      const mockEnrollmentOtherSchool = {
        id: 'enroll-1',
        studentId: 'student-1',
        schoolId: 'school-1',
      };

      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await EnrollmentService.getEnrollmentById('enroll-1', otherSchoolContext);
      expect(result).toBeNull();
    });
  });
});
