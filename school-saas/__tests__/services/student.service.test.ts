import { StudentService } from '@/services/student.service';
import { prisma } from '@/lib/db';
import { Gender, Role } from '@prisma/client';
import { mockContexts, createMockContext } from '../utils/test-helpers';
import { ForbiddenError, NotFoundError, ConflictError } from '@/types/domain.types';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    $transaction: jest.fn((callback: Function) => callback(prisma)),
    student: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    enrollment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    parent: {
      findFirst: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

// Mock AuditService
jest.mock('@/services/audit.service', () => ({
  AuditService: {
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
    logResultOverride: jest.fn(),
  },
}));

describe('StudentService - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createStudent', () => {
    it('should create student with valid data', async () => {
      const mockStudent = {
        id: 'student-1',
        firstName: 'John',
        lastName: 'Doe',
        studentId: 'STU001',
        schoolId: 'school-1',
        email: 'john@example.com',
        phone: '1234567890',
        address: '123 Main St',
        dateOfBirth: new Date('2010-01-01'),
        gender: Gender.MALE,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null,
      };

      (prisma.student.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.student.create as jest.Mock).mockResolvedValue(mockStudent);

      const result = await StudentService.createStudent(
        {
          firstName: 'John',
          lastName: 'Doe',
          studentId: 'STU001',
          email: 'john@example.com',
          phone: '1234567890',
          address: '123 Main St',
          dateOfBirth: new Date('2010-01-01'),
          gender: Gender.MALE,
        },
        mockContexts.admin
      );

      expect(result).toEqual(mockStudent);
      expect(prisma.student.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user has no school context', async () => {
      await expect(
        StudentService.createStudent(
          { firstName: 'John', lastName: 'Doe' },
          mockContexts.noSchool
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ConflictError when student ID already exists', async () => {
      const existingStudent = { id: 'existing-1', studentId: 'STU001' };
      (prisma.student.findFirst as jest.Mock).mockResolvedValue(existingStudent);

      await expect(
        StudentService.createStudent(
          { firstName: 'John', lastName: 'Doe', studentId: 'STU001' },
          mockContexts.admin
        )
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ForbiddenError when non-admin tries to create student', async () => {
      await expect(
        StudentService.createStudent(
          { firstName: 'John', lastName: 'Doe' },
          mockContexts.teacher
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getStudentById', () => {
    it('should return student when found', async () => {
      const mockStudent = {
        id: 'student-1',
        firstName: 'John',
        lastName: 'Doe',
        schoolId: 'school-1',
        deletedAt: null,
      };

      (prisma.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);

      const result = await StudentService.getStudentById('student-1', mockContexts.admin);

      expect(result).toEqual(mockStudent);
    });

    it('should return null when student not found', async () => {
      (prisma.student.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await StudentService.getStudentById('non-existent', mockContexts.admin);

      expect(result).toBeNull();
    });

    it('should enforce multi-tenant isolation', async () => {
      const otherSchoolStudent = {
        id: 'student-1',
        firstName: 'John',
        lastName: 'Doe',
        schoolId: 'other-school',
        deletedAt: null,
      };

      (prisma.student.findFirst as jest.Mock).mockImplementation((args: any) => {
        // Only return if schoolId matches
        if (args.where.schoolId === 'school-1') {
          return null;
        }
        return otherSchoolStudent;
      });

      const result = await StudentService.getStudentById('student-1', mockContexts.admin);

      expect(result).toBeNull();
      expect(prisma.student.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ schoolId: 'school-1' }),
        })
      );
    });
  });

  describe('listStudents', () => {
    it('should return paginated student list', async () => {
      const mockStudents = [
        { id: 'student-1', firstName: 'John', lastName: 'Doe' },
        { id: 'student-2', firstName: 'Jane', lastName: 'Smith' },
      ];

      (prisma.student.findMany as jest.Mock).mockResolvedValue(mockStudents);
      (prisma.student.count as jest.Mock).mockResolvedValue(2);

      const result = await StudentService.listStudents(mockContexts.admin, {
        page: 1,
        limit: 10,
      });

      expect(result.students).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by search term', async () => {
      const mockStudents = [{ id: 'student-1', firstName: 'John', lastName: 'Doe' }];

      (prisma.student.findMany as jest.Mock).mockResolvedValue(mockStudents);
      (prisma.student.count as jest.Mock).mockResolvedValue(1);

      await StudentService.listStudents(mockContexts.admin, {
        search: 'John',
        page: 1,
        limit: 10,
      });

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ firstName: expect.any(Object) }),
            ]),
          }),
        })
      );
    });

    it('should filter by gender', async () => {
      await StudentService.listStudents(mockContexts.admin, {
        gender: Gender.MALE,
        page: 1,
        limit: 10,
      });

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gender: Gender.MALE,
          }),
        })
      );
    });

    it('should enforce multi-tenant isolation in list', async () => {
      await StudentService.listStudents(mockContexts.admin, { page: 1, limit: 10 });

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: 'school-1',
            deletedAt: null,
          }),
        })
      );
    });
  });

  describe('updateStudent', () => {
    it('should update student with valid data', async () => {
      const existingStudent = {
        id: 'student-1',
        firstName: 'John',
        lastName: 'Doe',
        studentId: 'STU001',
        email: 'john@example.com',
        phone: '1234567890',
        address: '123 Main St',
        dateOfBirth: new Date('2010-01-01'),
        gender: Gender.MALE,
        parentId: null,
        schoolId: 'school-1',
        deletedAt: null,
      };

      const updatedStudent = {
        ...existingStudent,
        firstName: 'Johnny',
        email: 'johnny@example.com',
      };

      (prisma.student.findFirst as jest.Mock).mockResolvedValue(existingStudent);
      (prisma.student.update as jest.Mock).mockResolvedValue(updatedStudent);

      const result = await StudentService.updateStudent(
        'student-1',
        { firstName: 'Johnny', email: 'johnny@example.com' },
        mockContexts.admin
      );

      expect(result.firstName).toBe('Johnny');
      expect(prisma.student.update).toHaveBeenCalled();
    });

    it('should throw NotFoundError when student not found', async () => {
      (prisma.student.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        StudentService.updateStudent(
          'non-existent',
          { firstName: 'Johnny' },
          mockContexts.admin
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should enforce multi-tenant isolation', async () => {
      const otherSchoolStudent = {
        id: 'student-1',
        firstName: 'John',
        schoolId: 'other-school',
        deletedAt: null,
      };

      (prisma.student.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        StudentService.updateStudent('student-1', { firstName: 'Johnny' }, mockContexts.admin)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when studentId already exists', async () => {
      const existingStudent = {
        id: 'student-1',
        firstName: 'John',
        studentId: 'STU001',
        schoolId: 'school-1',
        deletedAt: null,
      };

      (prisma.student.findFirst as jest.Mock)
        .mockResolvedValueOnce(existingStudent)
        .mockResolvedValueOnce({ id: 'other-student', studentId: 'STU002' });

      await expect(
        StudentService.updateStudent(
          'student-1',
          { studentId: 'STU002' },
          mockContexts.admin
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteStudent', () => {
    it('should soft delete student without active enrollments', async () => {
      const existingStudent = {
        id: 'student-1',
        firstName: 'John',
        schoolId: 'school-1',
        deletedAt: null,
        _count: { enrollments: 0 },
      };

      (prisma.student.findFirst as jest.Mock).mockResolvedValue(existingStudent);
      (prisma.student.update as jest.Mock).mockResolvedValue({ ...existingStudent, deletedAt: new Date() });

      await StudentService.deleteStudent('student-1', mockContexts.admin);

      expect(prisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });

    it('should throw ConflictError when student has active enrollments', async () => {
      const existingStudent = {
        id: 'student-1',
        firstName: 'John',
        schoolId: 'school-1',
        deletedAt: null,
        _count: { enrollments: 1 },
      };

      (prisma.student.findFirst as jest.Mock).mockResolvedValue(existingStudent);

      await expect(StudentService.deleteStudent('student-1', mockContexts.admin)).rejects.toThrow(
        ConflictError
      );
    });

    it('should enforce multi-tenant isolation', async () => {
      (prisma.student.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(StudentService.deleteStudent('student-1', mockContexts.admin)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('restoreStudent', () => {
    it('should restore soft-deleted student', async () => {
      const deletedStudent = {
        id: 'student-1',
        firstName: 'John',
        schoolId: 'school-1',
        deletedAt: new Date(),
      };

      const restoredStudent = {
        ...deletedStudent,
        deletedAt: null,
      };

      (prisma.student.findFirst as jest.Mock).mockResolvedValue(deletedStudent);
      (prisma.student.update as jest.Mock).mockResolvedValue(restoredStudent);

      const result = await StudentService.restoreStudent('student-1', mockContexts.admin);

      expect(result.deletedAt).toBeNull();
    });

    it('should throw NotFoundError when deleted student not found', async () => {
      (prisma.student.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(StudentService.restoreStudent('student-1', mockContexts.admin)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('suspendStudent', () => {
    it('should suspend student and drop active enrollments', async () => {
      const student = {
        id: 'student-1',
        firstName: 'John',
        schoolId: 'school-1',
        deletedAt: null,
        enrollments: [{ id: 'enroll-1', status: 'ACTIVE' }],
      };

      (prisma.student.findFirst as jest.Mock).mockResolvedValue(student);
      (prisma.enrollment.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await StudentService.suspendStudent('student-1', 'Violation of rules', mockContexts.admin);

      expect(prisma.enrollment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            studentId: 'student-1',
            status: 'ACTIVE',
          }),
          data: { status: 'DROPPED' },
        })
      );
    });

    it('should throw NotFoundError when student not found', async () => {
      (prisma.student.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        StudentService.suspendStudent('student-1', 'Reason', mockContexts.admin)
      ).rejects.toThrow(NotFoundError);
    });

    it('should enforce multi-tenant isolation', async () => {
      (prisma.student.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        StudentService.suspendStudent('student-1', 'Reason', mockContexts.admin)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('should prevent access to students from other schools', async () => {
      const schoolAContext = createMockContext({ schoolId: 'school-a', role: Role.ADMIN });
      const schoolBStudent = {
        id: 'student-b',
        firstName: 'Jane',
        schoolId: 'school-b',
        deletedAt: null,
      };

      // Mock returns student only when queried with correct schoolId
      (prisma.student.findFirst as jest.Mock).mockImplementation((args: any) => {
        return args.where.schoolId === 'school-b' ? schoolBStudent : null;
      });

      const result = await StudentService.getStudentById('student-b', schoolAContext);

      expect(result).toBeNull();
    });

    it('should prevent updates to students from other schools', async () => {
      const schoolAContext = createMockContext({ schoolId: 'school-a', role: Role.ADMIN });

      (prisma.student.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        StudentService.updateStudent('student-b', { firstName: 'Hacked' }, schoolAContext)
      ).rejects.toThrow(NotFoundError);
    });

    it('should list only students from own school', async () => {
      const schoolAContext = createMockContext({ schoolId: 'school-a', role: Role.ADMIN });
      const schoolAStudents = [
        { id: 'student-a1', firstName: 'John', schoolId: 'school-a' },
        { id: 'student-a2', firstName: 'Jane', schoolId: 'school-a' },
      ];

      (prisma.student.findMany as jest.Mock).mockResolvedValue(schoolAStudents);
      (prisma.student.count as jest.Mock).mockResolvedValue(2);

      const result = await StudentService.listStudents(schoolAContext, { page: 1, limit: 10 });

      expect(result.students).toHaveLength(2);
      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ schoolId: 'school-a' }),
        })
      );
    });
  });

  describe('Role-based Access Control', () => {
    it('should allow ADMIN to create students', async () => {
      const mockStudent = {
        id: 'student-1',
        firstName: 'John',
        lastName: 'Doe',
        schoolId: 'school-1',
        deletedAt: null,
      };

      (prisma.student.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.student.create as jest.Mock).mockResolvedValue(mockStudent);

      const result = await StudentService.createStudent(
        { firstName: 'John', lastName: 'Doe' },
        mockContexts.admin
      );

      expect(result).toBeDefined();
    });

    it('should allow SUPER_ADMIN to create students', async () => {
      const mockStudent = {
        id: 'student-1',
        firstName: 'John',
        lastName: 'Doe',
        schoolId: 'school-1',
        deletedAt: null,
      };

      (prisma.student.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.student.create as jest.Mock).mockResolvedValue(mockStudent);

      const result = await StudentService.createStudent(
        { firstName: 'John', lastName: 'Doe' },
        mockContexts.superAdmin
      );

      expect(result).toBeDefined();
    });

    it('should deny TEACHER from creating students', async () => {
      await expect(
        StudentService.createStudent({ firstName: 'John', lastName: 'Doe' }, mockContexts.teacher)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should deny PARENT from accessing student data', async () => {
      await expect(
        StudentService.listStudents(mockContexts.parent, { page: 1, limit: 10 })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should deny STUDENT from accessing student data', async () => {
      await expect(
        StudentService.listStudents(mockContexts.student, { page: 1, limit: 10 })
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
