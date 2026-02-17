import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { checkRoleAccess } from '@/lib/auth/roleGuard';

/**
 * Next.js Middleware for Role-Based Access Control
 * 
 * This middleware:
 * 1. Blocks SUPERADMIN from accessing /dashboard/admin/*
 * 2. Blocks non-superadmin from accessing /dashboard/superadmin/*
 * 
 * Protected paths are enforced at the edge before requests reach the application.
 */

// Paths that require authentication but are handled by Clerk middleware
const PUBLIC_PATHS = [
  '/sign-in',
  '/sign-up',
  '/',
  '/api/webhook',
];

// Check if path is public
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Only apply role guards to dashboard routes
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  // Get authenticated user from Clerk
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    // Let Clerk's middleware handle unauthenticated users
    return NextResponse.next();
  }

  // Fetch user role from database
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true },
  });

  if (!user) {
    // User not in DB yet, let them through (profile setup will handle)
    return NextResponse.next();
  }

  // Check role-based access restrictions
  const redirectUrl = checkRoleAccess(pathname, user.role);
  
  if (redirectUrl) {
    // Redirect to appropriate dashboard based on role
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  return NextResponse.next();
}

/**
 * Middleware configuration
 * 
 * Match all dashboard paths for role checking.
 * Exclude static files and API routes that don't need role checks.
 */
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$).*)',
  ],
};
