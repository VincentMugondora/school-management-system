import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';

/**
 * Approval Action Types
 */
export type ApprovalAction = 'APPROVE' | 'REJECT';

/**
 * Approval Audit Log Entry Data
 */
export interface ApprovalAuditLogData {
  targetUserId: string;
  action: ApprovalAction;
  approvedBy: string;
  schoolId?: string | null;
  targetRole?: Role;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an approval action to the ApprovalAuditLog
 *
 * Used for:
 * - SuperAdmin audit reports
 * - Compliance review
 * - Tracking who approved/rejected users
 *
 * @example
 * ```typescript
 * await logApprovalAction({
 *   targetUserId: 'user-123',
 *   action: 'APPROVE',
 *   approvedBy: 'admin-456',
 *   schoolId: 'school-789',
 *   targetRole: 'TEACHER',
 *   ipAddress: req.ip,
 * });
 * ```
 */
export async function logApprovalAction(data: ApprovalAuditLogData): Promise<void> {
  try {
    await prisma.approvalAuditLog.create({
      data: {
        targetUserId: data.targetUserId,
        action: data.action,
        approvedBy: data.approvedBy,
        schoolId: data.schoolId || null,
        targetRole: data.targetRole || null,
        reason: data.reason || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main operation
    console.error('[ApprovalAuditLog] Failed to log approval action:', error);
    console.error('[ApprovalAuditLog] Data:', data);
  }
}

/**
 * Log a user approval
 *
 * Convenience wrapper for logApprovalAction
 */
export async function logUserApproval(
  targetUserId: string,
  approvedBy: string,
  options: {
    schoolId?: string | null;
    targetRole?: Role;
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<void> {
  return logApprovalAction({
    targetUserId,
    action: 'APPROVE',
    approvedBy,
    schoolId: options.schoolId,
    targetRole: options.targetRole,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  });
}

/**
 * Log a user rejection
 *
 * Convenience wrapper for logApprovalAction with reason
 */
export async function logUserRejection(
  targetUserId: string,
  approvedBy: string,
  reason: string,
  options: {
    schoolId?: string | null;
    targetRole?: Role;
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<void> {
  return logApprovalAction({
    targetUserId,
    action: 'REJECT',
    approvedBy,
    schoolId: options.schoolId,
    targetRole: options.targetRole,
    reason,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  });
}

/**
 * Query approval audit logs
 *
 * Used for SuperAdmin audit reports and compliance review
 */
export async function queryApprovalAuditLogs(options: {
  targetUserId?: string;
  approvedBy?: string;
  schoolId?: string;
  action?: ApprovalAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};

  if (options.targetUserId) {
    where.targetUserId = options.targetUserId;
  }
  if (options.approvedBy) {
    where.approvedBy = options.approvedBy;
  }
  if (options.schoolId) {
    where.schoolId = options.schoolId;
  }
  if (options.action) {
    where.action = options.action;
  }
  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      (where.createdAt as Record<string, Date>).gte = options.startDate;
    }
    if (options.endDate) {
      (where.createdAt as Record<string, Date>).lte = options.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.approvalAuditLog.findMany({
      where,
      include: {
        targetUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        approver: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options.limit || 50,
      skip: options.offset || 0,
    }),
    prisma.approvalAuditLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Get approval statistics for a school or admin
 *
 * Used for dashboard analytics
 */
export async function getApprovalStats(options: {
  schoolId?: string;
  approvedBy?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const where: Record<string, unknown> = {};

  if (options.schoolId) {
    where.schoolId = options.schoolId;
  }
  if (options.approvedBy) {
    where.approvedBy = options.approvedBy;
  }
  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      (where.createdAt as Record<string, Date>).gte = options.startDate;
    }
    if (options.endDate) {
      (where.createdAt as Record<string, Date>).lte = options.endDate;
    }
  }

  const [approveCount, rejectCount, totalCount] = await Promise.all([
    prisma.approvalAuditLog.count({
      where: { ...where, action: 'APPROVE' },
    }),
    prisma.approvalAuditLog.count({
      where: { ...where, action: 'REJECT' },
    }),
    prisma.approvalAuditLog.count({ where }),
  ]);

  return {
    approveCount,
    rejectCount,
    totalCount,
    approvalRate: totalCount > 0 ? (approveCount / totalCount) * 100 : 0,
  };
}
