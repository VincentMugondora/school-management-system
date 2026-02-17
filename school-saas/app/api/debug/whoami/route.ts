import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const { userId: clerkId } = await auth();
  
  if (!clerkId) {
    return NextResponse.json({ error: 'Not authenticated', clerkId: null });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      email: true,
      role: true,
      schoolId: true,
      school: { select: { name: true } },
      clerkId: true,
    },
  });

  return NextResponse.json({
    clerkId,
    user,
    message: user 
      ? `Logged in as ${user.email} (${user.role}) in school: ${user.school?.name || 'No school'}`
      : 'User not found in database for this Clerk ID',
  });
}
