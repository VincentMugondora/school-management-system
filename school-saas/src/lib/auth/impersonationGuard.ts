import { auth } from '@clerk/nextjs/server';
import { Role } from '@prisma/client';

export enum GuardedAction {
  DELETE_SCHOOL = 'DELETE_SCHOOL',
  UPDATE_BILLING = 'UPDATE_BILLING',
  ESCALATE_ROLE = 'ESCALATE_ROLE',
  DELETE_USER = 'DELETE_USER',
  SUSPEND_SUPERADMIN = 'SUSPEND_SUPERADMIN',
  MODIFY_IMPERSONATION_SETTINGS = 'MODIFY_IMPERSONATION_SETTINGS',
}

export interface GuardResult {
  allowed: boolean;
  reason?: string;
  code: 'ALLOWED' | 'IMPERSONATION_BLOCKED' | 'UNAUTHORIZED';
}

/**
 * Check if current session is in impersonation mode
 */
export async function isImpersonating(): Promise<boolean> {
  const { sessionClaims } = await auth();
  const impersonation = sessionClaims?.impersonation as {
    isImpersonating: boolean;
  } | undefined;
  return impersonation?.isImpersonating ?? false;
}

/**
 * Core guard: Blocks destructive actions during impersonation
 */
export async function guardDestructiveAction(
  action: GuardedAction
): Promise<GuardResult> {
  const impersonating = await isImpersonating();

  if (!impersonating) {
    return { allowed: true, code: 'ALLOWED' };
  }

  // Define which actions are blocked during impersonation
  const blockedActions: GuardedAction[] = [
    GuardedAction.DELETE_SCHOOL,
    GuardedAction.UPDATE_BILLING,
    GuardedAction.ESCALATE_ROLE,
    GuardedAction.DELETE_USER,
    GuardedAction.SUSPEND_SUPERADMIN,
    GuardedAction.MODIFY_IMPERSONATION_SETTINGS,
  ];

  if (blockedActions.includes(action)) {
    return {
      allowed: false,
      reason: `${action} is not allowed during impersonation mode. Exit impersonation to perform this action.`,
      code: 'IMPERSONATION_BLOCKED',
    };
  }

  return { allowed: true, code: 'ALLOWED' };
}

/**
 * Specific guard: Prevent school deletion during impersonation
 */
export async function guardSchoolDelete(schoolId: string): Promise<GuardResult> {
  const result = await guardDestructiveAction(GuardedAction.DELETE_SCHOOL);

  if (!result.allowed) {
    return result;
  }

  // Additional checks can be added here (e.g., school size, active users)
  return { allowed: true, code: 'ALLOWED' };
}

/**
 * Specific guard: Prevent billing changes during impersonation
 */
export async function guardBillingUpdate(): Promise<GuardResult> {
  return guardDestructiveAction(GuardedAction.UPDATE_BILLING);
}

/**
 * Specific guard: Prevent role escalation during impersonation
 */
export async function guardRoleEscalation(
  currentRole: Role,
  targetRole: Role
): Promise<GuardResult> {
  const result = await guardDestructiveAction(GuardedAction.ESCALATE_ROLE);

  if (!result.allowed) {
    return result;
  }

  // Block promotion to SUPER_ADMIN during impersonation
  if (targetRole === Role.SUPER_ADMIN && currentRole !== Role.SUPER_ADMIN) {
    return {
      allowed: false,
      reason: 'Role escalation to SUPER_ADMIN is not allowed during impersonation',
      code: 'IMPERSONATION_BLOCKED',
    };
  }

  return { allowed: true, code: 'ALLOWED' };
}

/**
 * Specific guard: Prevent user deletion during impersonation
 */
export async function guardUserDelete(userId: string): Promise<GuardResult> {
  const result = await guardDestructiveAction(GuardedAction.DELETE_USER);

  if (!result.allowed) {
    return result;
  }

  // Prevent self-deletion even when not impersonating
  const { userId: currentUserId } = await auth();
  if (currentUserId === userId) {
    return {
      allowed: false,
      reason: 'Cannot delete your own account',
      code: 'UNAUTHORIZED',
    };
  }

  return { allowed: true, code: 'ALLOWED' };
}

/**
 * Specific guard: Prevent SUPER_ADMIN suspension during impersonation
 */
export async function guardSuperAdminSuspension(
  targetUserRole: Role
): Promise<GuardResult> {
  const result = await guardDestructiveAction(GuardedAction.SUSPEND_SUPERADMIN);

  if (!result.allowed) {
    return result;
  }

  if (targetUserRole === Role.SUPER_ADMIN) {
    return {
      allowed: false,
      reason: 'SUPER_ADMIN accounts cannot be suspended during impersonation',
      code: 'IMPERSONATION_BLOCKED',
    };
  }

  return { allowed: true, code: 'ALLOWED' };
}

/**
 * Middleware-style wrapper for server actions
 */
export function withImpersonationGuard<T extends (...args: unknown[]) => Promise<unknown>>(
  action: GuardedAction,
  fn: T
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const guard = await guardDestructiveAction(action);

    if (!guard.allowed) {
      throw new Error(guard.reason);
    }

    return fn(...args) as ReturnType<T>;
  }) as T;
}

/**
 * Assert helper for inline guards
 */
export async function assertNotImpersonating(action: GuardedAction): Promise<void> {
  const result = await guardDestructiveAction(action);

  if (!result.allowed) {
    throw new Error(result.reason);
  }
}
