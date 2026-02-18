import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { Role, UserStatus } from '@prisma/client';

/**
 * Middleware for Approval Lifecycle
 *
 * Rules:
 * - PENDING users: Only allowed on /onboarding/*, /sign-in, /sign-up
 * - APPROVED users: Routed by role to appropriate dashboard
 * - REJECTED users: Redirected to /onboarding/rejected
 *
 * Constraints:
 * - No redirect loops (explicit allowlist check)
 * - Safe for App Router
 * - Explicit path allowlists
 *
 * @middleware middleware.ts
 */

// ============================================================================
// PATH CONFIGURATION
// ============================================================================

/**
 * Paths that are ALWAYS accessible (public routes)
 */
const PUBLIC_PATHS = [
  '/sign-in',
  '/sign-up',
  '/sso-callback',
  '/oauth-callback',
  '/api/webhooks',
  '/_next',
  '/favicon.ico',
  '/public',
];

/**
 * Paths that PENDING users are allowed to access
 */
const PENDING_ALLOWED_PATHS = [
  '/onboarding',
  '/sign-in',
  '/sign-up',
  '/sso-callback',
  '/oauth-callback',
  '/api/auth',
];

/**
 * Paths that should NOT trigger middleware logic (static, API, etc.)
 */
const IGNORED_PATH_PREFIXES = [
  '/_next',
  '/api',
  '/static',
  '/favicon',
  '/public',
];

// ============================================================================
// ROLE-BASED ROUTING
// ============================================================================

/**
 * Get dashboard URL for approved user based on role
 */
function getDashboardUrlForRole(role: Role, schoolId: string | null): string {
  switch (role) {
    case Role.SUPER_ADMIN:
      return '/dashboard/superadmin';
    case Role.ADMIN:
      return schoolId ? '/dashboard/admin' : '/onboarding/school';
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if path matches any of the given path prefixes
 */
function matchesPathPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Check if path should be ignored by middleware
 */
function shouldIgnorePath(pathname: string): boolean {
  return matchesPathPrefix(pathname, IGNORED_PATH_PREFIXES);
}

/**
 * Check if path is public (accessible without auth)
 */
function isPublicPath(pathname: string): boolean {
  return matchesPathPrefix(pathname, PUBLIC_PATHS);
}

/**
 * Check if path is allowed for PENDING users
 */
function isPendingAllowedPath(pathname: string): boolean {
  return matchesPathPrefix(pathname, PENDING_ALLOWED_PATHS);
}

/**
 * Check if user is already on the correct waiting page (prevent redirect loops)
 */
function isOnWaitingPage(pathname: string): boolean {
  return pathname === '/onboarding/waiting' || pathname.startsWith('/onboarding/waiting/');
}

/**
 * Check if user is already on the rejected page (prevent redirect loops)
 */
function isOnRejectedPage(pathname: string): boolean {
  return pathname === '/onboarding/rejected' || pathname.startsWith('/onboarding/rejected/');
}

// ============================================================================
// MAIN MIDDLEWARE
// ============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for ignored paths (static, API, etc.)
  if (shouldIgnorePath(pathname)) {
    return NextResponse.next();
  }

  // Get auth from Clerk
  const auth = getAuth(request);
  const userId = auth.userId;

  // No userId = not authenticated, let them through to public pages
  // Clerk's own middleware will handle auth redirects
  if (!userId) {
    return NextResponse.next();
  }

  // Fetch user from database with their school info
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        status: true,
        role: true,
        schoolId: true,
      },
    });
  } catch (error) {
    console.error('Middleware: Failed to fetch user:', error);
    // On error, let request through to avoid blocking
    return NextResponse.next();
  }

  // No user in DB = still onboarding, let them through
  if (!user) {
    // If trying to access protected routes, redirect to setup
    if (!isPublicPath(pathname) && !pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
    return NextResponse.next();
  }

  // ==========================================================================
  // APPROVAL STATUS CHECKS
  // ==========================================================================

  // PENDING: Only allow onboarding paths
  if (user.status === UserStatus.PENDING) {
    // Already on waiting page? Allow it (prevent loop)
    if (isOnWaitingPage(pathname)) {
      return NextResponse.next();
    }

    // Check if path is in pending allowlist
    if (isPendingAllowedPath(pathname)) {
      return NextResponse.next();
    }

    // Not allowed - redirect to waiting page
    return NextResponse.redirect(new URL('/onboarding/waiting', request.url));
  }

  // REJECTED: Redirect to rejected page
  if (user.status === UserStatus.REJECTED) {
    // Already on rejected page? Allow it (prevent loop)
    if (isOnRejectedPage(pathname)) {
      return NextResponse.next();
    }

    // Redirect to rejected page
    return NextResponse.redirect(new URL('/onboarding/rejected', request.url));
  }

  // SUSPENDED: Treat like rejected for now
  if (user.status === UserStatus.SUSPENDED) {
    if (isOnRejectedPage(pathname)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/onboarding/rejected', request.url));
  }

  // APPROVED: Route by role
  if (user.status === UserStatus.APPROVED) {
    const dashboardUrl = getDashboardUrlForRole(user.role, user.schoolId);

    // If user is on an onboarding page but approved, redirect to dashboard
    if (pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }

    // If user is on root or sign-in page, redirect to dashboard
    if (pathname === '/' || pathname === '/sign-in' || pathname === '/sign-up') {
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }

    // Otherwise, allow the request
    return NextResponse.next();
  }

  // Unknown status - allow through (shouldn't happen)
  return NextResponse.next();
}

// ============================================================================
// MATCHER CONFIGURATION
// ============================================================================

/**
 * Configure which paths the middleware runs on
 * Excludes static files and API routes
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};
