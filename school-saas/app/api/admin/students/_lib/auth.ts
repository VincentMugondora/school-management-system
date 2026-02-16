import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';
import { ServiceContext, ForbiddenError } from '@/types/domain.types';

/**
 * Get authenticated admin user with school context.
 * Validates that user is ADMIN or SUPER_ADMIN and has a school association.
 *
 * @returns ServiceContext with userId, schoolId, and role
 * @throws ForbiddenError if not authenticated or not admin
 */
export async function getAdminContext(): Promise<ServiceContext> {
  const session = await auth();

  if (!session.userId) {
    throw new ForbiddenError('Authentication required');
  }

  // Get user from database with school info
  const user = await prisma.user.findUnique({
    where: { clerkId: session.userId },
    include: { school: true },
  });

  if (!user) {
    throw new ForbiddenError('User not found');
  }

  // Check admin role
  if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
    throw new ForbiddenError('Admin access required');
  }

  // Require school association
  if (!user.schoolId) {
    throw new ForbiddenError('User must be associated with a school');
  }

  return {
    userId: user.id,
    schoolId: user.schoolId,
    role: user.role,
  };
}

/**
 * Centralized error handler for API routes.
 * Converts domain errors to appropriate HTTP responses.
 */
export function handleApiError(error: unknown): Response {
  if (error instanceof ForbiddenError) {
    return Response.json({ error: error.message }, { status: 403 });
  }

  if (error instanceof Error && error.message === 'User not found') {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  // Log unexpected errors
  console.error('API Error:', error);

  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
