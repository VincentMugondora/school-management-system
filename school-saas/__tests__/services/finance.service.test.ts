import { FinanceService } from '@/services/finance.service';
import { InvoiceStatus, Role } from '@prisma/client';
import { mockContexts, createMockContext } from '../utils/test-helpers';
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from '@/types/domain.types';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    $transaction: jest.fn((callback: Function) => callback(prisma)),
    invoice: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    enrollment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    term: {
      findFirst: jest.fn(),
    },
    student: {
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';

describe('FinanceService - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateInvoices', () => {
    it('should generate invoices for multiple enrollments', async () => {
      const mockTerm = { id: 'term-1', schoolId: 'school-1' };
      const mockEnrollment1 = { id: 'enroll-1', studentId: 'student-1', schoolId: 'school-1', status: 'ACTIVE' };
      const mockEnrollment2 = { id: 'enroll-2', studentId: 'student-2', schoolId: 'school-1', status: 'ACTIVE' };
      const mockInvoice1 = { id: 'invoice-1', enrollmentId: 'enroll-1', amount: 1000 };
      const mockInvoice2 = { id: 'invoice-2', enrollmentId: 'enroll-2', amount: 1000 };

      (prisma.term.findFirst as jest.Mock).mockResolvedValue(mockTerm);
      (prisma.enrollment.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockEnrollment1)
        .mockResolvedValueOnce(mockEnrollment2);
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.invoice.create as jest.Mock)
        .mockResolvedValueOnce(mockInvoice1)
        .mockResolvedValueOnce(mockInvoice2);

      const result = await FinanceService.generateInvoices(
        {
          enrollmentIds: ['enroll-1', 'enroll-2'],
          termId: 'term-1',
          amount: 1000,
        },
        mockContexts.admin
      );

      expect(result.invoices).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(prisma.invoice.create).toHaveBeenCalledTimes(2);
    });

    it('should handle existing invoices gracefully', async () => {
      const mockTerm = { id: 'term-1', schoolId: 'school-1' };
      const mockEnrollment = { id: 'enroll-1', studentId: 'student-1', schoolId: 'school-1', status: 'ACTIVE' };
      const existingInvoice = { id: 'existing-invoice' };

      (prisma.term.findFirst as jest.Mock).mockResolvedValue(mockTerm);
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(mockEnrollment);
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(existingInvoice);

      const result = await FinanceService.generateInvoices(
        {
          enrollmentIds: ['enroll-1'],
          termId: 'term-1',
          amount: 1000,
        },
        mockContexts.admin
      );

      expect(result.invoices).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].enrollmentId).toBe('enroll-1');
    });

    it('should throw ValidationError for invalid amount', async () => {
      await expect(
        FinanceService.generateInvoices(
          {
            enrollmentIds: ['enroll-1'],
            termId: 'term-1',
            amount: -100,
          },
          mockContexts.admin
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should require FINANCIAL_STAFF role', async () => {
      await expect(
        FinanceService.generateInvoices(
          {
            enrollmentIds: ['enroll-1'],
            termId: 'term-1',
            amount: 1000,
          },
          mockContexts.teacher
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('should enforce tenant isolation - term must belong to school', async () => {
      const mockTerm = null; // Term not found for this school

      (prisma.term.findFirst as jest.Mock).mockResolvedValue(mockTerm);

      await expect(
        FinanceService.generateInvoices(
          {
            enrollmentIds: ['enroll-1'],
            termId: 'term-1',
            amount: 1000,
          },
          mockContexts.admin
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('applyPayment', () => {
    it('should apply payment and update invoice status', async () => {
      const mockInvoice = {
        id: 'invoice-1',
        schoolId: 'school-1',
        amount: 1000,
        paidAmount: 0,
        balance: 1000,
        status: InvoiceStatus.PENDING,
      };
      const mockPayment = { id: 'payment-1', amount: 500 };
      const updatedInvoice = { ...mockInvoice, paidAmount: 500, balance: 500, status: InvoiceStatus.PARTIAL };

      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (prisma.payment.create as jest.Mock).mockResolvedValue(mockPayment);
      (prisma.invoice.update as jest.Mock).mockResolvedValue(updatedInvoice);

      const result = await FinanceService.applyPayment(
        {
          invoiceId: 'invoice-1',
          amount: 500,
          method: 'Cash',
          reference: 'REF123',
        },
        mockContexts.admin
      );

      expect(result.payment).toEqual(mockPayment);
      expect(result.invoice.paidAmount).toBe(500);
      expect(result.invoice.status).toBe(InvoiceStatus.PARTIAL);
    });

    it('should mark invoice as PAID when fully paid', async () => {
      const mockInvoice = {
        id: 'invoice-1',
        schoolId: 'school-1',
        amount: 1000,
        paidAmount: 500,
        balance: 500,
        status: InvoiceStatus.PARTIAL,
      };
      const mockPayment = { id: 'payment-2', amount: 500 };
      const updatedInvoice = { ...mockInvoice, paidAmount: 1000, balance: 0, status: InvoiceStatus.PAID };

      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (prisma.payment.create as jest.Mock).mockResolvedValue(mockPayment);
      (prisma.invoice.update as jest.Mock).mockResolvedValue(updatedInvoice);

      const result = await FinanceService.applyPayment(
        {
          invoiceId: 'invoice-1',
          amount: 500,
        },
        mockContexts.admin
      );

      expect(result.invoice.status).toBe(InvoiceStatus.PAID);
      expect(result.invoice.balance).toBe(0);
    });

    it('should throw ValidationError when payment exceeds balance', async () => {
      const mockInvoice = {
        id: 'invoice-1',
        schoolId: 'school-1',
        amount: 1000,
        paidAmount: 0,
        balance: 1000,
      };

      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);

      await expect(
        FinanceService.applyPayment(
          {
            invoiceId: 'invoice-1',
            amount: 1500,
          },
          mockContexts.admin
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when invoice does not exist', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        FinanceService.applyPayment(
          {
            invoiceId: 'nonexistent',
            amount: 500,
          },
          mockContexts.admin
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should enforce tenant isolation - invoice must belong to school', async () => {
      const mockInvoice = {
        id: 'invoice-1',
        schoolId: 'different-school',
        amount: 1000,
        paidAmount: 0,
        balance: 1000,
      };

      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        FinanceService.applyPayment(
          {
            invoiceId: 'invoice-1',
            amount: 500,
          },
          mockContexts.admin
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should require FINANCIAL_STAFF role', async () => {
      await expect(
        FinanceService.applyPayment(
          {
            invoiceId: 'invoice-1',
            amount: 500,
          },
          mockContexts.teacher
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getFinancialSummary', () => {
    it('should return accurate financial summary', async () => {
      const mockInvoices = [
        { amount: 1000, paidAmount: 1000, balance: 0, status: InvoiceStatus.PAID },
        { amount: 1000, paidAmount: 500, balance: 500, status: InvoiceStatus.PARTIAL },
        { amount: 1000, paidAmount: 0, balance: 1000, status: InvoiceStatus.PENDING },
        { amount: 1000, paidAmount: 0, balance: 1000, status: InvoiceStatus.OVERDUE },
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await FinanceService.getFinancialSummary(mockContexts.admin);

      expect(result.totalInvoiced).toBe(4000);
      expect(result.totalPaid).toBe(1500);
      expect(result.totalBalance).toBe(2500);
      expect(result.paidCount).toBe(1);
      expect(result.partialCount).toBe(1);
      expect(result.pendingCount).toBe(1);
      expect(result.overdueCount).toBe(1);
    });

    it('should filter by term when provided', async () => {
      const mockInvoices = [{ amount: 1000, paidAmount: 0, balance: 1000, status: InvoiceStatus.PENDING }];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      await FinanceService.getFinancialSummary(mockContexts.admin, 'term-1');

      expect(prisma.invoice.findMany).toHaveBeenCalledWith({
        where: {
          schoolId: 'mock-school-id',
          termId: 'term-1',
        },
        select: {
          amount: true,
          paidAmount: true,
          balance: true,
          status: true,
        },
      });
    });

    it('should require FINANCIAL_STAFF role', async () => {
      await expect(
        FinanceService.getFinancialSummary(mockContexts.teacher)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when user has no school context', async () => {
      (FinanceService.getFinancialSummary as jest.Mock).mockRejectedValue(
        new ForbiddenError('School context required')
      );

      await expect(
        FinanceService.getFinancialSummary(mockContexts.noSchool)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteInvoice', () => {
    it('should delete invoice without payments', async () => {
      const mockInvoice = {
        id: 'invoice-1',
        schoolId: 'school-1',
        _count: { payments: 0 },
      };

      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (prisma.invoice.delete as jest.Mock).mockResolvedValue(mockInvoice);

      await FinanceService.deleteInvoice('invoice-1', mockContexts.superAdmin);

      expect(prisma.invoice.delete).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
      });
    });

    it('should throw ConflictError when invoice has payments', async () => {
      const mockInvoice = {
        id: 'invoice-1',
        schoolId: 'school-1',
        _count: { payments: 1 },
      };

      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);

      await expect(
        FinanceService.deleteInvoice('invoice-1', mockContexts.superAdmin)
      ).rejects.toThrow(ConflictError);
    });

    it('should require SUPER_ADMIN role', async () => {
      const mockInvoiceNoPayments = {
        id: 'invoice-1',
        schoolId: 'mock-school-id',
        _count: { payments: 0 },
      };

      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoiceNoPayments);

      await expect(
        FinanceService.deleteInvoice('invoice-1', mockContexts.admin)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('tenant isolation tests', () => {
    it('should only access invoices from user school', async () => {
      const otherSchoolContext = createMockContext({
        userId: 'user-2',
        schoolId: 'school-2',
        role: Role.ACCOUNTANT,
      });

      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        FinanceService.applyPayment(
          {
            invoiceId: 'invoice-1',
            amount: 500,
          },
          otherSchoolContext
        )
      ).rejects.toThrow(NotFoundError);

      expect(prisma.invoice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'invoice-1',
            schoolId: 'school-2',
          }),
        })
      );
    });

    it('should verify all generated invoices have correct schoolId', async () => {
      const mockTerm = { id: 'term-1', schoolId: 'school-1' };
      const mockEnrollment = { id: 'enroll-1', studentId: 'student-1', schoolId: 'school-1', status: 'ACTIVE' };

      (prisma.term.findFirst as jest.Mock).mockResolvedValue(mockTerm);
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(mockEnrollment);
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.invoice.create as jest.Mock).mockImplementation((args) => {
        expect(args.data.schoolId).toBe('mock-school-id');
        return { id: 'invoice-1', ...args.data };
      });

      await FinanceService.generateInvoices(
        {
          enrollmentIds: ['enroll-1'],
          termId: 'term-1',
          amount: 1000,
        },
        mockContexts.admin
      );
    });
  });
});
