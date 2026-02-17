import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getPostLoginRedirect,
  isPostLoginEntryPath,
} from '@/lib/auth/postLoginRedirect';

/**
 * GET /api/auth/post-login-redirect
 *
 * API endpoint to determine where to redirect the user after login.
 * Returns the appropriate redirect URL based on user approval status.
 *
 * Query params:
 * - from: The original path the user was trying to access (optional)
 *
 * Response:
 * - 200: { redirectUrl: string, isApproved: boolean, status: UserStatus }
 * - 401: User not authenticated
 */

export async function GET(request: NextRequest) {
  try {
    // Step 1: Verify authentication
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Step 2: Get redirect URL based on user status
    const result = await getPostLoginRedirect(clerkId);

    // Step 3: Check if there's a 'from' parameter to redirect back to after approval
    const { searchParams } = new URL(request.url);
    const fromPath = searchParams.get('from');

    // If user is approved and there's a from path, redirect there instead of default dashboard
    if (result.isApproved && fromPath && isValidRedirectPath(fromPath)) {
      return NextResponse.json({
        ...result,
        redirectUrl: fromPath,
      });
    }

    // Step 4: Return the redirect information
    return NextResponse.json(result);
  } catch (error) {
    console.error('Post-login redirect API Error:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to determine redirect URL',
        redirectUrl: '/dashboard', // Fallback
      },
      { status: 500 }
    );
  }
}

/**
 * Validate that a redirect path is safe and internal.
 * Prevents open redirect vulnerabilities.
 *
 * @param path - The path to validate
 * @returns true if the path is a valid internal redirect
 */
function isValidRedirectPath(path: string): boolean {
  // Only allow internal paths (starting with /)
  if (!path.startsWith('/')) {
    return false;
  }

  // Block protocol-relative URLs and data URLs
  if (path.startsWith('//') || path.startsWith('data:')) {
    return false;
  }

  // Only allow dashboard and safe paths
  const allowedPrefixes = [
    '/dashboard',
    '/profile',
    '/settings',
    '/courses',
    '/classes',
  ];

  return allowedPrefixes.some((prefix) => path.startsWith(prefix));
}
