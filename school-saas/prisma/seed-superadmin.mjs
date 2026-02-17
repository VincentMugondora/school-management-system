#!/usr/bin/env node
/**
 * SuperAdmin Seed Script
 *
 * Creates an approved SuperAdmin user in the database.
 *
 * Usage:
 *   SUPERADMIN_CLERK_ID=user_xxx SUPERADMIN_EMAIL=admin@example.com node prisma/seed-superadmin.mjs
 *
 * Or with all variables:
 *   SUPERADMIN_CLERK_ID=user_xxx SUPERADMIN_EMAIL=admin@example.com SUPERADMIN_FIRST_NAME=John SUPERADMIN_LAST_NAME=Doe node prisma/seed-superadmin.mjs
 */

import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !line.startsWith('#')) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

// Load env before creating Prisma client
loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Error: DATABASE_URL is not set in environment or .env file');
  process.exit(1);
}

// Debug: Log the connection string (masked)
const maskedUrl = connectionString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
console.log('Using DATABASE_URL:', maskedUrl);

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function seedSuperAdmin() {
  const clerkId = process.env.SUPERADMIN_CLERK_ID;
  const email = process.env.SUPERADMIN_EMAIL;
  const firstName = process.env.SUPERADMIN_FIRST_NAME || 'Super';
  const lastName = process.env.SUPERADMIN_LAST_NAME || 'Admin';

  if (!clerkId || !email) {
    console.error('Error: SUPERADMIN_CLERK_ID and SUPERADMIN_EMAIL are required');
    console.error('');
    console.error('Usage examples:');
    console.error('  PowerShell:');
    console.error('    $env:SUPERADMIN_CLERK_ID="user_xxx"; $env:SUPERADMIN_EMAIL="admin@example.com"; node prisma/seed-superadmin.mjs');
    console.error('');
    console.error('  CMD:');
    console.error('    set SUPERADMIN_CLERK_ID=user_xxx && set SUPERADMIN_EMAIL=admin@example.com && node prisma/seed-superadmin.mjs');
    console.error('');
    console.error('  Bash/Mac:');
    console.error('    SUPERADMIN_CLERK_ID=user_xxx SUPERADMIN_EMAIL=admin@example.com node prisma/seed-superadmin.mjs');
    process.exit(1);
  }

  try {
    // Check if user already exists by clerkId
    let existingUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    // If not found by clerkId, check by email
    if (!existingUser) {
      existingUser = await prisma.user.findUnique({
        where: { email },
      });
    }

    if (existingUser) {
      if (existingUser.role === Role.SUPER_ADMIN && existingUser.status === UserStatus.APPROVED) {
        console.log('✓ SuperAdmin already exists and is approved:', existingUser.email);
        return;
      }

      // Update existing user to SuperAdmin if needed
      const updated = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          clerkId, // Update clerkId in case it changed
          role: Role.SUPER_ADMIN,
          status: UserStatus.APPROVED,
          approvedAt: new Date(),
          schoolId: null, // SuperAdmin has no school
        },
      });

      console.log('✓ Updated user to approved SuperAdmin:', updated.email);
      console.log('  ID:', updated.id);
      console.log('  Role:', updated.role);
      console.log('  Status:', updated.status);
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
    console.log('  ID:', superAdmin.id);
    console.log('  Role:', superAdmin.role);
    console.log('  Status:', superAdmin.status);

  } catch (error) {
    console.error('Error seeding SuperAdmin:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

seedSuperAdmin();
