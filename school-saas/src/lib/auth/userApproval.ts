import { prisma } from '@/lib/db';
import { Role, UserStatus } from '@prisma/client';
import type { User } from '@prisma/client';

/**
 * User Approval Utility
 *
 * Enforces approval-based onboarding rules:
 * - New users default to PENDING status
 * - SUPERADMIN users are automatically APPROVED
 * - Regular users must be approved by an existing admin
 *
 * @module src/lib/auth/userApproval.ts
 */

export interface UserApprovalInput {
  email: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  schoolId?: string | null;
  clerkId: string;
}

export interface ApprovalResult {
  user: User;
  wasAutoApproved: boolean;
  message: string;
}

/**
 * Determines the initial status for a new user based on their role.
 * SUPERADMIN users are auto-approved; all others start as PENDING.
 */
function determineInitialStatus(role: Role): UserStatus {
  if (role === Role.SUPER_ADMIN) {
    return UserStatus.APPROVED;
  }
  return UserStatus.PENDING;
}

/**
 * Creates a new user with appropriate approval status.
 * Automatically approves SUPERADMIN users.
 */
export async function createUserWithApproval(
  input: UserApprovalInput,
  approvedById?: string
): Promise<ApprovalResult> {
  const initialStatus = determineInitialStatus(input.role);
  const wasAutoApproved = initialStatus === UserStatus.APPROVED;

  const user = await prisma.user.create({
    data: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      schoolId: input.schoolId,
      clerkId: input.clerkId,
      status: initialStatus,
      approvedAt: wasAutoApproved ? new Date() : null,
      approvedById: wasAutoApproved ? null : approvedById,
      isActive: true,
    },
  });

  // Create audit log for approval action
  if (wasAutoApproved) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'AUTO_APPROVE_USER',
        entity: 'USER',
        entityId: user.id,
        details: `SUPERADMIN user ${input.email} was automatically approved`,
      },
    });
  }

  return {
    user,
    wasAutoApproved,
    message: wasAutoApproved
      ? 'SUPERADMIN user automatically approved'
      : 'User created with PENDING status, awaiting approval',
  };
}

/**
 * Approves a pending user.
 * Only admins can approve users within their school.
 * Superadmins can approve any user.
 */
export async function approveUser(
  userId: string,
  approverId: string,
  approverRole: Role,
  approverSchoolId?: string | null
): Promise<User> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.status !== UserStatus.PENDING) {
    throw new Error(`User cannot be approved. Current status: ${user.status}`);
  }

  // Check approval permissions
  if (approverRole !== Role.SUPER_ADMIN) {
    // Non-superadmin cannot approve SUPERADMIN users
    if (user.role === Role.SUPER_ADMIN) {
      throw new Error('You cannot approve Super Administrator users');
    }
    // Non-superadmin can only approve users in their own school
    if (user.schoolId !== approverSchoolId) {
      throw new Error('You can only approve users in your school');
    }
  }

  const approvedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      status: UserStatus.APPROVED,
      approvedAt: new Date(),
      approvedById: approverId,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      schoolId: user.schoolId,
      userId: approverId,
      action: 'APPROVE_USER',
      entity: 'USER',
      entityId: userId,
      details: `Approved user ${user.email}`,
    },
  });

  return approvedUser;
}

/**
 * Rejects a pending user.
 */
export async function rejectUser(
  userId: string,
  approverId: string,
  approverRole: Role,
  approverSchoolId?: string | null,
  reason?: string
): Promise<User> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.status !== UserStatus.PENDING) {
    throw new Error(`User cannot be rejected. Current status: ${user.status}`);
  }

  // Check permissions
  if (approverRole !== Role.SUPER_ADMIN) {
    // Non-superadmin cannot reject SUPERADMIN users
    if (user.role === Role.SUPER_ADMIN) {
      throw new Error('You cannot reject Super Administrator users');
    }
    // Non-superadmin can only reject users in their own school
    if (user.schoolId !== approverSchoolId) {
      throw new Error('You can only reject users in your school');
    }
  }

  const rejectedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      status: UserStatus.REJECTED,
      approvedById: approverId,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      schoolId: user.schoolId,
      userId: approverId,
      action: 'REJECT_USER',
      entity: 'USER',
      entityId: userId,
      details: `Rejected user ${user.email}${reason ? `: ${reason}` : ''}`,
    },
  });

  return rejectedUser;
}

/**
 * Suspends an approved user.
 */
export async function suspendUser(
  userId: string,
  suspenderId: string,
  suspenderRole: Role,
  suspenderSchoolId?: string | null,
  reason?: string
): Promise<User> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.status !== UserStatus.APPROVED) {
    throw new Error(`Cannot suspend user with status: ${user.status}`);
  }

  // Check permissions
  if (suspenderRole !== Role.SUPER_ADMIN) {
    if (user.schoolId !== suspenderSchoolId) {
      throw new Error('You can only suspend users in your school');
    }
  }

  const suspendedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      status: UserStatus.SUSPENDED,
      isActive: false,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      schoolId: user.schoolId,
      userId: suspenderId,
      action: 'SUSPEND_USER',
      entity: 'USER',
      entityId: userId,
      details: `Suspended user ${user.email}${reason ? `: ${reason}` : ''}`,
    },
  });

  return suspendedUser;
}

/**
 * Reactivates a suspended user.
 */
export async function reactivateUser(
  userId: string,
  activatorId: string,
  activatorRole: Role,
  activatorSchoolId?: string | null
): Promise<User> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.status !== UserStatus.SUSPENDED) {
    throw new Error(`Cannot reactivate user with status: ${user.status}`);
  }

  // Check permissions
  if (activatorRole !== Role.SUPER_ADMIN) {
    if (user.schoolId !== activatorSchoolId) {
      throw new Error('You can only reactivate users in your school');
    }
  }

  const reactivatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      status: UserStatus.APPROVED,
      isActive: true,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      schoolId: user.schoolId,
      userId: activatorId,
      action: 'REACTIVATE_USER',
      entity: 'USER',
      entityId: userId,
      details: `Reactivated user ${user.email}`,
    },
  });

  return reactivatedUser;
}

/**
 * Gets users pending approval for a school.
 * Superadmins see all pending users; school admins see only their school.
 */
export async function getPendingUsers(
  role: Role,
  schoolId?: string | null
): Promise<User[]> {
  const whereClause: {
    status: UserStatus;
    schoolId?: string | null;
  } = {
    status: UserStatus.PENDING,
  };

  if (role !== Role.SUPER_ADMIN) {
    whereClause.schoolId = schoolId;
  }

  return prisma.user.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Checks if a user is approved and can access the system.
 */
export function isUserApproved(user: User): boolean {
  return user.status === UserStatus.APPROVED && user.isActive;
}

/**
 * Middleware check for user approval status.
 * Throws error if user is not approved.
 */
export function requireApproved(user: User): void {
  if (!isUserApproved(user)) {
    if (user.status === UserStatus.PENDING) {
      throw new Error('Your account is pending approval. Please wait for an administrator to approve your access.');
    }
    if (user.status === UserStatus.REJECTED) {
      throw new Error('Your account registration has been rejected.');
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new Error('Your account has been suspended. Please contact an administrator.');
    }
    if (!user.isActive) {
      throw new Error('Your account is inactive.');
    }
  }
}
