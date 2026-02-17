import { prisma } from '@/lib/db';
import { Role, UserStatus, SchoolStatus } from '@prisma/client';
import type { User } from '@prisma/client';

/**
 * RequestAccessService
 *
 * Handles user access requests for schools.
 * Validates all prerequisites and creates users with PENDING status.
 *
 * @module src/services/onboarding/requestAccess.service.ts
 */

export interface AccessRequestInput {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  schoolId: string;
}

export interface AccessRequestResult {
  success: boolean;
  user?: User;
  message: string;
  code: 'SUCCESS' | 'SCHOOL_NOT_FOUND' | 'SCHOOL_SUSPENDED' | 'ROLE_NOT_ALLOWED' | 'ALREADY_APPROVED' | 'ALREADY_PENDING' | 'DUPLICATE_EMAIL' | 'SUPERADMIN_MUST_BE_AUTO_APPROVED' | 'INTERNAL_ERROR';
}

// Roles that can request school access (cannot request SUPER_ADMIN)
const ALLOWED_REQUEST_ROLES: Role[] = [
  Role.ADMIN,
  Role.TEACHER,
  Role.STUDENT,
  Role.PARENT,
  Role.ACCOUNTANT,
];

/**
 * Validates if the role is allowed for access requests.
 * SUPER_ADMIN cannot be requested - it must be created directly.
 */
function validateRole(role: Role): { valid: boolean; message?: string } {
  if (role === Role.SUPER_ADMIN) {
    return {
      valid: false,
      message: 'SUPER_ADMIN role cannot be requested. Contact platform administrator directly.',
    };
  }

  if (!ALLOWED_REQUEST_ROLES.includes(role)) {
    return {
      valid: false,
      message: `Role ${role} is not allowed for access requests`,
    };
  }

  return { valid: true };
}

/**
 * Validates school existence and status.
 */
async function validateSchool(schoolId: string): Promise<{ valid: boolean; message?: string }> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, status: true },
  });

  if (!school) {
    return {
      valid: false,
      message: 'School not found',
    };
  }

  if (school.status === SchoolStatus.SUSPENDED) {
    return {
      valid: false,
      message: 'School is currently suspended and not accepting new access requests',
    };
  }

  return { valid: true };
}

/**
 * Checks for existing users with the same clerkId, email, or pending request.
 */
async function checkExistingUser(
  clerkId: string,
  email: string,
  schoolId: string,
  role: Role
): Promise<{ valid: boolean; message?: string; code?: AccessRequestResult['code'] }> {
  // Check by clerkId
  const existingByClerkId = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, status: true, schoolId: true, role: true, email: true },
  });

  if (existingByClerkId) {
    if (existingByClerkId.status === UserStatus.APPROVED) {
      return {
        valid: false,
        message: 'You already have an approved account',
        code: 'ALREADY_APPROVED',
      };
    }

    if (existingByClerkId.status === UserStatus.PENDING) {
      return {
        valid: false,
        message: 'You already have a pending access request',
        code: 'ALREADY_PENDING',
      };
    }

    if (existingByClerkId.status === UserStatus.REJECTED) {
      return {
        valid: false,
        message: 'Your previous access request was rejected. Contact administrator.',
        code: 'ALREADY_APPROVED', // Using this code as it's a final state
      };
    }

    if (existingByClerkId.status === UserStatus.SUSPENDED) {
      return {
        valid: false,
        message: 'Your account is suspended. Contact administrator.',
        code: 'ALREADY_APPROVED',
      };
    }
  }

  // Check by email (different clerkId but same email)
  const existingByEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true, status: true, schoolId: true, clerkId: true },
  });

  if (existingByEmail && existingByEmail.clerkId !== clerkId) {
    return {
      valid: false,
      message: 'Email address is already registered',
      code: 'DUPLICATE_EMAIL',
    };
  }

  // Check for existing pending request at same school with same role
  const existingPendingAtSchool = await prisma.user.findFirst({
    where: {
      schoolId,
      role,
      status: UserStatus.PENDING,
      OR: [{ clerkId }, { email }],
    },
  });

  if (existingPendingAtSchool) {
    return {
      valid: false,
      message: 'You already have a pending request for this school',
      code: 'ALREADY_PENDING',
    };
  }

  return { valid: true };
}

/**
 * Creates a new user with PENDING status.
 */
async function createPendingUser(input: AccessRequestInput): Promise<User> {
  const user = await prisma.user.create({
    data: {
      clerkId: input.clerkId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      schoolId: input.schoolId,
      status: UserStatus.PENDING,
      isActive: false, // Pending users are inactive until approved
    },
  });

  // Create audit log for the access request
  await prisma.auditLog.create({
    data: {
      schoolId: input.schoolId,
      userId: user.id,
      action: 'REQUEST_ACCESS',
      entity: 'USER',
      entityId: user.id,
      details: `User ${input.email} requested ${input.role} access to school`,
    },
  });

  return user;
}

/**
 * Main function to request access to a school.
 * Validates all prerequisites and creates user with PENDING status.
 */
export async function requestAccess(
  input: AccessRequestInput
): Promise<AccessRequestResult> {
  try {
    // Step 1: Validate role
    const roleValidation = validateRole(input.role);
    if (!roleValidation.valid) {
      return {
        success: false,
        message: roleValidation.message!,
        code: 'ROLE_NOT_ALLOWED',
      };
    }

    // Step 2: Validate school exists and is active
    const schoolValidation = await validateSchool(input.schoolId);
    if (!schoolValidation.valid) {
      return {
        success: false,
        message: schoolValidation.message!,
        code: schoolValidation.message === 'School not found' 
          ? 'SCHOOL_NOT_FOUND' 
          : 'SCHOOL_SUSPENDED',
      };
    }

    // Step 3: Check for existing users/requests
    const existingCheck = await checkExistingUser(
      input.clerkId,
      input.email,
      input.schoolId,
      input.role
    );
    if (!existingCheck.valid) {
      return {
        success: false,
        message: existingCheck.message!,
        code: existingCheck.code!,
      };
    }

    // Step 4: Create user with PENDING status
    const user = await createPendingUser(input);

    return {
      success: true,
      user,
      message: 'Access request submitted successfully. Awaiting approval.',
      code: 'SUCCESS',
    };
  } catch (error) {
    console.error('[RequestAccessService] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Internal error processing request',
      code: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Gets the pending access request for a user if exists.
 */
export async function getPendingRequest(clerkId: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: {
      clerkId,
      status: UserStatus.PENDING,
    },
  });
}

/**
 * Cancels a pending access request.
 */
export async function cancelPendingRequest(
  clerkId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        clerkId,
        status: UserStatus.PENDING,
      },
    });

    if (!user) {
      return {
        success: false,
        message: 'Pending request not found',
      };
    }

    // Soft delete by updating status to REJECTED or delete entirely
    await prisma.user.delete({
      where: { id: userId },
    });

    // Create audit log
    await prisma.auditLog.create({
    data: {
        schoolId: user.schoolId,
        userId,
        action: 'CANCEL_ACCESS_REQUEST',
        entity: 'USER',
        entityId: userId,
        details: `User ${user.email} cancelled their access request`,
      },
    });

    return {
      success: true,
      message: 'Access request cancelled successfully',
    };
  } catch (error) {
    console.error('[RequestAccessService] Cancel error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to cancel request',
    };
  }
}

/**
 * Check if a user can request access to a specific school.
 * Returns detailed information about why or why not.
 */
export async function canRequestAccess(
  clerkId: string,
  email: string,
  schoolId: string,
  role: Role
): Promise<{
  canRequest: boolean;
  reason?: string;
  code?: AccessRequestResult['code'];
}> {
  // Quick role check
  if (role === Role.SUPER_ADMIN) {
    return {
      canRequest: false,
      reason: 'SUPER_ADMIN role cannot be requested',
      code: 'ROLE_NOT_ALLOWED',
    };
  }

  // Check school
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { status: true },
  });

  if (!school) {
    return {
      canRequest: false,
      reason: 'School not found',
      code: 'SCHOOL_NOT_FOUND',
    };
  }

  if (school.status === SchoolStatus.SUSPENDED) {
    return {
      canRequest: false,
      reason: 'School is suspended',
      code: 'SCHOOL_SUSPENDED',
    };
  }

  // Check existing
  const existingCheck = await checkExistingUser(clerkId, email, schoolId, role);
  if (!existingCheck.valid) {
    return {
      canRequest: false,
      reason: existingCheck.message,
      code: existingCheck.code,
    };
  }

  return {
    canRequest: true,
  };
}
