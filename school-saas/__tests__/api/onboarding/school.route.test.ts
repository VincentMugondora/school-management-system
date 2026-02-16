/**
 * @fileoverview API Tests for POST /api/onboarding/school
 * @description Unit tests for the school onboarding API route covering:
 * - Happy path (successful creation)
 * - Validation errors (missing/invalid data)
 * - Authentication failures (unauthenticated, non-admin)
 * - Duplicate school prevention (admin already has school)
 *
 * @module @/__tests__/api/onboarding/school.route.test
 */

import { POST } from '@/src/app/api/onboarding/school/route';
import { SchoolService } from '@/src/services/school.service';
import { prisma } from '@/lib/db';
import { Role, SchoolStatus } from '@prisma/client';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@clerk/nextjs/server', () => ({
  getAuth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/src/services/school.service', () => ({
  SchoolService: {
    createSchool: jest.fn(),
  },
}));

import { getAuth } from '@clerk/nextjs/server';

/**
 * Helper to create a mock NextRequest with JSON body
 */
function createMockRequest(body: object): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

/**
 * Helper to parse JSON response
 */
async function parseResponse(response: Response) {
  return {
    status: response.status,
    data: await response.json(),
  };
}

describe('POST /api/onboarding/school', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // HAPPY PATH
  // ============================================

  describe('Happy Path', () => {
    it('should create school successfully with valid data', async () => {
      // Arrange
      const mockClerkId = 'clerk-user-123';
      const mockUserId = 'user-123';
      const mockSchool = {
        id: 'school-123',
        name: 'Test School',
        slug: 'test-school',
        email: 'test@school.com',
        phone: '+263123456',
        address: '123 Main St',
        status: SchoolStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (getAuth as jest.Mock).mockResolvedValue({ userId: mockClerkId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        clerkId: mockClerkId,
        role: Role.ADMIN,
        schoolId: null,
        email: 'admin@test.com',
      });
      (SchoolService.createSchool as jest.Mock).mockResolvedValue(mockSchool);

      const request = createMockRequest({
        name: 'Test School',
        email: 'test@school.com',
        phone: '+263123456',
        address: '123 Main St',
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.school).toEqual(mockSchool);
      expect(data.message).toBe('School created successfully');
      expect(SchoolService.createSchool).toHaveBeenCalledWith(mockUserId, {
        name: 'Test School',
        email: 'test@school.com',
        phone: '+263123456',
        address: '123 Main St',
      });
    });

    it('should create school with minimal data (name only)', async () => {
      // Arrange
      const mockClerkId = 'clerk-user-123';
      const mockUserId = 'user-123';
      const mockSchool = {
        id: 'school-123',
        name: 'Test School',
        slug: 'test-school',
        email: null,
        phone: null,
        address: null,
        status: SchoolStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (getAuth as jest.Mock).mockResolvedValue({ userId: mockClerkId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        clerkId: mockClerkId,
        role: Role.ADMIN,
        schoolId: null,
        email: 'admin@test.com',
      });
      (SchoolService.createSchool as jest.Mock).mockResolvedValue(mockSchool);

      const request = createMockRequest({
        name: 'Test School',
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(201);
      expect(data.success).toBe(true);
      expect(SchoolService.createSchool).toHaveBeenCalledWith(mockUserId, {
        name: 'Test School',
        email: undefined,
        phone: undefined,
      });
    });

    it('should allow SUPER_ADMIN to create school', async () => {
      // Arrange
      const mockClerkId = 'clerk-super-123';
      const mockUserId = 'super-123';
      const mockSchool = {
        id: 'school-456',
        name: 'Super School',
        slug: 'super-school',
        email: null,
        phone: null,
        address: null,
        status: SchoolStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (getAuth as jest.Mock).mockResolvedValue({ userId: mockClerkId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        clerkId: mockClerkId,
        role: Role.SUPER_ADMIN,
        schoolId: null,
        email: 'super@test.com',
      });
      (SchoolService.createSchool as jest.Mock).mockResolvedValue(mockSchool);

      const request = createMockRequest({
        name: 'Super School',
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(201);
      expect(data.success).toBe(true);
    });
  });

  // ============================================
  // AUTHENTICATION ERRORS
  // ============================================

  describe('Authentication Errors', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      (getAuth as jest.Mock).mockResolvedValue({ userId: null });

      const request = createMockRequest({
        name: 'Test School',
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.code).toBe('UNAUTHENTICATED');
      expect(data.error).toBe('Authentication required');
    });

    it('should return 404 when user not found in database', async () => {
      // Arrange
      const mockClerkId = 'clerk-user-123';

      (getAuth as jest.Mock).mockResolvedValue({ userId: mockClerkId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest({
        name: 'Test School',
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.code).toBe('USER_NOT_FOUND');
      expect(data.redirectUrl).toBe('/setup');
    });
  });

  // ============================================
  // AUTHORIZATION ERRORS
  // ============================================

  describe('Authorization Errors', () => {
    it('should return 403 when non-admin tries to create school', async () => {
      // Arrange
      const mockClerkId = 'clerk-teacher-123';

      (getAuth as jest.Mock).mockResolvedValue({ userId: mockClerkId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'teacher-123',
        clerkId: mockClerkId,
        role: Role.TEACHER,
        schoolId: null,
        email: 'teacher@test.com',
      });

      const request = createMockRequest({
        name: 'Test School',
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.code).toBe('FORBIDDEN');
      expect(data.error).toBe('Only administrators can create schools');
    });

    it('should return 403 when STUDENT tries to create school', async () => {
      // Arrange
      const mockClerkId = 'clerk-student-123';

      (getAuth as jest.Mock).mockResolvedValue({ userId: mockClerkId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'student-123',
        clerkId: mockClerkId,
        role: Role.STUDENT,
        schoolId: null,
        email: 'student@test.com',
      });

      const request = createMockRequest({
        name: 'Test School',
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.code).toBe('FORBIDDEN');
    });
  });

  // ============================================
  // DUPLICATE SCHOOL PREVENTION
  // ============================================

  describe('Duplicate School Prevention', () => {
    it('should return 409 when admin already has a school', async () => {
      // Arrange
      const mockClerkId = 'clerk-user-123';
      const existingSchoolId = 'existing-school-123';

      (getAuth as jest.Mock).mockResolvedValue({ userId: mockClerkId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        clerkId: mockClerkId,
        role: Role.ADMIN,
        schoolId: existingSchoolId,
        email: 'admin@test.com',
      });

      const request = createMockRequest({
        name: 'Test School',
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.code).toBe('SCHOOL_ALREADY_EXISTS');
      expect(data.error).toContain('already owns a school');
      expect(data.existingSchoolId).toBe(existingSchoolId);
      expect(SchoolService.createSchool).not.toHaveBeenCalled();
    });

    it('should return 409 when SUPER_ADMIN already has a school', async () => {
      // Arrange
      const mockClerkId = 'clerk-super-123';
      const existingSchoolId = 'existing-school-456';

      (getAuth as jest.Mock).mockResolvedValue({ userId: mockClerkId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'super-123',
        clerkId: mockClerkId,
        role: Role.SUPER_ADMIN,
        schoolId: existingSchoolId,
        email: 'super@test.com',
      });

      const request = createMockRequest({
        name: 'Another School',
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.code).toBe('SCHOOL_ALREADY_EXISTS');
    });
  });

  // ============================================
  // VALIDATION ERRORS
  // ============================================

  describe('Validation Errors', () => {
    it('should return 400 when name is missing', async () => {
      // Arrange
      const mockClerkId = 'clerk-user-123';

      (getAuth as jest.Mock).mockResolvedValue({ userId: mockClerkId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        clerkId: mockClerkId,
        role: Role.ADMIN,
        schoolId: null,
        email: 'admin@test.com',
      });

      const request = createMockRequest({
        email: 'test@school.com',
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details).toHaveProperty('name');
    });

    it('should return 400 when name is too short', async () => {
      // Arrange
      const mockClerkId = 'clerk-user-123';

      (getAuth as jest.Mock).mockResolvedValue({ userId: mockClerkId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        clerkId: mockClerkId,
        role: Role.ADMIN,
        schoolId: null,
        email: 'admin@test.com',
      });

      const request = createMockRequest({
        name: 'A', // Too short
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details?.name).toBeDefined();
    });

    it('should return 400 when email is invalid', async () => {
      // Arrange
      const mockClerkId = 'clerk-user-123';

      (getAuth as jest.Mock).mockResolvedValue({ userId: mockClerkId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        clerkId: mockClerkId,
        role: Role.ADMIN,
        schoolId: null,
        email: 'admin@test.com',
      });

      const request = createMockRequest({
        name: 'Test School',
        email: 'invalid-email',
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details?.email).toBeDefined();
    });

    it('should return 400 when slug is invalid', async () => {
      // Arrange
      const mockClerkId = 'clerk-user-123';

      (getAuth as jest.Mock).mockResolvedValue({ userId: mockClerkId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        clerkId: mockClerkId,
        role: Role.ADMIN,
        schoolId: null,
        email: 'admin@test.com',
      });

      const request = createMockRequest({
        name: 'Test School',
        slug: 'Invalid_Slug!', // Invalid characters
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details?.slug).toBeDefined();
    });
  });

  // ============================================
  // SERVICE ERROR HANDLING
  // ============================================

  describe('Service Error Handling', () => {
    it('should handle ConflictError from SchoolService', async () => {
      // Arrange
      const mockClerkId = 'clerk-user-123';

      (getAuth as jest.Mock).mockResolvedValue({ userId: mockClerkId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        clerkId: mockClerkId,
        role: Role.ADMIN,
        schoolId: null,
        email: 'admin@test.com',
      });

      const conflictError = new Error('School with slug already exists');
      conflictError.name = 'ConflictError';
      (SchoolService.createSchool as jest.Mock).mockRejectedValue(conflictError);

      const request = createMockRequest({
        name: 'Test School',
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.code).toBe('CONFLICT');
    });

    it('should handle ValidationError from SchoolService', async () => {
      // Arrange
      const mockClerkId = 'clerk-user-123';

      (getAuth as jest.Mock).mockResolvedValue({ userId: mockClerkId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        clerkId: mockClerkId,
        role: Role.ADMIN,
        schoolId: null,
        email: 'admin@test.com',
      });

      const validationError = new Error('Invalid school data');
      validationError.name = 'ValidationError';
      (SchoolService.createSchool as jest.Mock).mockRejectedValue(validationError);

      const request = createMockRequest({
        name: 'Test School',
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should handle unexpected errors with 500', async () => {
      // Arrange
      const mockClerkId = 'clerk-user-123';

      (getAuth as jest.Mock).mockResolvedValue({ userId: mockClerkId });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        clerkId: mockClerkId,
        role: Role.ADMIN,
        schoolId: null,
        email: 'admin@test.com',
      });

      (SchoolService.createSchool as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createMockRequest({
        name: 'Test School',
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INTERNAL_ERROR');
    });
  });
});
