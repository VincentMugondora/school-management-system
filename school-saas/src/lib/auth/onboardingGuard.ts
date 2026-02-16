/**
 * @fileoverview Onboarding Guard
 * @description Guards admin routes to ensure administrators complete school onboarding
 * before accessing the dashboard. Detects ADMIN users without an associated school
 * and redirects them to the school creation flow.
 *
 * @module @/lib/auth/onboardingGuard
 */

import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Onboarding check result
 * @interface OnboardingCheckResult
 */
export interface OnboardingCheckResult {
  /** Whether the user needs to complete onboarding */
  needsOnboarding: boolean;

  /** The target redirect URL if onboarding is needed */
  redirectUrl?: string;

  /** The user's current school ID if they have one */
  schoolId?: string | null;

  /** The user's role */
  role?: Role;
}

/**
 * Check if a user needs to complete school onboarding.
 * ADMIN and SUPER_ADMIN users without a schoolId must create a school first.
 *
 * @param userId - The authenticated user's ID (from Clerk)
 * @returns Onboarding check result
 */
export async function checkOnboardingStatus(
  userId: string
): Promise<OnboardingCheckResult> {
  // Fetch user from database to check role and school association
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, role: true, schoolId: true },
  });

  // User not found in database - they need to complete profile setup first
  if (!user) {
    return {
      needsOnboarding: true,
      redirectUrl: '/setup',
      schoolId: null,
    };
  }

  // Only admins need school onboarding
  const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;

  if (!isAdmin) {
    // Non-admin users don't need school onboarding
    return {
      needsOnboarding: false,
      schoolId: user.schoolId,
      role: user.role,
    };
  }

  // Admin without school needs to create one
  if (!user.schoolId) {
    return {
      needsOnboarding: true,
      redirectUrl: '/dashboard/admin/school/new',
      schoolId: null,
      role: user.role,
    };
  }

  // Admin with school - onboarding complete
  return {
    needsOnboarding: false,
    schoolId: user.schoolId,
    role: user.role,
  };
}

/**
 * Guard middleware for admin routes.
 * Redirects to school creation if admin hasn't onboarded.
 *
 * @param request - The Next.js request object
 * @param userId - The authenticated user's Clerk ID
 * @returns NextResponse redirect if onboarding needed, null if allowed
 */
export async function onboardingGuard(
  request: NextRequest,
  userId: string
): Promise<NextResponse | null> {
  const check = await checkOnboardingStatus(userId);

  if (check.needsOnboarding && check.redirectUrl) {
    // Prevent redirect loops - don't redirect if already on target page
    const currentPath = request.nextUrl.pathname;
    const targetPath = check.redirectUrl;

    if (currentPath === targetPath || currentPath.startsWith(targetPath)) {
      return null;
    }

    // Create redirect response
    const redirectUrl = new URL(check.redirectUrl, request.url);
    // Preserve original destination for post-onboarding redirect
    if (currentPath !== '/dashboard/admin') {
      redirectUrl.searchParams.set('redirectTo', currentPath);
    }

    return NextResponse.redirect(redirectUrl);
  }

  return null;
}

/**
 * Check if a specific path requires school onboarding.
 * Used to determine if the onboarding guard should run.
 *
 * @param pathname - The request path
 * @returns true if the path requires school onboarding
 */
export function pathRequiresOnboarding(pathname: string): boolean {
  // These paths require school onboarding for admins
  const protectedPaths = [
    '/dashboard/admin/classes',
    '/dashboard/admin/students',
    '/dashboard/admin/teachers',
    '/dashboard/admin/academic-years',
    '/dashboard/admin/exams',
    '/dashboard/admin/subjects',
    '/dashboard/admin/settings',
    '/api/admin/classes',
    '/api/admin/students',
    '/api/admin/teachers',
    '/api/admin/academic-years',
    '/api/admin/school', // school creation API is allowed, others blocked
  ];

  // Check if path matches any protected pattern
  return protectedPaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  );
}

/**
 * Check if a path is part of the onboarding flow.
 * Used to prevent redirect loops.
 *
 * @param pathname - The request path
 * @returns true if the path is part of onboarding
 */
export function isOnboardingPath(pathname: string): boolean {
  const onboardingPaths = [
    '/setup',
    '/dashboard/admin/school/new',
    '/api/admin/school',
  ];

  return onboardingPaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  );
}

/**
 * Get the onboarding status for client-side use.
 * Can be called from server components or API routes.
 *
 * @param userId - The authenticated user's Clerk ID
 * @returns Simplified onboarding status
 */
export async function getOnboardingStatus(userId: string): Promise<{
  complete: boolean;
  needsSchool: boolean;
  redirectUrl?: string;
}> {
  const check = await checkOnboardingStatus(userId);

  return {
    complete: !check.needsOnboarding,
    needsSchool: check.needsOnboarding && check.redirectUrl?.includes('/school') === true,
    redirectUrl: check.redirectUrl,
  };
}
