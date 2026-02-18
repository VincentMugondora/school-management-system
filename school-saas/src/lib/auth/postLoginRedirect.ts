import { prisma } from '@/lib/db';
import { Role, UserStatus } from '@prisma/client';

/**
 * Post-Login Redirect Utility
 *
 * Centralizes the logic for determining where to redirect users after login
 * based on their approval status and role.
 *
 * @module @/lib/auth/postLoginRedirect
 */

export interface PostLoginRedirectResult {
  /** The URL to redirect to */
  redirectUrl: string;

  /** Whether the user is approved */
  isApproved: boolean;

  /** User's current status */
  status: UserStatus;

  /** User's role */
  role?: Role;
}

/**
 * Determine the appropriate redirect URL after login based on user status.
 *
 * Rules:
 * - If PENDING → /waiting-approval
 * - If APPROVED → role-specific dashboard
 * - If REJECTED → /waiting-approval (with rejected state)
 * - If SUSPENDED → /waiting-approval (with suspended state)
 *
 * @param clerkId - The authenticated user's Clerk ID
 * @returns PostLoginRedirectResult with redirect URL and status
 */
export async function getPostLoginRedirect(
  clerkId: string
): Promise<PostLoginRedirectResult> {
  // Fetch user from database
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      role: true,
      status: true,
      schoolId: true,
    },
  });

  // User not found - send to setup flow
  if (!user) {
    return {
      redirectUrl: '/setup',
      isApproved: false,
      status: UserStatus.PENDING,
    };
  }

  if (user.role === Role.SUPER_ADMIN) {
    return {
      redirectUrl: '/dashboard/superadmin',
      isApproved: true,
      status: UserStatus.APPROVED,
      role: user.role,
    };
  }

  // Check approval status
  if (user.status !== UserStatus.APPROVED) {
    // Not approved - redirect to waiting page
    return {
      redirectUrl: '/waiting-approval',
      isApproved: false,
      status: user.status,
      role: user.role,
    };
  }

  // User is approved - determine dashboard based on role
  const dashboardUrl = getDashboardUrlForRole(user.role, user.schoolId);

  return {
    redirectUrl: dashboardUrl,
    isApproved: true,
    status: UserStatus.APPROVED,
    role: user.role,
  };
}

/**
 * Get the appropriate dashboard URL based on user role.
 *
 * @param role - User's role
 * @param schoolId - User's school ID (if any)
 * @returns Dashboard URL
 */
function getDashboardUrlForRole(role: Role, schoolId: string | null): string {
  switch (role) {
    case Role.SUPER_ADMIN:
      return '/dashboard/superadmin';

    case Role.ADMIN:
      if (!schoolId) {
        // Admin without school needs to create one
        return '/dashboard/admin/school/new';
      }
      return '/dashboard/admin';

    case Role.TEACHER:
      return '/dashboard/teacher';

    case Role.STUDENT:
      return '/dashboard/student';

    case Role.PARENT:
      return '/dashboard/parent';

    case Role.ACCOUNTANT:
      return '/dashboard/accountant';

    default:
      return '/dashboard';
  }
}

/**
 * Check if a path is a post-login entry point (home, sign-in callback, etc.)
 * These paths should trigger the post-login redirect logic.
 *
 * @param pathname - The request path
 * @returns true if the path should trigger post-login redirect
 */
export function isPostLoginEntryPath(pathname: string): boolean {
  const entryPaths = [
    '/',
    '/sign-in',
    '/sign-up',
    '/sso-callback',
    '/oauth-callback',
  ];

  return entryPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

/**
 * Get the default redirect URL for a given role.
 * Useful for client-side navigation after login.
 *
 * @param role - User's role
 * @returns Default dashboard URL for the role
 */
export function getDefaultDashboardForRole(role: Role): string {
  switch (role) {
    case Role.SUPER_ADMIN:
      return '/dashboard/superadmin';
    case Role.ADMIN:
      return '/dashboard/admin';
    case Role.TEACHER:
      return '/dashboard/teacher';
    case Role.STUDENT:
      return '/dashboard/student';
    case Role.PARENT:
      return '/dashboard/parent';
    case Role.ACCOUNTANT:
      return '/dashboard/accountant';
    default:
      return '/dashboard';
  }
}
