import { prisma } from '@/lib/db';
import { UserStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Approval Guard
 *
 * Ensures users are APPROVED before accessing dashboard routes.
 * Redirects pending users to /waiting-approval.
 * Blocks rejected and suspended users.
 *
 * @module src/lib/auth/approvalGuard.ts
 */

export interface ApprovalCheckResult {
  isApproved: boolean;
  status?: UserStatus;
  redirectUrl?: string;
  message?: string;
}

/**
 * Check if a user is approved and can access protected routes.
 */
export async function checkApprovalStatus(
  clerkId: string
): Promise<ApprovalCheckResult> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, status: true },
  });

  // User not found - let onboarding guard handle this
  if (!user) {
    return {
      isApproved: false,
      redirectUrl: '/setup',
      message: 'User not found',
    };
  }

  if (user.status === UserStatus.APPROVED) {
    return {
      isApproved: true,
      status: user.status,
    };
  }

  if (user.status === UserStatus.PENDING) {
    return {
      isApproved: false,
      status: user.status,
      redirectUrl: '/waiting-approval',
      message: 'Your account is pending approval',
    };
  }

  if (user.status === UserStatus.REJECTED) {
    return {
      isApproved: false,
      status: user.status,
      redirectUrl: '/waiting-approval',
      message: 'Your access request was rejected',
    };
  }

  if (user.status === UserStatus.SUSPENDED) {
    return {
      isApproved: false,
      status: user.status,
      redirectUrl: '/waiting-approval',
      message: 'Your account is suspended',
    };
  }

  // Fallback for unknown status
  return {
    isApproved: false,
    status: user.status,
    redirectUrl: '/waiting-approval',
    message: 'Your account status prevents access',
  };
}

/**
 * Paths that require approval check
 */
const DASHBOARD_PATHS = ['/dashboard'];

/**
 * Paths that are exempt from approval check
 */
const APPROVAL_EXEMPT_PATHS = [
  '/waiting-approval',
  '/setup',
  '/sign-in',
  '/sign-up',
  '/',
  '/api/auth',
  '/api/webhooks',
];

/**
 * Check if a path requires approval.
 */
export function pathRequiresApproval(pathname: string): boolean {
  // Check if path is exempt
  if (APPROVAL_EXEMPT_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return false;
  }

  // Check if path requires approval (dashboard routes)
  return DASHBOARD_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Check if a path is part of the approval flow.
 * Used to prevent redirect loops.
 */
export function isApprovalPath(pathname: string): boolean {
  return pathname === '/waiting-approval' || pathname.startsWith('/waiting-approval/');
}

/**
 * Middleware guard for approval.
 * Returns redirect response if not approved, null if allowed.
 */
export async function approvalGuard(
  request: NextRequest,
  clerkId: string
): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;

  // Skip approval check for exempt paths
  if (!pathRequiresApproval(pathname)) {
    return null;
  }

  // Skip if already on approval page to prevent loops
  if (isApprovalPath(pathname)) {
    return null;
  }

  const check = await checkApprovalStatus(clerkId);

  if (!check.isApproved && check.redirectUrl) {
    // Create redirect response
    const redirectUrl = new URL(check.redirectUrl, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return null;
}
