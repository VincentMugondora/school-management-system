import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';

/**
 * Dashboard Root Layout
 *
 * Server-side layout that enforces school onboarding for admin users.
 * Admins without a school are redirected to the onboarding flow.
 *
 * @layout app/dashboard/layout.tsx
 */

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get authenticated user from Clerk
  const clerkUser = await currentUser();

  if (!clerkUser) {
    // Let middleware handle unauthenticated users
    return <>{children}</>;
  }

  // Fetch user from database to check role and school association
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: { school: { select: { name: true } } },
  });

  // If user not in DB, let them through (profile setup will handle it)
  if (!user) {
    return <>{children}</>;
  }

  // Check if admin without school
  const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
  const needsOnboarding = isAdmin && !user.schoolId;

  if (needsOnboarding) {
    // Redirect to school onboarding
    redirect('/onboarding/school');
  }

  // User has school or doesn't need one - render dashboard
  return <>{children}</>;
}
