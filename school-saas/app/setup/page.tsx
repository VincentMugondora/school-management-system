import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';
import SetupForm from './SetupForm';

export default async function SetupPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Check if user already exists in database
  const existingUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (existingUser) {
    redirect('/dashboard');
  }

  // Check if any users exist (first user becomes SUPER_ADMIN)
  const userCount = await prisma.user.count();
  const isFirstUser = userCount === 0;

  // Get user info from Clerk session
  const email = sessionClaims?.email as string | undefined;
  const firstName = sessionClaims?.firstName as string | undefined;
  const lastName = sessionClaims?.lastName as string | undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Account Setup
        </h1>
        <p className="mb-6 text-center text-gray-600">
          {isFirstUser 
            ? "You're the first user! You'll be set up as a Super Administrator."
            : "Complete your profile to access the system."
          }
        </p>
        
        <SetupForm 
          clerkId={userId}
          email={email || ''}
          firstName={firstName || ''}
          lastName={lastName || ''}
          isFirstUser={isFirstUser}
        />
      </div>
    </div>
  );
}
