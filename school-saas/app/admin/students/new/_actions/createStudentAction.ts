'use server';

import { StudentService } from '@/src/services/student.service';
import { GuardianRelationship } from '@/types/student.domain';
import { Gender } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

interface CreateStudentInput {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: Gender;
  email?: string;
  phone?: string;
  address?: string;
  classId: string;
  academicYearId: string;
  guardians?: Array<{
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    relationship: GuardianRelationship;
  }>;
}

async function getCurrentUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      schoolId: true,
      role: true,
    },
  });

  if (!user) return null;
  return user;
}

export async function createStudentAction(input: CreateStudentInput) {
  try {
    const user = await getCurrentUser();
    if (!user?.schoolId) {
      return { success: false, error: 'Unauthorized' };
    }

    const context = {
      userId: user.id,
      schoolId: user.schoolId,
      role: user.role,
    };

    const student = await StudentService.createStudent(
      user.schoolId,
      {
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
        gender: input.gender,
        email: input.email,
        phone: input.phone,
        address: input.address,
        classId: input.classId,
        academicYearId: input.academicYearId,
        guardians: input.guardians,
      },
      context
    );

    revalidatePath('/admin/students');
    return { success: true, data: student };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to create student' };
  }
}
