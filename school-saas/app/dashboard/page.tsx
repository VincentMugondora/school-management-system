import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import Link from 'next/link';

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Get user from database to check status/role routing
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true, status: true, schoolId: true },
  });

  // If user exists in Clerk but not in our database, redirect to setup
  if (!user) {
    redirect('/setup');
  }

  if (user.role === Role.SUPER_ADMIN) {
    redirect('/dashboard/superadmin');
  }

  if (user.status === 'PENDING') {
    redirect('/onboarding/waiting');
  }

  if (user.status === 'REJECTED' || user.status === 'SUSPENDED') {
    redirect('/onboarding/rejected');
  }

  // Redirect based on role
  switch (user?.role) {
    case Role.ADMIN:
      if (!user.schoolId) {
        redirect('/onboarding/school');
      }
      redirect('/dashboard/admin');
    case Role.TEACHER:
      redirect('/dashboard/teacher');
    case Role.STUDENT:
      redirect('/dashboard/student');
    case Role.PARENT:
      redirect('/dashboard/parent');
    case Role.ACCOUNTANT:
      redirect('/dashboard/accountant');
    default:
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">You do not have permission to access the dashboard.</p>
            <Link href="/" className="text-indigo-600 hover:underline">Return to Home</Link>
          </div>
        </div>
      );
  }
}
