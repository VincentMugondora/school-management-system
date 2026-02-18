import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { onboardingGuard, pathRequiresOnboarding, isOnboardingPath } from './src/lib/auth/onboardingGuard';
import { approvalGuard, pathRequiresApproval, isApprovalPath } from './src/lib/auth/approvalGuard';
import { getPostLoginRedirect, isPostLoginEntryPath } from './src/lib/auth/postLoginRedirect';
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

      if (user?.role === 'SUPER_ADMIN') {
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
