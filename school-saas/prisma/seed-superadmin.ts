#!/usr/bin/env node
/**
 * SuperAdmin Seed Script
 *
 * Creates an approved SuperAdmin user in the database.
 * Run with: npx ts-node prisma/seed-superadmin.ts
 *
 * Environment variables:
 * - SUPERADMIN_CLERK_ID: The Clerk user ID (required)
 * - SUPERADMIN_EMAIL: The email address (required)
 * - SUPERADMIN_FIRST_NAME: First name (optional)
 * - SUPERADMIN_LAST_NAME: Last name (optional)
 */

import { PrismaClient, Role, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSuperAdmin() {
  const clerkId = process.env.SUPERADMIN_CLERK_ID;
  const email = process.env.SUPERADMIN_EMAIL;
  const firstName = process.env.SUPERADMIN_FIRST_NAME || 'Super';
  const lastName = process.env.SUPERADMIN_LAST_NAME || 'Admin';

  if (!clerkId || !email) {
    console.error('Error: SUPERADMIN_CLERK_ID and SUPERADMIN_EMAIL are required');
    console.error('Usage: SUPERADMIN_CLERK_ID=user_xxx SUPERADMIN_EMAIL=admin@example.com npx ts-node prisma/seed-superadmin.ts');
    process.exit(1);
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (existingUser) {
      if (existingUser.role === Role.SUPER_ADMIN && existingUser.status === UserStatus.APPROVED) {
        console.log('✓ SuperAdmin already exists and is approved:', existingUser.email);
        return;
      }

      // Update existing user to SuperAdmin if needed
      const updated = await prisma.user.update({
        where: { clerkId },
        data: {
          role: Role.SUPER_ADMIN,
          status: UserStatus.APPROVED,
          approvedAt: new Date(),
          schoolId: null, // SuperAdmin has no school
        },
      });

      console.log('✓ Updated user to approved SuperAdmin:', updated.email);
      return;
    }

    // Create new approved SuperAdmin
    const superAdmin = await prisma.user.create({
      data: {
        clerkId,
        email,
        firstName,
        lastName,
        role: Role.SUPER_ADMIN,
        status: UserStatus.APPROVED,
        approvedAt: new Date(),
        schoolId: null, // SuperAdmin has no school
        isActive: true,
      },
    });

    console.log('✓ Created approved SuperAdmin:', superAdmin.email);
    console.log('  Role:', superAdmin.role);
    console.log('  Status:', superAdmin.status);
    console.log('  ID:', superAdmin.id);

  } catch (error) {
    console.error('Error seeding SuperAdmin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedSuperAdmin();
