import { prisma } from '@/lib/db';
import { headers } from 'next/headers';
import { auth } from '@clerk/nextjs/server';

interface ImpersonationAction {
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

/**
 * Log impersonation session start
 */
export async function logImpersonationStart(
  sessionId: string,
  adminId: string,
  options: {
    impersonatedSchoolId?: string;
    impersonatedUserId?: string;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  const { impersonatedSchoolId, impersonatedUserId, ipAddress, userAgent } = options;

  return prisma.impersonationAuditLog.create({
    data: {
      sessionId,
      adminId,
      impersonatedSchoolId,
      impersonatedUserId,
      startedAt: new Date(),
      ipAddress,
      userAgent,
      actionsCount: 0,
    },
  });
}

/**
 * Log impersonation session end
 */
export async function logImpersonationEnd(
  sessionId: string,
  adminId: string,
  finalActionsCount?: number
) {
  const updateData: {
    endedAt: Date;
    actionsCount?: number;
  } = {
    endedAt: new Date(),
  };

  if (finalActionsCount !== undefined) {
    updateData.actionsCount = finalActionsCount;
  }

  return prisma.impersonationAuditLog.updateMany({
    where: {
      sessionId,
      adminId,
      endedAt: null,
    },
    data: updateData,
  });
}

/**
 * Increment action count for active impersonation session
 */
export async function incrementImpersonationActionCount(sessionId: string) {
  return prisma.impersonationAuditLog.updateMany({
    where: {
      sessionId,
      endedAt: null,
    },
    data: {
      actionsCount: {
        increment: 1,
      },
    },
  });
}

/**
 * Hook to log actions performed during impersonation
 * Call this in server actions/API routes that should track impersonated actions
 */
export async function logImpersonatedAction(
  action: ImpersonationAction,
  sessionId?: string
) {
  // Get current impersonation context
  const { sessionClaims } = await auth();
  const impersonation = sessionClaims?.impersonation as {
    sessionId: string;
    isImpersonating: boolean;
  } | undefined;

  // Only log if impersonating
  if (!impersonation?.isImpersonating) {
    return null;
  }

  const effectiveSessionId = sessionId || impersonation.sessionId;

  // Get request metadata
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  // Log the action to regular AuditLog with impersonation flag
  await prisma.auditLog.create({
    data: {
      userId: effectiveSessionId, // Use sessionId to link to impersonation
      action: `IMPERSONATED_${action.action}`,
      entity: action.entity,
      entityId: action.entityId || effectiveSessionId,
      details: JSON.stringify({
        ...action.details,
        impersonationSessionId: effectiveSessionId,
        performedDuringImpersonation: true,
      }),
      ipAddress,
    },
  });

  // Increment action count
  await incrementImpersonationActionCount(effectiveSessionId);

  return true;
}

/**
 * Get impersonation audit logs
 */
export async function getImpersonationAuditLogs(adminId?: string) {
  const where = adminId ? { adminId } : {};

  return prisma.impersonationAuditLog.findMany({
    where,
    orderBy: { startedAt: 'desc' },
    include: {
      admin: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Get statistics for impersonation sessions
 */
export async function getImpersonationStats(adminId?: string) {
  const where = adminId ? { adminId } : {};

  const [
    totalSessions,
    activeSessions,
    totalActions,
    avgActionsPerSession,
  ] = await Promise.all([
    prisma.impersonationAuditLog.count({ where }),
    prisma.impersonationAuditLog.count({
      where: { ...where, endedAt: null },
    }),
    prisma.impersonationAuditLog.aggregate({
      where,
      _sum: { actionsCount: true },
    }),
    prisma.impersonationAuditLog.aggregate({
      where,
      _avg: { actionsCount: true },
    }),
  ]);

  return {
    totalSessions,
    activeSessions,
    totalActions: totalActions._sum.actionsCount || 0,
    avgActionsPerSession: avgActionsPerSession._avg.actionsCount || 0,
  };
}
