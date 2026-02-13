import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db';

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Get user from database to check role
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  });

  // Redirect based on role
  switch (user?.role) {
    case Role.SUPER_ADMIN:
    case Role.ADMIN:
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
      redirect('/sign-in');
  }
}
