import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  // Get all students with their school info
  const students = await prisma.student.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      studentId: true,
      schoolId: true,
      createdAt: true,
      school: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // Get all schools
  const schools = await prisma.school.findMany({
    select: { id: true, name: true },
  });

  // Get all users with their schools
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      schoolId: true,
      clerkId: true,
    },
  });

  return NextResponse.json({
    students,
    schools,
    users,
    totalStudents: students.length,
  });
}
