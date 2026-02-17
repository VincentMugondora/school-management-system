import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

/**
 * Service context for role-based operations
 */
interface ServiceContext {
  userId: string;
  schoolId: string | null;
  role: Role;
}

/**
 * Error thrown when role guard checks fail
 */
export class RoleGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoleGuardError';
  }
}

/**
 * Get current authenticated user with role context
 * Returns null if not authenticated
 */
export async function getCurrentUserContext(): Promise<ServiceContext | null> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      schoolId: true,
      role: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    schoolId: user.schoolId,
    role: user.role,
  };
}

/**
 * Check if user is SUPERADMIN
 */
export function isSuperAdmin(role: Role): boolean {
  return role === Role.SUPER_ADMIN;
}

/**
 * Enforce SUPERADMIN must have schoolId = null
 * @throws RoleGuardError if SUPERADMIN has schoolId
 */
export function enforceSuperAdminNoSchool(context: ServiceContext): void {
  if (isSuperAdmin(context.role) && context.schoolId !== null) {
    throw new RoleGuardError(
      'SUPERADMIN must not be associated with any school. ' +
      `Current schoolId: ${context.schoolId}`
    );
  }
}

/**
 * Require user to be SUPERADMIN
 * @throws RoleGuardError if user is not SUPERADMIN
 */
export function requireSuperAdmin(role: Role): void {
  if (!isSuperAdmin(role)) {
    throw new RoleGuardError('Access denied. SUPERADMIN role required.');
  }
}

/**
 * Require user to NOT be SUPERADMIN
 * @throws RoleGuardError if user is SUPERADMIN
 */
export function requireNonSuperAdmin(role: Role): void {
  if (isSuperAdmin(role)) {
    throw new RoleGuardError(
      'SUPERADMIN cannot access this resource. ' +
      'This route is restricted to school-associated users only.'
    );
  }
}

/**
 * Check if path should be blocked for SUPERADMIN
 * SUPERADMIN should NOT access /dashboard/admin/*
 */
export function isSuperAdminBlockedPath(pathname: string): boolean {
  const blockedPatterns = [
    /^\/dashboard\/admin(\/|$)/,
  ];

  return blockedPatterns.some(pattern => pattern.test(pathname));
}

/**
 * Check if path requires SUPERADMIN
 * Only SUPERADMIN can access /dashboard/superadmin/*
 */
export function isSuperAdminOnlyPath(pathname: string): boolean {
  const superAdminOnlyPatterns = [
    /^\/dashboard\/superadmin(\/|$)/,
  ];

  return superAdminOnlyPatterns.some(pattern => pattern.test(pathname));
}

/**
 * Get appropriate redirect path based on role
 */
export function getRoleBasedRedirect(role: Role): string {
  if (isSuperAdmin(role)) {
    return '/dashboard/superadmin';
  }
  return '/dashboard/admin';
}

/**
 * Server-side role guard for page components
 * Use in layout.tsx or page.tsx files
 * 
 * @example
 * // Block SUPERADMIN from admin routes
 * export default async function AdminPage() {
 *   await guardNonSuperAdmin();
 *   // ... rest of page
 * }
 * 
 * @example
 * // Require SUPERADMIN for superadmin routes
 * export default async function SuperAdminPage() {
 *   await guardSuperAdmin();
 *   // ... rest of page
 * }
 */
export async function guardNonSuperAdmin(): Promise<ServiceContext> {
  const context = await getCurrentUserContext();

  if (!context) {
    redirect('/sign-in');
  }

  requireNonSuperAdmin(context.role);

  return context;
}

/**
 * Server-side guard requiring SUPERADMIN
 */
export async function guardSuperAdmin(): Promise<ServiceContext> {
  const context = await getCurrentUserContext();

  if (!context) {
    redirect('/sign-in');
  }

  requireSuperAdmin(context.role);

  // Enforce SUPERADMIN has no school
  enforceSuperAdminNoSchool(context);

  return context;
}

/**
 * Middleware-compatible role check
 * Returns the redirect URL or null if access is allowed
 * 
 * @example
 * // In middleware.ts:
 * const redirectUrl = checkRoleAccess(pathname, role);
 * if (redirectUrl) {
 *   return NextResponse.redirect(new URL(redirectUrl, req.url));
 * }
 */
export function checkRoleAccess(
  pathname: string,
  role: Role
): string | null {
  // Check if SUPERADMIN is trying to access blocked paths
  if (isSuperAdmin(role) && isSuperAdminBlockedPath(pathname)) {
    return getRoleBasedRedirect(role);
  }

  // Check if non-superadmin is trying to access SUPERADMIN-only paths
  if (!isSuperAdmin(role) && isSuperAdminOnlyPath(pathname)) {
    return '/dashboard/admin';
  }

  return null;
}

/**
 * Validate and enforce SUPERADMIN constraints at runtime
 * This should be called when creating/updating users
 * 
 * @throws RoleGuardError if constraints are violated
 */
export function validateSuperAdminConstraints(
  role: Role,
  schoolId: string | null
): void {
  if (isSuperAdmin(role)) {
    if (schoolId !== null) {
      throw new RoleGuardError(
        'Cannot assign school to SUPERADMIN. ' +
        'SUPERADMIN users must have schoolId = null.'
      );
    }
  }
}
