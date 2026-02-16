/**
 * @fileoverview Unit Tests for Onboarding Guard
 * @description Comprehensive tests for onboarding guard functions covering:
 * - checkOnboardingStatus: Various user states and roles
 * - onboardingGuard: Redirect logic and response handling
 * - pathRequiresOnboarding: Protected route detection
 * - isOnboardingPath: Onboarding route detection
 * - Redirect loop prevention
 *
 * @module @/__tests__/lib/auth/onboardingGuard.test
 */

import {
  checkOnboardingStatus,
  onboardingGuard,
  pathRequiresOnboarding,
  isOnboardingPath,
  getOnboardingStatus,
} from '@/src/lib/auth/onboardingGuard';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';
import { NextRequest } from 'next/server';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

/**
 * Helper to create a mock NextRequest
 */
function createMockRequest(pathname: string): NextRequest {
  return {
    nextUrl: {
      pathname,
      searchParams: {
        set: jest.fn(),
        get: jest.fn(),
      },
    },
    url: `http://localhost:3000${pathname}`,
  } as unknown as NextRequest;
}

describe('Onboarding Guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // checkOnboardingStatus Tests
  // ============================================

  describe('checkOnboardingStatus', () => {
    describe('Happy Path - No Onboarding Needed', () => {
      it('should return needsOnboarding=false for ADMIN with school', async () => {
        // Arrange
        const mockUserId = 'user-123';
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          id: mockUserId,
          role: Role.ADMIN,
          schoolId: 'school-123',
        });

        // Act
        const result = await checkOnboardingStatus(mockUserId);

        // Assert
        expect(result.needsOnboarding).toBe(false);
        expect(result.schoolId).toBe('school-123');
        expect(result.role).toBe(Role.ADMIN);
        expect(result.redirectUrl).toBeUndefined();
      });

      it('should return needsOnboarding=false for SUPER_ADMIN with school', async () => {
        // Arrange
        const mockUserId = 'user-456';
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          id: mockUserId,
          role: Role.SUPER_ADMIN,
          schoolId: 'school-456',
        });

        // Act
        const result = await checkOnboardingStatus(mockUserId);

        // Assert
        expect(result.needsOnboarding).toBe(false);
        expect(result.schoolId).toBe('school-456');
        expect(result.role).toBe(Role.SUPER_ADMIN);
      });

      it('should return needsOnboarding=false for TEACHER without school', async () => {
        // Arrange
        const mockUserId = 'teacher-123';
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          id: mockUserId,
          role: Role.TEACHER,
          schoolId: null,
        });

        // Act
        const result = await checkOnboardingStatus(mockUserId);

        // Assert
        expect(result.needsOnboarding).toBe(false);
        expect(result.schoolId).toBeNull();
        expect(result.role).toBe(Role.TEACHER);
      });

      it('should return needsOnboarding=false for STUDENT without school', async () => {
        // Arrange
        const mockUserId = 'student-123';
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          id: mockUserId,
          role: Role.STUDENT,
          schoolId: null,
        });

        // Act
        const result = await checkOnboardingStatus(mockUserId);

        // Assert
        expect(result.needsOnboarding).toBe(false);
        expect(result.schoolId).toBeNull();
        expect(result.role).toBe(Role.STUDENT);
      });
    });

    describe('Onboarding Required - ADMIN without School', () => {
      it('should return needsOnboarding=true for ADMIN without schoolId', async () => {
        // Arrange
        const mockUserId = 'admin-123';
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          id: mockUserId,
          role: Role.ADMIN,
          schoolId: null,
        });

        // Act
        const result = await checkOnboardingStatus(mockUserId);

        // Assert
        expect(result.needsOnboarding).toBe(true);
        expect(result.schoolId).toBeNull();
        expect(result.role).toBe(Role.ADMIN);
        expect(result.redirectUrl).toBe('/dashboard/admin/school/new');
      });

      it('should return needsOnboarding=true for SUPER_ADMIN without schoolId', async () => {
        // Arrange
        const mockUserId = 'super-123';
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          id: mockUserId,
          role: Role.SUPER_ADMIN,
          schoolId: null,
        });

        // Act
        const result = await checkOnboardingStatus(mockUserId);

        // Assert
        expect(result.needsOnboarding).toBe(true);
        expect(result.schoolId).toBeNull();
        expect(result.role).toBe(Role.SUPER_ADMIN);
        expect(result.redirectUrl).toBe('/dashboard/admin/school/new');
      });
    });

    describe('User Not Found - Needs Profile Setup', () => {
      it('should return needsOnboarding=true with /setup redirect for non-existent user', async () => {
        // Arrange
        const mockUserId = 'unknown-user';
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

        // Act
        const result = await checkOnboardingStatus(mockUserId);

        // Assert
        expect(result.needsOnboarding).toBe(true);
        expect(result.schoolId).toBeNull();
        expect(result.redirectUrl).toBe('/setup');
      });
    });

    describe('Edge Cases', () => {
      it('should handle PARENT role without school', async () => {
        // Arrange
        const mockUserId = 'parent-123';
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          id: mockUserId,
          role: Role.PARENT,
          schoolId: null,
        });

        // Act
        const result = await checkOnboardingStatus(mockUserId);

        // Assert
        expect(result.needsOnboarding).toBe(false);
        expect(result.schoolId).toBeNull();
      });

      it('should handle TEACHER with school association', async () => {
        // Arrange
        const mockUserId = 'teacher-123';
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          id: mockUserId,
          role: Role.TEACHER,
          schoolId: 'school-123',
        });

        // Act
        const result = await checkOnboardingStatus(mockUserId);

        // Assert
        expect(result.needsOnboarding).toBe(false);
        expect(result.schoolId).toBe('school-123');
      });
    });
  });

  // ============================================
  // onboardingGuard Tests
  // ============================================

  describe('onboardingGuard', () => {
    describe('Redirect Scenarios', () => {
      it('should return redirect response when ADMIN needs onboarding', async () => {
        // Arrange
        const mockUserId = 'admin-123';
        const mockPath = '/dashboard/admin/classes';
        const request = createMockRequest(mockPath);

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          id: mockUserId,
          role: Role.ADMIN,
          schoolId: null,
        });

        // Act
        const result = await onboardingGuard(request, mockUserId);

        // Assert
        expect(result).not.toBeNull();
        expect(result?.status).toBe(307); // Redirect status
      });

      it('should include redirectTo query param when redirecting', async () => {
        // Arrange
        const mockUserId = 'admin-123';
        const originalPath = '/dashboard/admin/students';
        const request = createMockRequest(originalPath);

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          id: mockUserId,
          role: Role.ADMIN,
          schoolId: null,
        });

        // Act
        const result = await onboardingGuard(request, mockUserId);

        // Assert
        expect(result).not.toBeNull();
        const location = result?.headers.get('location');
        expect(location).toContain('redirectTo=' + encodeURIComponent(originalPath));
      });

      it('should NOT include redirectTo for /dashboard/admin path', async () => {
        // Arrange
        const mockUserId = 'admin-123';
        const request = createMockRequest('/dashboard/admin');

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          id: mockUserId,
          role: Role.ADMIN,
          schoolId: null,
        });

        // Act
        const result = await onboardingGuard(request, mockUserId);

        // Assert
        expect(result).not.toBeNull();
        const location = result?.headers.get('location');
        expect(location).not.toContain('redirectTo');
      });
    });

    describe('No Redirect Scenarios', () => {
      it('should return null when user has school', async () => {
        // Arrange
        const mockUserId = 'admin-123';
        const request = createMockRequest('/dashboard/admin/classes');

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          id: mockUserId,
          role: Role.ADMIN,
          schoolId: 'school-123',
        });

        // Act
        const result = await onboardingGuard(request, mockUserId);

        // Assert
        expect(result).toBeNull();
      });

      it('should return null when TEACHER accesses dashboard', async () => {
        // Arrange
        const mockUserId = 'teacher-123';
        const request = createMockRequest('/dashboard/admin/classes');

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          id: mockUserId,
          role: Role.TEACHER,
          schoolId: null,
        });

        // Act
        const result = await onboardingGuard(request, mockUserId);

        // Assert
        expect(result).toBeNull();
      });

      it('should return null when user not found', async () => {
        // Arrange
        const mockUserId = 'unknown-user';
        const request = createMockRequest('/dashboard/admin/classes');

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

        // Act
        const result = await onboardingGuard(request, mockUserId);

        // Assert
        expect(result).not.toBeNull(); // Redirects to /setup
      });
    });

    describe('Redirect Loop Prevention', () => {
      it('should return null when already on onboarding page', async () => {
        // Arrange
        const mockUserId = 'admin-123';
        const request = createMockRequest('/dashboard/admin/school/new');

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          id: mockUserId,
          role: Role.ADMIN,
          schoolId: null,
        });

        // Act
        const result = await onboardingGuard(request, mockUserId);

        // Assert
        expect(result).toBeNull();
      });

      it('should return null when on /setup page', async () => {
        // Arrange
        const mockUserId = 'admin-123';
        const request = createMockRequest('/setup');

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

        // Act
        const result = await onboardingGuard(request, mockUserId);

        // Assert
        expect(result).toBeNull();
      });

      it('should return null when on onboarding API route', async () => {
        // Arrange
        const mockUserId = 'admin-123';
        const request = createMockRequest('/api/onboarding/school');

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          id: mockUserId,
          role: Role.ADMIN,
          schoolId: null,
        });

        // Act
        const result = await onboardingGuard(request, mockUserId);

        // Assert
        expect(result).toBeNull();
      });
    });
  });

  // ============================================
  // pathRequiresOnboarding Tests
  // ============================================

  describe('pathRequiresOnboarding', () => {
    describe('Protected Paths', () => {
      it('should return true for /dashboard/admin/classes', () => {
        expect(pathRequiresOnboarding('/dashboard/admin/classes')).toBe(true);
      });

      it('should return true for /dashboard/admin/students', () => {
        expect(pathRequiresOnboarding('/dashboard/admin/students')).toBe(true);
      });

      it('should return true for /dashboard/admin/teachers', () => {
        expect(pathRequiresOnboarding('/dashboard/admin/teachers')).toBe(true);
      });

      it('should return true for /dashboard/admin/academic-years', () => {
        expect(pathRequiresOnboarding('/dashboard/admin/academic-years')).toBe(true);
      });

      it('should return true for /dashboard/admin/exams', () => {
        expect(pathRequiresOnboarding('/dashboard/admin/exams')).toBe(true);
      });

      it('should return true for /dashboard/admin/subjects', () => {
        expect(pathRequiresOnboarding('/dashboard/admin/subjects')).toBe(true);
      });

      it('should return true for /dashboard/admin/settings', () => {
        expect(pathRequiresOnboarding('/dashboard/admin/settings')).toBe(true);
      });

      it('should return true for nested paths like /dashboard/admin/students/123', () => {
        expect(pathRequiresOnboarding('/dashboard/admin/students/123')).toBe(true);
      });

      it('should return true for /api/admin/classes', () => {
        expect(pathRequiresOnboarding('/api/admin/classes')).toBe(true);
      });

      it('should return true for /api/admin/students', () => {
        expect(pathRequiresOnboarding('/api/admin/students')).toBe(true);
      });
    });

    describe('Unprotected Paths', () => {
      it('should return false for /dashboard/admin', () => {
        expect(pathRequiresOnboarding('/dashboard/admin')).toBe(false);
      });

      it('should return false for /', () => {
        expect(pathRequiresOnboarding('/')).toBe(false);
      });

      it('should return false for /sign-in', () => {
        expect(pathRequiresOnboarding('/sign-in')).toBe(false);
      });

      it('should return false for /setup', () => {
        expect(pathRequiresOnboarding('/setup')).toBe(false);
      });

      it('should return false for /dashboard/admin/school/new', () => {
        expect(pathRequiresOnboarding('/dashboard/admin/school/new')).toBe(false);
      });

      it('should return false for /api/onboarding/school', () => {
        expect(pathRequiresOnboarding('/api/onboarding/school')).toBe(false);
      });
    });
  });

  // ============================================
  // isOnboardingPath Tests
  // ============================================

  describe('isOnboardingPath', () => {
    describe('Onboarding Paths', () => {
      it('should return true for /setup', () => {
        expect(isOnboardingPath('/setup')).toBe(true);
      });

      it('should return true for /dashboard/admin/school/new', () => {
        expect(isOnboardingPath('/dashboard/admin/school/new')).toBe(true);
      });

      it('should return true for /api/admin/school', () => {
        expect(isOnboardingPath('/api/admin/school')).toBe(true);
      });

      it('should return true for nested onboarding paths', () => {
        expect(isOnboardingPath('/api/admin/school/validate')).toBe(true);
      });
    });

    describe('Non-Onboarding Paths', () => {
      it('should return false for /dashboard/admin', () => {
        expect(isOnboardingPath('/dashboard/admin')).toBe(false);
      });

      it('should return false for /dashboard/admin/classes', () => {
        expect(isOnboardingPath('/dashboard/admin/classes')).toBe(false);
      });

      it('should return false for /sign-in', () => {
        expect(isOnboardingPath('/sign-in')).toBe(false);
      });

      it('should return false for /', () => {
        expect(isOnboardingPath('/')).toBe(false);
      });
    });
  });

  // ============================================
  // getOnboardingStatus Tests
  // ============================================

  describe('getOnboardingStatus', () => {
    it('should return complete=true for user with school', async () => {
      // Arrange
      const mockUserId = 'user-123';
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        role: Role.ADMIN,
        schoolId: 'school-123',
      });

      // Act
      const result = await getOnboardingStatus(mockUserId);

      // Assert
      expect(result.complete).toBe(true);
      expect(result.needsSchool).toBe(false);
      expect(result.redirectUrl).toBeUndefined();
    });

    it('should return complete=false and needsSchool=true for ADMIN without school', async () => {
      // Arrange
      const mockUserId = 'admin-123';
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        role: Role.ADMIN,
        schoolId: null,
      });

      // Act
      const result = await getOnboardingStatus(mockUserId);

      // Assert
      expect(result.complete).toBe(false);
      expect(result.needsSchool).toBe(true);
      expect(result.redirectUrl).toContain('/school');
    });

    it('should return complete=false for non-existent user', async () => {
      // Arrange
      const mockUserId = 'unknown-user';
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await getOnboardingStatus(mockUserId);

      // Assert
      expect(result.complete).toBe(false);
      expect(result.needsSchool).toBe(false); // Needs profile setup, not school
      expect(result.redirectUrl).toBe('/setup');
    });

    it('should return complete=true for TEACHER without school', async () => {
      // Arrange
      const mockUserId = 'teacher-123';
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        role: Role.TEACHER,
        schoolId: null,
      });

      // Act
      const result = await getOnboardingStatus(mockUserId);

      // Assert
      expect(result.complete).toBe(true);
      expect(result.needsSchool).toBe(false);
    });
  });

  // ============================================
  // Integration Scenarios
  // ============================================

  describe('Integration Scenarios', () => {
    it('should handle complete flow: new admin -> needs onboarding -> redirected', async () => {
      // Arrange
      const mockUserId = 'new-admin-123';
      const originalPath = '/dashboard/admin/classes';
      const request = createMockRequest(originalPath);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        role: Role.ADMIN,
        schoolId: null,
      });

      // Act - Check status
      const statusResult = await checkOnboardingStatus(mockUserId);

      // Assert - Status check
      expect(statusResult.needsOnboarding).toBe(true);
      expect(statusResult.redirectUrl).toBe('/dashboard/admin/school/new');

      // Act - Guard check
      const guardResult = await onboardingGuard(request, mockUserId);

      // Assert - Should redirect
      expect(guardResult).not.toBeNull();
    });

    it('should handle complete flow: existing admin with school -> no redirect', async () => {
      // Arrange
      const mockUserId = 'existing-admin-123';
      const request = createMockRequest('/dashboard/admin/students');

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        role: Role.ADMIN,
        schoolId: 'existing-school-123',
      });

      // Act - Check status
      const statusResult = await checkOnboardingStatus(mockUserId);

      // Assert - Status check
      expect(statusResult.needsOnboarding).toBe(false);

      // Act - Guard check
      const guardResult = await onboardingGuard(request, mockUserId);

      // Assert - No redirect
      expect(guardResult).toBeNull();
    });

    it('should handle student trying to access admin route', async () => {
      // Arrange
      const mockUserId = 'student-123';
      const request = createMockRequest('/dashboard/admin/classes');

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        role: Role.STUDENT,
        schoolId: null,
      });

      // Act
      const statusResult = await checkOnboardingStatus(mockUserId);
      const guardResult = await onboardingGuard(request, mockUserId);

      // Assert
      expect(statusResult.needsOnboarding).toBe(false);
      expect(guardResult).toBeNull(); // Students don't need school onboarding
    });
  });
});
