import { Role } from '@prisma/client';
import { ServiceContext, ForbiddenError } from '@/types/domain.types';

/**
 * Role hierarchy from highest to lowest privilege
 */
const ROLE_HIERARCHY: Role[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.TEACHER,
  Role.ACCOUNTANT,
  Role.PARENT,
  Role.STUDENT,
];

/**
 * Get the numeric rank of a role (higher = more privileges)
 * @param role - The role to get rank for
 * @returns Numeric rank (0 = highest, higher numbers = lower privilege)
 */
function getRoleRank(role: Role): number {
  return ROLE_HIERARCHY.indexOf(role);
}

/**
 * Check if a role meets the minimum required role level
 * @param userRole - The user's actual role
 * @param minimumRole - The minimum required role
 * @returns True if user role meets or exceeds minimum requirement
 */
export function hasRole(userRole: Role, minimumRole: Role): boolean {
  return getRoleRank(userRole) <= getRoleRank(minimumRole);
}

/**
 * Require user to have one of the allowed roles
 * @param user - The user context with role information
 * @param allowedRoles - Array of roles that are permitted
 * @throws ForbiddenError if user's role is not in allowedRoles
 * 
 * @example
 * // Require SUPER_ADMIN or ADMIN
 * requireRole(context.user, [Role.SUPER_ADMIN, Role.ADMIN]);
 * 
 * // Require specific role
 * requireRole(context.user, [Role.TEACHER]);
 * 
 * // Require minimum role (ADMIN or higher)
 * requireRole(context.user, [Role.SUPER_ADMIN, Role.ADMIN]);
 */
export function requireRole(
  user: { role: Role } | null | undefined,
  allowedRoles: readonly Role[]
): void {
  if (!user) {
    throw new ForbiddenError('Authentication required');
  }

  const hasAllowedRole = allowedRoles.includes(user.role);
  
  if (!hasAllowedRole) {
    const allowedRolesStr = allowedRoles.join(', ');
    throw new ForbiddenError(
      `Access denied. Required role(s): ${allowedRolesStr}. Your role: ${user.role}`
    );
  }
}

/**
 * Require user to have a minimum role level or higher
 * @param user - The user context with role information
 * @param minimumRole - The minimum role required (user must have this role or higher privilege)
 * @throws ForbiddenError if user's role rank is lower than minimum
 * 
 * @example
 * // Require ADMIN or higher (SUPER_ADMIN also allowed)
 * requireMinimumRole(context.user, Role.ADMIN);
 */
export function requireMinimumRole(
  user: { role: Role } | null | undefined,
  minimumRole: Role
): void {
  if (!user) {
    throw new ForbiddenError('Authentication required');
  }

  if (!hasRole(user.role, minimumRole)) {
    throw new ForbiddenError(
      `Access denied. Minimum required role: ${minimumRole}. Your role: ${user.role}`
    );
  }
}

/**
 * Require user to be associated with a school
 * @param context - Service context with schoolId
 * @throws ForbiddenError if user is not associated with a school
 */
export function requireSchoolContext(context: ServiceContext): void {
  if (!context.schoolId) {
    throw new ForbiddenError('User must be associated with a school');
  }
}

/**
 * Check if user can access resource in a specific school
 * @param context - Service context with user info
 * @param resourceSchoolId - The school ID of the resource being accessed
 * @returns True if user can access the resource
 */
export function canAccessSchoolResource(
  context: ServiceContext,
  resourceSchoolId: string
): boolean {
  // SUPER_ADMIN can access any school
  if (context.role === Role.SUPER_ADMIN) {
    return true;
  }

  // Other users can only access their own school
  return context.schoolId === resourceSchoolId;
}

/**
 * Require user to be able to access resource in a specific school
 * @param context - Service context with user info
 * @param resourceSchoolId - The school ID of the resource being accessed
 * @throws ForbiddenError if user cannot access the resource
 */
export function requireSchoolAccess(
  context: ServiceContext,
  resourceSchoolId: string
): void {
  if (!canAccessSchoolResource(context, resourceSchoolId)) {
    throw new ForbiddenError('You do not have access to this school\'s resources');
  }
}

/**
 * Predefined role groups for common permission patterns
 */
export const RoleGroups = {
  /** Platform administrators */
  PLATFORM_ADMINS: [Role.SUPER_ADMIN],
  
  /** School administrators (can manage school-level resources) */
  SCHOOL_ADMINS: [Role.SUPER_ADMIN, Role.ADMIN],
  
  /** Staff who can view and modify academic data */
  ACADEMIC_STAFF: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER],
  
  /** Staff who can view and modify financial data */
  FINANCIAL_STAFF: [Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT],
  
  /** All staff roles */
  ALL_STAFF: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER, Role.ACCOUNTANT],
  
  /** All authenticated users except students */
  NON_STUDENTS: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER, Role.ACCOUNTANT, Role.PARENT],
  
  /** All authenticated users */
  ALL_USERS: [Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER, Role.ACCOUNTANT, Role.PARENT, Role.STUDENT],
} as const;

export default {
  requireRole,
  requireMinimumRole,
  requireSchoolContext,
  canAccessSchoolResource,
  requireSchoolAccess,
  hasRole,
  RoleGroups,
};
