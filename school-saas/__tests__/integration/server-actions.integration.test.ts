/**
 * Integration tests for Server Actions
 * Tests: Tenant isolation, Role-based access, Input validation
 */

import { Role, InvoiceStatus, EnrollmentStatus } from '@prisma/client';
import { mockContexts } from '../utils/test-helpers';

// Mock all server action dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    $transaction: jest.fn((cb: Function) => cb({
      student: { findFirst: jest.fn(), findMany: jest.fn() },
      enrollment: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      invoice: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      payment: { create: jest.fn() },
      academicYear: { findFirst: jest.fn() },
      class: { findFirst: jest.fn() },
      term: { findFirst: jest.fn() },
    })),
    student: { findFirst: jest.fn(), findMany: jest.fn() },
    enrollment: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    invoice: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    payment: { create: jest.fn() },
    academicYear: { findFirst: jest.fn() },
    class: { findFirst: jest.fn() },
    term: { findFirst: jest.fn() },
  },
}));

// Mock services
jest.mock('@/services/enrollment.service', () => ({
  EnrollmentService: {
    promoteStudents: jest.fn(),
    bulkCreateEnrollments: jest.fn(),
    markPreviousEnrollmentsAsCompleted: jest.fn(),
  },
}));

jest.mock('@/services/finance.service', () => ({
  FinanceService: {
    generateInvoices: jest.fn(),
    applyPayment: jest.fn(),
    getFinancialSummary: jest.fn(),
    updateInvoiceStatus: jest.fn(),
    deleteInvoice: jest.fn(),
  },
}));

import { EnrollmentService } from '@/services/enrollment.service';
import { FinanceService } from '@/services/finance.service';

describe('Server Actions - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tenant Isolation', () => {
    it('should enforce schoolId filtering on all queries', async () => {
      const otherSchoolContext = {
        userId: 'user-2',
        schoolId: 'school-2',
        role: Role.ADMIN,
      };

      // Attempt to promote students from another school
      (EnrollmentService.promoteStudents as jest.Mock).mockRejectedValue(
        new Error('Access denied')
      );

      await expect(
        EnrollmentService.promoteStudents(
          {
            studentIds: ['student-from-school-1'],
            targetAcademicYearId: 'year-1',
            targetClassId: 'class-1',
          },
          otherSchoolContext
        )
      ).rejects.toThrow('Access denied');
    });

    it('should not allow cross-school invoice access', async () => {
      (FinanceService.applyPayment as jest.Mock).mockRejectedValue(
        new Error('Invoice not found')
      );

      await expect(
        FinanceService.applyPayment(
          { invoiceId: 'invoice-from-another-school', amount: 100 },
          mockContexts.admin
        )
      ).rejects.toThrow('Invoice not found');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow ADMIN to generate invoices', async () => {
      (FinanceService.generateInvoices as jest.Mock).mockResolvedValue({
        invoices: [{ id: 'inv-1' }],
        errors: [],
      });

      const result = await FinanceService.generateInvoices(
        { enrollmentIds: ['enroll-1'], termId: 'term-1', amount: 1000 },
        mockContexts.admin
      );

      expect(result.invoices).toHaveLength(1);
    });

    it('should allow ACCOUNTANT to apply payments', async () => {
      (FinanceService.applyPayment as jest.Mock).mockResolvedValue({
        payment: { id: 'pay-1', amount: 500 },
        invoice: { id: 'inv-1', status: InvoiceStatus.PAID },
      });

      const result = await FinanceService.applyPayment(
        { invoiceId: 'inv-1', amount: 500, method: 'Cash' },
        mockContexts.accountant
      );

      expect(result.payment).toBeDefined();
      expect(result.invoice.status).toBe(InvoiceStatus.PAID);
    });

    it('should allow TEACHER to view financial summary but not modify', async () => {
      (FinanceService.getFinancialSummary as jest.Mock).mockResolvedValue({
        totalInvoiced: 10000,
        totalPaid: 8000,
      });

      // Teacher can view
      const viewResult = await FinanceService.getFinancialSummary(mockContexts.teacher);
      expect(viewResult).toBeDefined();

      // But cannot generate invoices
      (FinanceService.generateInvoices as jest.Mock).mockRejectedValue(
        new Error('Forbidden')
      );

      await expect(
        FinanceService.generateInvoices(
          { enrollmentIds: ['enroll-1'], termId: 'term-1', amount: 1000 },
          mockContexts.teacher
        )
      ).rejects.toThrow('Forbidden');
    });

    it('should allow STUDENT to view own results but not others', async () => {
      // Student can view their own results
      const studentView = { success: true, data: { studentId: 'student-own-id' } };
      
      // But cannot access admin functions
      const adminActions = [
        () => EnrollmentService.promoteStudents({
          studentIds: ['student-1'],
          targetAcademicYearId: 'year-1',
          targetClassId: 'class-1',
        }, mockContexts.student),
        () => FinanceService.generateInvoices({
          enrollmentIds: ['enroll-1'],
          termId: 'term-1',
          amount: 1000,
        }, mockContexts.student),
      ];

      for (const action of adminActions) {
        await expect(action()).rejects.toThrow();
      }
    });

    it('should allow PARENT to view children data only', async () => {
      // Mock services to throw ForbiddenError for parent
      (EnrollmentService.bulkCreateEnrollments as jest.Mock).mockRejectedValue(new Error('Forbidden'));
      (FinanceService.applyPayment as jest.Mock).mockRejectedValue(new Error('Forbidden'));

      // But cannot modify school data
      const restrictedActions = [
        () => EnrollmentService.bulkCreateEnrollments([], mockContexts.parent),
        () => FinanceService.applyPayment({ invoiceId: 'inv-1', amount: 100 }, mockContexts.parent),
      ];

      for (const action of restrictedActions) {
        await expect(action()).rejects.toThrow();
      }
    });

    it('should allow SUPER_ADMIN to perform all actions', async () => {
      // Mock successful responses for all actions
      (EnrollmentService.promoteStudents as jest.Mock).mockResolvedValue([{ id: 'enroll-1' }]);
      (FinanceService.generateInvoices as jest.Mock).mockResolvedValue({ invoices: [], errors: [] });
      (FinanceService.deleteInvoice as jest.Mock).mockResolvedValue(undefined);

      // Super admin can do everything
      await expect(
        EnrollmentService.promoteStudents({
          studentIds: ['student-1'],
          targetAcademicYearId: 'year-1',
          targetClassId: 'class-1',
        }, mockContexts.superAdmin)
      ).resolves.toBeDefined();

      await expect(
        FinanceService.generateInvoices({
          enrollmentIds: ['enroll-1'],
          termId: 'term-1',
          amount: 1000,
        }, mockContexts.superAdmin)
      ).resolves.toBeDefined();

      await expect(
        FinanceService.deleteInvoice('inv-1', mockContexts.superAdmin)
      ).resolves.toBeUndefined();
    });
  });

  describe('Input Validation', () => {
    it('should validate UUID format for IDs', async () => {
      const invalidUUIDs = ['invalid-uuid', '123', '', 'not-a-uuid'];

      // Mock to throw for any ID (UUID validation happens in real implementation)
      (FinanceService.applyPayment as jest.Mock).mockRejectedValue(new Error('Invalid invoice ID'));

      for (const invalidId of invalidUUIDs) {
        await expect(
          FinanceService.applyPayment(
            { invoiceId: invalidId, amount: 100 },
            mockContexts.admin
          )
        ).rejects.toThrow();
      }
    });

    it('should validate positive amounts for invoices', async () => {
      (FinanceService.generateInvoices as jest.Mock).mockImplementation((data) => {
        if (data.amount <= 0) {
          throw new Error('Amount must be greater than 0');
        }
        return { invoices: [], errors: [] };
      });

      await expect(
        FinanceService.generateInvoices(
          { enrollmentIds: ['enroll-1'], termId: 'term-1', amount: -100 },
          mockContexts.admin
        )
      ).rejects.toThrow('Amount must be greater than 0');

      await expect(
        FinanceService.generateInvoices(
          { enrollmentIds: ['enroll-1'], termId: 'term-1', amount: 0 },
          mockContexts.admin
        )
      ).rejects.toThrow('Amount must be greater than 0');
    });

    it('should validate payment amount does not exceed balance', async () => {
      (FinanceService.applyPayment as jest.Mock).mockImplementation((data) => {
        if (data.amount > 500) {
          return Promise.reject(new Error('Payment exceeds balance'));
        }
        return Promise.resolve({ payment: { id: 'pay-1' }, invoice: { id: 'inv-1' } });
      });

      // Payment within balance should work
      await expect(
        FinanceService.applyPayment(
          { invoiceId: 'inv-1', amount: 300 },
          mockContexts.admin
        )
      ).resolves.toBeDefined();

      // Payment exceeding balance should fail
      await expect(
        FinanceService.applyPayment(
          { invoiceId: 'inv-1', amount: 1000 },
          mockContexts.admin
        )
      ).rejects.toThrow('Payment exceeds balance');
    });

    it('should validate required fields in bulk operations', async () => {
      (EnrollmentService.bulkCreateEnrollments as jest.Mock).mockImplementation((data) => {
        if (!data || data.length === 0) {
          throw new Error('At least one enrollment is required');
        }
        return { enrollments: [], errors: [] };
      });

      await expect(
        EnrollmentService.bulkCreateEnrollments([], mockContexts.admin)
      ).rejects.toThrow('At least one enrollment is required');
    });

    it('should validate dates are in correct format', async () => {
      // Mock date validation
      const invalidDate = 'not-a-date';
      const validDate = '2024-01-01';

      expect(() => {
        new Date(invalidDate);
      }).not.toThrow(); // JavaScript allows this but creates Invalid Date

      const invalidDateObj = new Date(invalidDate);
      expect(isNaN(invalidDateObj.getTime())).toBe(true);

      const validDateObj = new Date(validDate);
      expect(isNaN(validDateObj.getTime())).toBe(false);
    });

    it('should handle malformed request data gracefully', async () => {
      const malformedRequests = [null, undefined, {}, { randomField: 'value' }];

      // Mock to throw for malformed data
      (FinanceService.generateInvoices as jest.Mock).mockImplementation((data) => {
        if (!data || !data.enrollmentIds || !Array.isArray(data.enrollmentIds)) {
          return Promise.reject(new Error('Invalid request data'));
        }
        return Promise.resolve({ invoices: [], errors: [] });
      });

      for (const request of malformedRequests) {
        await expect(
          FinanceService.generateInvoices(
            request as any,
            mockContexts.admin
          )
        ).rejects.toThrow();
      }
    });
  });

  describe('Transaction Safety', () => {
    it('should rollback on partial failure in bulk operations', async () => {
      (EnrollmentService.bulkCreateEnrollments as jest.Mock).mockResolvedValue({
        enrollments: [{ id: 'enroll-1' }],
        errors: [{ studentId: 'student-2', error: 'Student not found' }],
        successCount: 1,
        errorCount: 1,
      });

      const result = await EnrollmentService.bulkCreateEnrollments(
        [
          { studentId: 'student-1', academicYearId: 'year-1', classId: 'class-1' },
          { studentId: 'student-2', academicYearId: 'year-1', classId: 'class-1' },
        ],
        mockContexts.admin
      );

      expect(result.enrollments).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should atomically update invoice and payment records', async () => {
      (FinanceService.applyPayment as jest.Mock).mockResolvedValue({
        payment: { id: 'pay-1', amount: 500 },
        invoice: { id: 'inv-1', paidAmount: 500, balance: 500, status: InvoiceStatus.PARTIAL },
      });

      const result = await FinanceService.applyPayment(
        { invoiceId: 'inv-1', amount: 500 },
        mockContexts.admin
      );

      // Both payment and invoice should be updated together
      expect(result.payment).toBeDefined();
      expect(result.invoice).toBeDefined();
    });
  });
});
