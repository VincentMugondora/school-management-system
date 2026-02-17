'use server';

import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';

interface CreateUserProfileInput {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isFirstUser: boolean;
  schoolName?: string;
}

export async function createUserProfile(input: CreateUserProfileInput) {
  try {
    // Validate input
    if (!input.email || !input.firstName || !input.lastName) {
      return { success: false, error: 'Email, first name, and last name are required' };
    }

    // Check if user already exists by clerkId
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: input.clerkId },
    });

    if (existingUser) {
      return { success: false, error: 'User profile already exists' };
    }

    // Check if user exists by email (seeded user case)
    const existingByEmail = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingByEmail) {
      // Update the seeded user with the real clerkId
      const updated = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          clerkId: input.clerkId,
          firstName: input.firstName,
          lastName: input.lastName,
          role: Role.SUPER_ADMIN,
          status: 'APPROVED',
          approvedAt: new Date(),
        },
      });
      return { success: true, data: updated };
    }

    // Determine role - first user becomes SUPER_ADMIN
    const role = input.isFirstUser ? Role.SUPER_ADMIN : Role.STUDENT;

    let schoolId: string | undefined;

    // For first user, create a school
    if (input.isFirstUser && input.schoolName) {
      const school = await prisma.school.create({
        data: {
          name: input.schoolName.trim(),
          slug: input.schoolName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          status: 'ACTIVE',
        },
      });
      schoolId = school.id;
    }

    // Create user in database
    const user = await prisma.user.create({
      data: {
        clerkId: input.clerkId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        role: role,
        schoolId: schoolId,
      },
    });

    return { success: true, data: user };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: 'Failed to create user profile' };
  }
}
