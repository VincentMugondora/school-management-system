import { Role } from '@prisma/client';
import { ServiceContext } from '@/types/domain.types';

/**
 * Create a mock service context for testing
 */
export function createMockContext(options?: {
  userId?: string;
  schoolId?: string;
  role?: Role;
}): ServiceContext {
  return {
    userId: options?.userId ?? 'mock-user-id',
    schoolId: options?.schoolId ?? 'mock-school-id',
    role: options?.role ?? Role.ADMIN,
  };
}

/**
 * Mock contexts for different roles
 */
export const mockContexts = {
  superAdmin: createMockContext({ role: Role.SUPER_ADMIN }),
  admin: createMockContext({ role: Role.ADMIN }),
  teacher: createMockContext({ role: Role.TEACHER }),
  accountant: createMockContext({ role: Role.ACCOUNTANT }),
  parent: createMockContext({ role: Role.PARENT }),
  student: createMockContext({ role: Role.STUDENT }),
  noSchool: createMockContext({ schoolId: undefined, role: Role.ADMIN }),
};

/**
 * Helper to mock Prisma responses
 */
export function mockPrismaResponse(prismaMock: any, model: string, method: string, response: any) {
  prismaMock[model][method].mockResolvedValue(response);
}

/**
 * Helper to mock Prisma error
 */
export function mockPrismaError(prismaMock: any, model: string, method: string, error: Error) {
  prismaMock[model][method].mockRejectedValue(error);
}
