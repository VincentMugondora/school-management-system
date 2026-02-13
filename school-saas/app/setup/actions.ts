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
}

export async function createUserProfile(input: CreateUserProfileInput) {
  try {
    // Validate input
    if (!input.email || !input.firstName || !input.lastName) {
      return { success: false, error: 'Email, first name, and last name are required' };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: input.clerkId },
    });

    if (existingUser) {
      return { success: false, error: 'User profile already exists' };
    }

    // Determine role - first user becomes SUPER_ADMIN
    const role = input.isFirstUser ? Role.SUPER_ADMIN : Role.STUDENT;

    // Create user in database
    const user = await prisma.user.create({
      data: {
        clerkId: input.clerkId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        role: role,
      },
    });

    return { success: true, data: user };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: 'Failed to create user profile' };
  }
}
