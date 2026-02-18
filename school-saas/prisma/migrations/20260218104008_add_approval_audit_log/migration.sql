-- CreateTable
CREATE TABLE "ApprovalAuditLog" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "schoolId" TEXT,
    "targetRole" TEXT,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApprovalAuditLog_targetUserId_idx" ON "ApprovalAuditLog"("targetUserId");

-- CreateIndex
CREATE INDEX "ApprovalAuditLog_approvedBy_idx" ON "ApprovalAuditLog"("approvedBy");

-- CreateIndex
CREATE INDEX "ApprovalAuditLog_schoolId_idx" ON "ApprovalAuditLog"("schoolId");

-- CreateIndex
CREATE INDEX "ApprovalAuditLog_createdAt_idx" ON "ApprovalAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ApprovalAuditLog_action_idx" ON "ApprovalAuditLog"("action");

-- CreateIndex
CREATE INDEX "User_status_schoolId_idx" ON "User"("status", "schoolId");

-- AddForeignKey
ALTER TABLE "ApprovalAuditLog" ADD CONSTRAINT "ApprovalAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAuditLog" ADD CONSTRAINT "ApprovalAuditLog_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAuditLog" ADD CONSTRAINT "ApprovalAuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
