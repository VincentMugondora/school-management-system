/**
 * SuperAdmin Context - Delegated School Access Model
 *
 * This module implements a secure delegated context system for SUPERADMIN users.
 *
 * Core Principles:
 * 1. SUPERADMIN has no schoolId - they exist outside the school hierarchy
 * 2. All school-specific operations require explicit school delegation
 * 3. Every cross-school access is audited for security monitoring
 * 4. Privilege escalation is prevented through strict role validation
 *
 * @module lib/auth/superadminContext
 */

import { prisma } from '@/lib/db';
import { Role, SchoolStatus } from '@prisma/client';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Base context interface for all users
 */
export interface BaseServiceContext {
  userId: string;
  clerkId: string;
  email: string;
  role: Role;
}

/**
 * Context for regular users with school association
 */
export interface SchoolServiceContext extends BaseServiceContext {
  role: Exclude<Role, 'SUPER_ADMIN'>;
  schoolId: string;
  delegated?: false;
}

/**
 * Context for SUPERADMIN without school
 */
export interface SuperAdminContext extends BaseServiceContext {
  role: 'SUPER_ADMIN';
  schoolId: null;
  delegated: false;
}

/**
 * Context for SUPERADMIN with delegated school access
 * This is created when SUPERADMIN explicitly accesses a school
 */
export interface DelegatedSchoolContext extends BaseServiceContext {
  role: 'SUPER_ADMIN';
  schoolId: string;
  delegated: true;
  delegationReason: string;
  delegatedAt: Date;
}

/**
 * Union type for all service contexts
 */
export type ServiceContext =
  | SchoolServiceContext
  | SuperAdminContext
  | DelegatedSchoolContext;

/**
 * Result of privilege validation
 */
export type PrivilegeValidationResult =
  | { allowed: true; context: ServiceContext }
  | {
      allowed: false;
      reason: string;
      code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'PRIVILEGE_ESCALATION' | 'SCHOOL_SUSPENDED' | 'DELEGATION_REQUIRED';
    };

// ============================================
// ERROR CLASSES
// ============================================

export class PrivilegeEscalationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrivilegeEscalationError';
  }
}

export class DelegationRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DelegationRequiredError';
  }
}

export class CrossSchoolAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrossSchoolAccessError';
  }
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Verify user is SUPERADMIN without school association
 * This is the primary identity check for SuperAdmin users
 */
export async function verifySuperAdminIdentity(
  clerkId: string
): Promise<{ id: string; email: string } | null> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      email: true,
      role: true,
      schoolId: true,
    },
  });

  // STRICT: Must be SUPER_ADMIN and have NO schoolId
  if (!user || user.role !== Role.SUPER_ADMIN || user.schoolId !== null) {
    return null;
  }

  return { id: user.id, email: user.email };
}

/**
 * Get base context for any authenticated user
 */
export async function getBaseContext(
  clerkId: string
): Promise<BaseServiceContext | null> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      clerkId: true,
      email: true,
      role: true,
      schoolId: true,
    },
  });

  if (!user) return null;

  return {
    userId: user.id,
    clerkId: user.clerkId,
    email: user.email,
    role: user.role,
  };
}

/**
 * Get service context for regular users (non-SUPERADMIN)
 */
export async function getSchoolUserContext(
  clerkId: string
): Promise<SchoolServiceContext | null> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      clerkId: true,
      email: true,
      role: true,
      schoolId: true,
    },
  });

  if (!user) return null;

  // STRICT: SUPERADMIN cannot use regular school context
  if (user.role === Role.SUPER_ADMIN) {
    throw new PrivilegeEscalationError(
      'SUPERADMIN must use delegated context, not school context'
    );
  }

  if (!user.schoolId) {
    return null; // User needs school assignment
  }

  return {
    userId: user.id,
    clerkId: user.clerkId,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId,
    delegated: false,
  };
}

/**
 * Get SuperAdmin context (no school association)
 */
export async function getSuperAdminContext(
  clerkId: string
): Promise<SuperAdminContext | null> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      clerkId: true,
      email: true,
      role: true,
      schoolId: true,
    },
  });

  if (!user || user.role !== Role.SUPER_ADMIN) {
    return null;
  }

  // STRICT: SuperAdmin MUST NOT have a schoolId
  if (user.schoolId !== null) {
    throw new PrivilegeEscalationError(
      'SUPERADMIN cannot have schoolId assigned. Contact system administrator.'
    );
  }

  return {
    userId: user.id,
    clerkId: user.clerkId,
    email: user.email,
    role: 'SUPER_ADMIN',
    schoolId: null,
    delegated: false,
  };
}

// ============================================
// DELEGATED CONTEXT FUNCTIONS
// ============================================

/**
 * Create a delegated context for SUPERADMIN to access a specific school
 * This creates an audit trail for the cross-school access
 */
export async function createDelegatedContext(
  clerkId: string,
  targetSchoolId: string,
  reason: string,
  ipAddress?: string
): Promise<DelegatedSchoolContext | null> {
  // Step 1: Verify SuperAdmin identity
  const superAdmin = await verifySuperAdminIdentity(clerkId);
  if (!superAdmin) {
    return null;
  }

  // Step 2: Verify target school exists and is not suspended
  const school = await prisma.school.findUnique({
    where: { id: targetSchoolId },
    select: { id: true, name: true, status: true },
  });

  if (!school) {
    throw new CrossSchoolAccessError('Target school does not exist');
  }

  if (school.status === SchoolStatus.SUSPENDED) {
    throw new CrossSchoolAccessError('Cannot access suspended school');
  }

  // Step 3: Log the cross-school access (audit trail)
  await logCrossSchoolAccess({
    userId: superAdmin.id,
    schoolId: targetSchoolId,
    schoolName: school.name,
    reason,
    ipAddress,
  });

  // Step 4: Return delegated context
  return {
    userId: superAdmin.id,
    clerkId,
    email: superAdmin.email,
    role: 'SUPER_ADMIN',
    schoolId: targetSchoolId,
    delegated: true,
    delegationReason: reason,
    delegatedAt: new Date(),
  };
}

/**
 * Verify a context has permission to access a specific school
 * For SUPERADMIN, this requires a delegated context
 */
export function verifySchoolAccess(
  context: ServiceContext,
  targetSchoolId: string
): PrivilegeValidationResult {
  // Regular users: must match their assigned school
  if (context.role !== 'SUPER_ADMIN') {
    if (context.schoolId !== targetSchoolId) {
      return {
        allowed: false,
        reason: 'User does not have access to this school',
        code: 'FORBIDDEN',
      };
    }
    return { allowed: true, context };
  }

  // SUPERADMIN without delegation cannot access specific schools
  if (!context.delegated) {
    return {
      allowed: false,
      reason: 'SUPERADMIN requires delegated context to access school data',
      code: 'DELEGATION_REQUIRED',
    };
  }

  // SUPERADMIN with delegation: verify delegation matches target
  if (context.schoolId !== targetSchoolId) {
    return {
      allowed: false,
      reason: 'Delegated context does not match target school',
      code: 'FORBIDDEN',
    };
  }

  // Valid delegated access
  return { allowed: true, context };
}

// ============================================
// AUDIT LOGGING
// ============================================

interface CrossSchoolAccessLogParams {
  userId: string;
  schoolId: string;
  schoolName: string;
  reason: string;
  ipAddress?: string;
}

/**
 * Log all cross-school access by SUPERADMIN
 * This is critical for security monitoring
 */
async function logCrossSchoolAccess(
  params: CrossSchoolAccessLogParams
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      schoolId: params.schoolId,
      userId: params.userId,
      action: 'CROSS_SCHOOL_ACCESS',
      entity: 'SYSTEM',
      entityId: params.schoolId,
      details: `SUPERADMIN accessed school "${params.schoolName}". Reason: ${params.reason}`,
      ipAddress: params.ipAddress,
    },
  });
}

/**
 * Log privilege escalation attempts
 */
export async function logPrivilegeEscalationAttempt(
  clerkId: string,
  attemptedAction: string,
  ipAddress?: string
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      schoolId: 'system',
      userId: clerkId,
      action: 'PRIVILEGE_ESCALATION_ATTEMPT',
      entity: 'SECURITY',
      entityId: clerkId,
      details: `User attempted unauthorized action: ${attemptedAction}`,
      ipAddress,
    },
  });
}

// ============================================
// PRIVILEGE ESCALATION PREVENTION
// ============================================

/**
 * Prevented actions for different roles
 */
const PRIVILEGE_RULES: Record<Role, { cannot: string[]; requires: string[] }> = {
  SUPER_ADMIN: {
    cannot: ['ASSIGN_SELF_SCHOOL', 'MODIFY_OWN_ROLE'],
    requires: ['DELEGATION_FOR_SCHOOL_ACCESS'],
  },
  ADMIN: {
    cannot: ['ACCESS_OTHER_SCHOOLS', 'MODIFY_SUPERADMIN', 'VIEW_AUDIT_LOGS'],
    requires: [],
  },
  TEACHER: {
    cannot: ['ACCESS_ADMIN_FUNCTIONS', 'MODIFY_SCHOOL_SETTINGS', 'ACCESS_OTHER_SCHOOLS'],
    requires: [],
  },
  STUDENT: {
    cannot: ['ACCESS_TEACHER_FUNCTIONS', 'MODIFY_GRADES', 'ACCESS_ADMIN_FUNCTIONS'],
    requires: [],
  },
  PARENT: {
    cannot: ['ACCESS_TEACHER_FUNCTIONS', 'MODIFY_ANY_DATA', 'ACCESS_ADMIN_FUNCTIONS'],
    requires: [],
  },
  ACCOUNTANT: {
    cannot: ['ACCESS_TEACHER_FUNCTIONS', 'MODIFY_STUDENT_DATA', 'ACCESS_OTHER_SCHOOLS'],
    requires: [],
  },
};

/**
 * Check if an action would constitute privilege escalation
 */
export function checkPrivilegeEscalation(
  context: ServiceContext,
  action: string,
  targetData?: { schoolId?: string; role?: Role }
): { allowed: boolean; reason?: string } {
  const rules = PRIVILEGE_RULES[context.role];

  // Check if action is explicitly forbidden
  if (rules.cannot.includes(action)) {
    return {
      allowed: false,
      reason: `Action '${action}' is not permitted for ${context.role}`,
    };
  }

  // SUPERADMIN specific checks
  if (context.role === 'SUPER_ADMIN') {
    // Prevent SUPERADMIN from assigning themselves a school
    if (action === 'ASSIGN_SCHOOL' && targetData?.schoolId) {
      return {
        allowed: false,
        reason: 'SUPERADMIN cannot be assigned to a school',
      };
    }

    // Prevent SUPERADMIN from changing their own role
    if (action === 'MODIFY_ROLE' && !context.delegated) {
      return {
        allowed: false,
        reason: 'SUPERADMIN cannot modify their own role',
      };
    }
  }

  // Check cross-school access for non-delegated contexts
  if (
    targetData?.schoolId &&
    context.role !== 'SUPER_ADMIN' &&
    context.schoolId !== targetData.schoolId
  ) {
    return {
      allowed: false,
      reason: 'Cannot access data from another school',
    };
  }

  return { allowed: true };
}

/**
 * Validate that a role change is legitimate
 */
export function validateRoleChange(
  currentRole: Role,
  newRole: Role,
  requestingUserRole: Role
): { valid: boolean; reason?: string } {
  // Only SUPERADMIN can create/modify SUPERADMIN
  if (newRole === 'SUPER_ADMIN' && requestingUserRole !== 'SUPER_ADMIN') {
    return {
      valid: false,
      reason: 'Only SUPERADMIN can assign SUPERADMIN role',
    };
  }

  // Cannot change own role (prevents lockout)
  if (currentRole === requestingUserRole) {
    return {
      valid: false,
      reason: 'Cannot modify your own role',
    };
  }

  // Role hierarchy enforcement
  const hierarchy: Record<Role, number> = {
    SUPER_ADMIN: 100,
    ADMIN: 50,
    ACCOUNTANT: 40,
    TEACHER: 30,
    PARENT: 20,
    STUDENT: 10,
  };

  if (hierarchy[newRole] > hierarchy[requestingUserRole]) {
    return {
      valid: false,
      reason: 'Cannot assign higher privilege role',
    };
  }

  return { valid: true };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Type guard for SuperAdminContext
 */
export function isSuperAdminContext(
  context: ServiceContext
): context is SuperAdminContext {
  return context.role === 'SUPER_ADMIN' && !context.delegated;
}

/**
 * Type guard for DelegatedSchoolContext
 */
export function isDelegatedContext(
  context: ServiceContext
): context is DelegatedSchoolContext {
  return context.role === 'SUPER_ADMIN' && context.delegated === true;
}

/**
 * Type guard for SchoolServiceContext
 */
export function isSchoolUserContext(
  context: ServiceContext
): context is SchoolServiceContext {
  return context.role !== 'SUPER_ADMIN';
}

/**
 * Extract school ID from any context
 * Returns null for non-delegated SUPERADMIN
 */
export function getSchoolIdFromContext(
  context: ServiceContext
): string | null {
  if (context.role === 'SUPER_ADMIN' && !context.delegated) {
    return null;
  }
  return context.schoolId;
}

/**
 * Ensure context has a school ID (for school-scoped operations)
 * Throws error for non-delegated SUPERADMIN
 */
export function requireSchoolId(context: ServiceContext): string {
  const schoolId = getSchoolIdFromContext(context);
  if (!schoolId) {
    throw new DelegationRequiredError(
      'This operation requires a school context. Use createDelegatedContext() for SUPERADMIN.'
    );
  }
  return schoolId;
}
