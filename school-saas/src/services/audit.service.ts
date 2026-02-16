import { prisma } from '@/lib/db';
import { ServiceContext } from '@/types/domain.types';

export type AuditAction =
  | 'STUDENT_CREATE'
  | 'STUDENT_UPDATE'
  | 'STUDENT_DELETE'
  | 'STUDENT_RESTORE'
  | 'STUDENT_SUSPEND'
  | 'STUDENT_REACTIVATE'
  | 'ENROLLMENT_CREATE'
  | 'ENROLLMENT_UPDATE'
  | 'ENROLLMENT_TRANSFER'
  | 'ENROLLMENT_COMPLETE'
  | 'ENROLLMENT_DROP'
  | 'RESULT_CREATE'
  | 'RESULT_UPDATE'
  | 'RESULT_OVERRIDE'
  | 'RESULT_DELETE';

export type AuditEntity =
  | 'STUDENT'
  | 'ENROLLMENT'
  | 'RESULT'
  | 'ATTENDANCE'
  | 'GUARDIAN'
  | 'FEE';

export interface AuditLogEntry {
  schoolId: string;
  actorUserId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: {
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

export const AuditService = {
  /**
   * Log an audit entry to the database.
   * Transparent to service consumers - errors are caught and logged but not thrown.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const details = JSON.stringify({
        before: entry.before,
        after: entry.after,
        metadata: entry.metadata,
      });

      await prisma.auditLog.create({
        data: {
          schoolId: entry.schoolId,
          userId: entry.actorUserId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          details,
          ipAddress: entry.metadata?.ipAddress,
        },
      });
    } catch (error) {
      // Log to console but don't throw - audit logging should not break business logic
      console.error('Failed to create audit log entry:', error);
      console.error('Audit entry:', entry);
    }
  },

  /**
   * Log an entity creation
   */
  async logCreate(
    context: ServiceContext,
    entity: AuditEntity,
    entityId: string,
    after: Record<string, unknown>,
    metadata?: AuditLogEntry['metadata']
  ): Promise<void> {
    if (!context.schoolId) {
      console.warn(`Skipping audit log for ${entity} create - no schoolId in context`);
      return;
    }
    await this.log({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: `${entity}_CREATE` as AuditAction,
      entity,
      entityId,
      after,
      metadata,
    });
  },

  /**
   * Log an entity update with before/after state
   */
  async logUpdate(
    context: ServiceContext,
    entity: AuditEntity,
    entityId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    metadata?: AuditLogEntry['metadata']
  ): Promise<void> {
    if (!context.schoolId) {
      console.warn(`Skipping audit log for ${entity} update - no schoolId in context`);
      return;
    }
    await this.log({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: `${entity}_UPDATE` as AuditAction,
      entity,
      entityId,
      before,
      after,
      metadata,
    });
  },

  /**
   * Log an entity deletion
   */
  async logDelete(
    context: ServiceContext,
    entity: AuditEntity,
    entityId: string,
    before: Record<string, unknown>,
    metadata?: AuditLogEntry['metadata']
  ): Promise<void> {
    if (!context.schoolId) {
      console.warn(`Skipping audit log for ${entity} delete - no schoolId in context`);
      return;
    }
    await this.log({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: `${entity}_DELETE` as AuditAction,
      entity,
      entityId,
      before,
      metadata,
    });
  },

  /**
   * Log a result override (special action with reason)
   */
  async logResultOverride(
    context: ServiceContext,
    resultId: string,
    studentId: string,
    before: { marks: number; grade?: string },
    after: { marks: number; grade?: string },
    reason: string
  ): Promise<void> {
    if (!context.schoolId) {
      console.warn('Skipping audit log for result override - no schoolId in context');
      return;
    }
    await this.log({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: 'RESULT_OVERRIDE',
      entity: 'RESULT',
      entityId: resultId,
      before: { ...before, studentId },
      after: { ...after, studentId },
      metadata: { reason },
    });
  },

  /**
   * Query audit logs for a specific entity
   */
  async getEntityHistory(
    entity: AuditEntity,
    entityId: string,
    context: ServiceContext,
    options?: { limit?: number; offset?: number }
  ) {
    const logs = await prisma.auditLog.findMany({
      where: {
        entity,
        entityId,
        schoolId: context.schoolId,
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return logs.map((log) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));
  },
};
