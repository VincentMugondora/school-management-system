import { prisma } from '@/lib/db';
import { Invoice, Payment, InvoiceStatus, Prisma } from '@prisma/client';
import {
  ServiceContext,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '@/types/domain.types';
import { requireRole, RoleGroups } from '@/lib/auth';

// ============================================
// FINANCE SERVICE
// ============================================

export const FinanceService = {
  /**
   * Generate invoices for a class/term
   * @param data - Invoice generation data
   * @param context - Service context with user info
   * @returns Created invoices
   */
  async generateInvoices(
    data: {
      enrollmentIds: string[];
      termId: string;
      amount: number;
      dueDate?: Date;
    },
    context: ServiceContext
  ): Promise<{ invoices: Invoice[]; errors: { enrollmentId: string; error: string }[] }> {
    requireRole(context, RoleGroups.FINANCIAL_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    if (data.amount <= 0) {
      throw new ValidationError('Amount must be greater than 0');
    }

    // Verify term belongs to school
    const term = await prisma.term.findFirst({
      where: {
        id: data.termId,
        schoolId: context.schoolId,
      },
    });

    if (!term) {
      throw new NotFoundError('Term', data.termId);
    }

    const results: Invoice[] = [];
    const errors: { enrollmentId: string; error: string }[] = [];

    // Process in transaction
    await prisma.$transaction(async (tx) => {
      for (const enrollmentId of data.enrollmentIds) {
        try {
          // Verify enrollment belongs to school
          const enrollment = await tx.enrollment.findFirst({
            where: {
              id: enrollmentId,
              schoolId: context.schoolId,
              status: 'ACTIVE',
            },
            include: { student: true },
          });

          if (!enrollment) {
            errors.push({ enrollmentId, error: 'Enrollment not found or not active' });
            continue;
          }

          // Check if invoice already exists for this enrollment and term
          const existingInvoice = await tx.invoice.findFirst({
            where: {
              enrollmentId,
              termId: data.termId,
              schoolId: context.schoolId,
            },
          });

          if (existingInvoice) {
            errors.push({ enrollmentId, error: 'Invoice already exists for this term' });
            continue;
          }

          // Create invoice
          const invoice = await tx.invoice.create({
            data: {
              studentId: enrollment.studentId,
              enrollmentId,
              termId: data.termId,
              schoolId: context.schoolId,
              amount: data.amount,
              paidAmount: 0,
              balance: data.amount,
              status: InvoiceStatus.PENDING,
              dueDate: data.dueDate,
            },
          });

          results.push(invoice);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ enrollmentId, error: errorMessage });
        }
      }
    });

    return { invoices: results, errors };
  },

  /**
   * Apply payment to an invoice
   * @param data - Payment data
   * @param context - Service context with user info
   * @returns Created payment and updated invoice
   */
  async applyPayment(
    data: {
      invoiceId: string;
      amount: number;
      method?: string;
      reference?: string;
      notes?: string;
      paymentDate?: Date;
    },
    context: ServiceContext
  ): Promise<{ payment: Payment; invoice: Invoice }> {
    requireRole(context, RoleGroups.FINANCIAL_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    if (data.amount <= 0) {
      throw new ValidationError('Payment amount must be greater than 0');
    }

    // Verify invoice belongs to school
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: data.invoiceId,
        schoolId: context.schoolId,
      },
    });

    if (!invoice) {
      throw new NotFoundError('Invoice', data.invoiceId);
    }

    // Check if payment exceeds balance
    if (data.amount > invoice.balance) {
      throw new ValidationError(
        `Payment amount (${data.amount}) exceeds invoice balance (${invoice.balance})`
      );
    }

    // Use transaction to ensure atomic update
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          invoiceId: data.invoiceId,
          schoolId: context.schoolId,
          amount: data.amount,
          paymentDate: data.paymentDate || new Date(),
          method: data.method,
          reference: data.reference,
          notes: data.notes,
        },
      });

      // Calculate new values
      const newPaidAmount = invoice.paidAmount + data.amount;
      const newBalance = invoice.amount - newPaidAmount;

      // Determine new status
      let newStatus: InvoiceStatus;
      if (newBalance <= 0) {
        newStatus = InvoiceStatus.PAID;
      } else if (newPaidAmount > 0) {
        newStatus = InvoiceStatus.PARTIAL;
      } else {
        newStatus = InvoiceStatus.PENDING;
      }

      // Check for overdue
      if (invoice.dueDate && new Date() > invoice.dueDate && newStatus !== InvoiceStatus.PAID) {
        newStatus = InvoiceStatus.OVERDUE;
      }

      // Update invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id: data.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
        },
      });

      return { payment, invoice: updatedInvoice };
    });

    return result;
  },

  /**
   * Get invoice by ID with details
   * @param id - Invoice ID
   * @param context - Service context with user info
   * @returns Invoice with details
   */
  async getInvoiceById(
    id: string,
    context: ServiceContext
  ): Promise<
    | (Invoice & {
        student: { id: string; firstName: string; lastName: string; studentId: string | null };
        term: { id: string; name: string; academicYear: { name: string } };
        enrollment: { class: { name: string; grade: string } };
        payments: Payment[];
      })
    | null
  > {
    requireRole(context, RoleGroups.FINANCIAL_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true,
          },
        },
        term: {
          include: {
            academicYear: {
              select: { name: true },
            },
          },
        },
        enrollment: {
          include: {
            class: {
              select: { name: true, grade: true },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    return invoice;
  },

  /**
   * List invoices with filtering
   * @param context - Service context with user info
   * @param filters - Optional filters
   * @returns List of invoices
   */
  async listInvoices(
    context: ServiceContext,
    filters?: {
      studentId?: string;
      termId?: string;
      status?: InvoiceStatus;
      page?: number;
      limit?: number;
    }
  ): Promise<{ invoices: Invoice[]; total: number }> {
    requireRole(context, RoleGroups.FINANCIAL_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const where: Prisma.InvoiceWhereInput = {
      schoolId: context.schoolId,
    };

    if (filters?.studentId) {
      where.studentId = filters.studentId;
    }

    if (filters?.termId) {
      where.termId = filters.termId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              studentId: true,
            },
          },
          term: {
            select: { name: true },
          },
          _count: {
            select: { payments: true },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return { invoices, total };
  },

  /**
   * Update invoice status
   * @param id - Invoice ID
   * @param status - New status
   * @param context - Service context with user info
   * @returns Updated invoice
   */
  async updateInvoiceStatus(
    id: string,
    status: InvoiceStatus,
    context: ServiceContext
  ): Promise<Invoice> {
    requireRole(context, RoleGroups.FINANCIAL_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
    });

    if (!existingInvoice) {
      throw new NotFoundError('Invoice', id);
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: { status },
    });

    return updatedInvoice;
  },

  /**
   * Get financial summary for a school
   * @param context - Service context with user info
   * @param termId - Optional term filter
   * @returns Financial summary
   */
  async getFinancialSummary(
    context: ServiceContext,
    termId?: string
  ): Promise<{
    totalInvoiced: number;
    totalPaid: number;
    totalBalance: number;
    invoiceCount: number;
    paidCount: number;
    pendingCount: number;
    overdueCount: number;
    partialCount: number;
  }> {
    requireRole(context, RoleGroups.FINANCIAL_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    const where: Prisma.InvoiceWhereInput = {
      schoolId: context.schoolId,
    };

    if (termId) {
      where.termId = termId;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      select: {
        amount: true,
        paidAmount: true,
        balance: true,
        status: true,
      },
    });

    const summary = {
      totalInvoiced: 0,
      totalPaid: 0,
      totalBalance: 0,
      invoiceCount: invoices.length,
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      partialCount: 0,
    };

    invoices.forEach((invoice) => {
      summary.totalInvoiced += invoice.amount;
      summary.totalPaid += invoice.paidAmount;
      summary.totalBalance += invoice.balance;

      switch (invoice.status) {
        case InvoiceStatus.PAID:
          summary.paidCount++;
          break;
        case InvoiceStatus.PENDING:
          summary.pendingCount++;
          break;
        case InvoiceStatus.OVERDUE:
          summary.overdueCount++;
          break;
        case InvoiceStatus.PARTIAL:
          summary.partialCount++;
          break;
      }
    });

    return {
      totalInvoiced: parseFloat(summary.totalInvoiced.toFixed(2)),
      totalPaid: parseFloat(summary.totalPaid.toFixed(2)),
      totalBalance: parseFloat(summary.totalBalance.toFixed(2)),
      invoiceCount: summary.invoiceCount,
      paidCount: summary.paidCount,
      pendingCount: summary.pendingCount,
      overdueCount: summary.overdueCount,
      partialCount: summary.partialCount,
    };
  },

  /**
   * Get student's financial summary
   * @param studentId - Student ID
   * @param context - Service context with user info
   * @returns Student financial summary
   */
  async getStudentFinancialSummary(
    studentId: string,
    context: ServiceContext
  ): Promise<{
    totalInvoiced: number;
    totalPaid: number;
    totalBalance: number;
    invoices: Invoice[];
  }> {
    requireRole(context, RoleGroups.FINANCIAL_STAFF);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Verify student belongs to school
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: context.schoolId,
      },
    });

    if (!student) {
      throw new NotFoundError('Student', studentId);
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        studentId,
        schoolId: context.schoolId,
      },
      include: {
        term: {
          select: { name: true },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      totalInvoiced: 0,
      totalPaid: 0,
      totalBalance: 0,
      invoices,
    };

    invoices.forEach((invoice) => {
      summary.totalInvoiced += invoice.amount;
      summary.totalPaid += invoice.paidAmount;
      summary.totalBalance += invoice.balance;
    });

    return {
      totalInvoiced: parseFloat(summary.totalInvoiced.toFixed(2)),
      totalPaid: parseFloat(summary.totalPaid.toFixed(2)),
      totalBalance: parseFloat(summary.totalBalance.toFixed(2)),
      invoices,
    };
  },

  /**
   * Delete invoice
   * @param id - Invoice ID
   * @param context - Service context with user info
   */
  async deleteInvoice(id: string, context: ServiceContext): Promise<void> {
    requireRole(context, RoleGroups.SCHOOL_ADMINS);

    if (!context.schoolId) {
      throw new ForbiddenError('User must be associated with a school');
    }

    // Check if invoice exists and belongs to school
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        schoolId: context.schoolId,
      },
      include: {
        _count: {
          select: { payments: true },
        },
      },
    });

    if (!existingInvoice) {
      throw new NotFoundError('Invoice', id);
    }

    // Check if invoice has payments
    if (existingInvoice._count.payments > 0) {
      throw new ConflictError(
        'Cannot delete invoice with associated payments. Void the invoice instead.'
      );
    }

    await prisma.invoice.delete({
      where: { id },
    });
  },
};

export default FinanceService;
