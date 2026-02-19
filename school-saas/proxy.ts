import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { onboardingGuard, pathRequiresOnboarding, isOnboardingPath } from './src/lib/auth/onboardingGuard';
import { approvalGuard, pathRequiresApproval, isApprovalPath } from './src/lib/auth/approvalGuard';
import { getPostLoginRedirect, isPostLoginEntryPath } from './src/lib/auth/postLoginRedirect';
import { getImpersonationContextFromSession } from './src/lib/auth/impersonation';
import { prisma } from './lib/db';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api(.*)',
]);

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/setup',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  
  // Skip middleware for public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }
  
  // If accessing a protected route and not logged in, redirect to sign-in
  if (isProtectedRoute(req) && !userId) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Handle post-login redirects for entry paths (home, sign-in, etc.)
  if (userId && isPostLoginEntryPath(req.nextUrl.pathname)) {
    const redirectResult = await getPostLoginRedirect(userId);
    
    // Only redirect if we're not already at the target URL
    if (redirectResult.redirectUrl !== req.nextUrl.pathname) {
      return NextResponse.redirect(new URL(redirectResult.redirectUrl, req.url));
    }
  }

  // SUPER_ADMIN bypass: never force school onboarding or approval waiting
  if (userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { role: true },
      });

      // Check if SUPER_ADMIN (handle both enum and string comparison)
      if (user?.role === 'SUPER_ADMIN' || user?.role === Role.SUPER_ADMIN) {
        // Check for active impersonation session from Clerk claims
        const impersonationContext = await getImpersonationContextFromSession();
        
        if (impersonationContext) {
          // Add impersonation context to request headers for downstream use
          const requestHeaders = new Headers(req.headers);
          requestHeaders.set('x-impersonating', 'true');
          requestHeaders.set('x-impersonation-session-id', impersonationContext.sessionId);
          requestHeaders.set('x-impersonation-target-user-id', impersonationContext.targetUserId);
          requestHeaders.set('x-impersonation-target-role', impersonationContext.targetRole);
          requestHeaders.set('x-impersonation-school-id', impersonationContext.targetSchoolId || '');
          requestHeaders.set('x-impersonation-school-name', impersonationContext.schoolName || '');
          
          return NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
        }
        
        return NextResponse.next();
      }
    } catch {
      // Fail open on DB issues to avoid blocking requests
      return NextResponse.next();
    }
  }

  // Check onboarding status for admin routes that require school setup
  if (userId && pathRequiresOnboarding(req.nextUrl.pathname) && !isOnboardingPath(req.nextUrl.pathname)) {
    const onboardingRedirect = await onboardingGuard(req, userId);
    if (onboardingRedirect) {
      return onboardingRedirect;
    }
  }

  // Check approval status for dashboard routes
  if (userId && pathRequiresApproval(req.nextUrl.pathname) && !isApprovalPath(req.nextUrl.pathname)) {
    const approvalRedirect = await approvalGuard(req, userId);
    if (approvalRedirect) {
      return approvalRedirect;
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
