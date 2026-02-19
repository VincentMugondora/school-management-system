import { prisma } from '@/lib/db';
import { Role, UserStatus } from '@prisma/client';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { headers } from 'next/headers';

// Session expiry in hours
const IMPERSONATION_SESSION_HOURS = 4;

export interface ImpersonationContext {
  isImpersonating: boolean;
  originalUserId: string;
  targetUserId: string;
  targetRole: Role;
  targetSchoolId: string | null;
  sessionId: string;
}

export interface StartImpersonationResult {
  success: boolean;
  error?: string;
  context?: ImpersonationContext;
}

/**
 * Start an impersonation session
 * Rules enforced:
 * - Only SUPER_ADMIN can initiate
 * - Cannot impersonate another SUPER_ADMIN
 * - Target must be APPROVED
 * - Only one active session per admin
 */
export async function startImpersonation(
  targetUserId: string
): Promise<StartImpersonationResult> {
  const { userId: adminClerkId } = await auth();

  if (!adminClerkId) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get admin user
  const admin = await prisma.user.findUnique({
    where: { clerkId: adminClerkId },
    select: { id: true, role: true },
  });

  if (!admin || admin.role !== Role.SUPER_ADMIN) {
    return { success: false, error: 'Only SUPER_ADMIN can impersonate' };
  }

  // Check for existing active session
  const existingSession = await prisma.impersonationSession.findFirst({
    where: {
      adminId: admin.id,
      endedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingSession) {
    return { success: false, error: 'Already have an active impersonation session' };
  }

  // Get target user
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, schoolId: true, status: true },
  });

  if (!targetUser) {
    return { success: false, error: 'Target user not found' };
  }

  // Rule: Cannot impersonate SUPER_ADMIN
  if (targetUser.role === Role.SUPER_ADMIN) {
    return { success: false, error: 'Cannot impersonate another SUPER_ADMIN' };
  }

  // Rule: Target must be APPROVED
  if (targetUser.status !== UserStatus.APPROVED) {
    return { success: false, error: 'Can only impersonate APPROVED users' };
  }

  // Get request metadata for audit
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  // Create session
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + IMPERSONATION_SESSION_HOURS);

  const session = await prisma.impersonationSession.create({
    data: {
      adminId: admin.id,
      targetUserId: targetUser.id,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'IMPERSONATION_START',
      entity: 'User',
      entityId: targetUser.id,
      details: JSON.stringify({
        sessionId: session.id,
        targetRole: targetUser.role,
        targetSchoolId: targetUser.schoolId,
        userAgent,
      }),
      ipAddress,
    },
  });

  // Store impersonation context in Clerk privateMetadata (server-side only)
  // This automatically clears on logout and cannot be modified client-side
  await clerkClient.users.updateUser(adminClerkId, {
    privateMetadata: {
      impersonation: {
        sessionId: session.id,
        targetUserId: targetUser.id,
        targetRole: targetUser.role,
        targetSchoolId: targetUser.schoolId,
        schoolName: targetUser.school?.name || null,
        startedAt: new Date().toISOString(),
        isImpersonating: true,
      },
    },
  });

  return {
    success: true,
    context: {
      isImpersonating: true,
      originalUserId: admin.id,
      targetUserId: targetUser.id,
      targetRole: targetUser.role,
      targetSchoolId: targetUser.schoolId,
      sessionId: session.id,
    },
  };
}

/**
 * End an impersonation session
 */
export async function endImpersonation(sessionId: string): Promise<boolean> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return false;
  }

  const admin = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  if (!admin) {
    return false;
  }

  const session = await prisma.impersonationSession.findFirst({
    where: {
      id: sessionId,
      adminId: admin.id,
      endedAt: null,
    },
  });

  if (!session) {
    return false;
  }

  await prisma.impersonationSession.update({
    where: { id: sessionId },
    data: { endedAt: new Date() },
  });

  // Log audit event
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'IMPERSONATION_END',
      entity: 'User',
      entityId: session.targetUserId,
      details: JSON.stringify({ sessionId, userAgent }),
      ipAddress,
    },
  });

  // Clear impersonation context from Clerk privateMetadata
  await clerkClient.users.updateUser(clerkId, {
    privateMetadata: {
      impersonation: null,
    },
  });

  return true;
}

/**
 * Get active impersonation session for current user
 */
export async function getActiveImpersonationSession(
  adminId: string
): Promise<Awaited<ReturnType<typeof prisma.impersonationSession.findFirst>>> {
  return prisma.impersonationSession.findFirst({
    where: {
      adminId,
      endedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      targetUser: {
        select: { id: true, role: true, schoolId: true, firstName: true, lastName: true, email: true },
      },
    },
  });
}

/**
 * Check if user has active impersonation and return context
 * Reads from Clerk session claims first (fast), validates against database
 */
export async function getImpersonationContextFromSession() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return null;
  }

  // Check Clerk privateMetadata for impersonation context
  const impersonation = sessionClaims?.impersonation as {
    sessionId: string;
    targetUserId: string;
    targetRole: Role;
    targetSchoolId: string | null;
    schoolName: string | null;
    startedAt: string;
    isImpersonating: boolean;
  } | undefined;

  if (!impersonation || !impersonation.isImpersonating) {
    return null;
  }

  // Validate session still exists and is active in database
  const dbSession = await prisma.impersonationSession.findFirst({
    where: {
      id: impersonation.sessionId,
      endedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!dbSession) {
    // Session expired or ended - clear metadata
    await clerkClient.users.updateUser(userId, {
      privateMetadata: {
        impersonation: null,
      },
    });
    return null;
  }

  return {
    isImpersonating: true,
    originalUserId: userId,
    targetUserId: impersonation.targetUserId,
    targetRole: impersonation.targetRole,
    targetSchoolId: impersonation.targetSchoolId,
    schoolName: impersonation.schoolName,
    sessionId: impersonation.sessionId,
    startedAt: impersonation.startedAt,
  };
}

/**
 * Get impersonation history for audit
 */
export async function getImpersonationHistory(adminId?: string) {
  const where = adminId ? { adminId } : {};

  return prisma.impersonationSession.findMany({
    where,
    orderBy: { startedAt: 'desc' },
    include: {
      admin: {
        select: { firstName: true, lastName: true, email: true },
      },
      targetUser: {
        select: { firstName: true, lastName: true, email: true, role: true },
      },
    },
  });
}
