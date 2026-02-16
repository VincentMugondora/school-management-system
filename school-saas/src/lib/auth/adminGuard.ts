import { Role } from '@prisma/client';
import { ServiceContext, ForbiddenError } from '@/types/domain.types';

/**
 * Admin Authorization Guard
 *
 * Reusable guard function for admin-level authorization checks.
 * Validates that the user has ADMIN role and belongs to the specified school.
 * Rejects cross-school access attempts.
 *
 * This guard is framework-agnostic and works with any ServiceContext.
 */

/**
 * Verify user is an admin and belongs to the specified school.
 *
 * @param context - Service context with user info
 * @param targetSchoolId - The school ID being accessed
 * @throws ForbiddenError if user is not admin or doesn't belong to school
 *
 * @example
 * // In a service method
 * guardAdminAccess(context, schoolId);
 * // Proceed with admin-only operation
 */
export function guardAdminAccess(
  context: ServiceContext,
  targetSchoolId: string
): void {
  // Verify user has admin role
  if (context.role !== Role.ADMIN && context.role !== Role.SUPER_ADMIN) {
    throw new ForbiddenError('Admin access required');
  }

  // Verify user belongs to a school
  if (!context.schoolId) {
    throw new ForbiddenError('User must be associated with a school');
  }

  // Reject cross-school access
  if (context.schoolId !== targetSchoolId) {
    throw new ForbiddenError('Cross-school access denied');
  }
}

/**
 * Verify user is an admin (any school).
 * Use this when the school check happens separately.
 *
 * @param context - Service context with user info
 * @throws ForbiddenError if user is not admin
 */
export function guardAdminRole(context: ServiceContext): void {
  if (context.role !== Role.ADMIN && context.role !== Role.SUPER_ADMIN) {
    throw new ForbiddenError('Admin access required');
  }
}

/**
 * Verify user belongs to specified school.
 * Use this when role check happens separately.
 *
 * @param context - Service context with user info
 * @param targetSchoolId - The school ID being accessed
 * @throws ForbiddenError if user doesn't belong to school or attempts cross-school access
 */
export function guardSameSchool(
  context: ServiceContext,
  targetSchoolId: string
): void {
  if (!context.schoolId) {
    throw new ForbiddenError('User must be associated with a school');
  }

  if (context.schoolId !== targetSchoolId) {
    throw new ForbiddenError('Cross-school access denied');
  }
}

/**
 * Check if user is admin (returns boolean, no throw).
 * Useful for conditional logic.
 *
 * @param context - Service context with user info
 * @returns true if user has admin role
 */
export function isAdmin(context: ServiceContext): boolean {
  return context.role === Role.ADMIN || context.role === Role.SUPER_ADMIN;
}

/**
 * Check if user belongs to school (returns boolean, no throw).
 *
 * @param context - Service context with user info
 * @param schoolId - The school ID to check
 * @returns true if user belongs to the school
 */
export function belongsToSchool(
  context: ServiceContext,
  schoolId: string
): boolean {
  return context.schoolId === schoolId;
}
