'use server';

import { FinanceService } from '@/services/finance.service';
import {
  generateInvoicesSchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceIdSchema,
  applyPaymentSchema,
  paymentIdSchema,
} from '@/lib/validators';
import { Invoice, Payment, InvoiceStatus, Role } from '@prisma/client';
import { ServiceContext, ServiceError } from '@/types/domain.types';
import { revalidatePath } from 'next/cache';

// ============================================
// MOCK AUTHENTICATION - Replace with Clerk when ready
// ============================================

async function getCurrentUser(): Promise<ServiceContext | null> {
  return {
    userId: 'mock-user-id',
    schoolId: 'mock-school-id',
    role: Role.ACCOUNTANT,
  };
}

// ============================================
// ERROR HANDLER
// ============================================

function handleServiceError(error: unknown): { success: false; error: string } {
  if (error instanceof ServiceError) {
    return { success: false, error: error.message };
  }
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  return { success: false, error: 'An unexpected error occurred' };
}

// ============================================
// INVOICE SERVER ACTIONS
// ============================================

export async function generateInvoices(
  input: { enrollmentIds: string[]; termId: string; amount: number; dueDate?: Date }
): Promise<{ success: true; data: { invoices: Invoice[]; errors: { enrollmentId: string; error: string }[] } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const validation = generateInvoicesSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map((i: { message: string }) => i.message).join(', ') };
    }

    const result = await FinanceService.generateInvoices(validation.data, context);
    revalidatePath('/invoices');
    return { success: true, data: result };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function getInvoiceById(
  id: string
): Promise<{ success: true; data: Invoice & { student: any; term: any; enrollment: any; payments: Payment[] } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = invoiceIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid invoice ID' };

    const invoice = await FinanceService.getInvoiceById(idValidation.data, context);
    if (!invoice) return { success: false, error: 'Invoice not found' };

    return { success: true, data: invoice };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function listInvoices(
  filters?: { studentId?: string; termId?: string; status?: InvoiceStatus; page?: number; limit?: number }
): Promise<{ success: true; data: { invoices: Invoice[]; total: number } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const result = await FinanceService.listInvoices(context, filters);
    return { success: true, data: result };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus
): Promise<{ success: true; data: Invoice } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = invoiceIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid invoice ID' };

    const invoice = await FinanceService.updateInvoiceStatus(idValidation.data, status, context);
    revalidatePath('/invoices');
    return { success: true, data: invoice };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function deleteInvoice(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const idValidation = invoiceIdSchema.safeParse(id);
    if (!idValidation.success) return { success: false, error: 'Invalid invoice ID' };

    await FinanceService.deleteInvoice(idValidation.data, context);
    revalidatePath('/invoices');
    return { success: true };
  } catch (error) {
    return handleServiceError(error);
  }
}

// ============================================
// PAYMENT SERVER ACTIONS
// ============================================

export async function applyPayment(
  input: { invoiceId: string; amount: number; method?: string; reference?: string; notes?: string; paymentDate?: Date }
): Promise<{ success: true; data: { payment: Payment; invoice: Invoice } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const validation = applyPaymentSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues.map((i: { message: string }) => i.message).join(', ') };
    }

    const result = await FinanceService.applyPayment(validation.data, context);
    revalidatePath('/invoices');
    revalidatePath('/payments');
    return { success: true, data: result };
  } catch (error) {
    return handleServiceError(error);
  }
}

// ============================================
// FINANCIAL REPORTS
// ============================================

export async function getFinancialSummary(
  termId?: string
): Promise<{ success: true; data: { totalInvoiced: number; totalPaid: number; totalBalance: number; invoiceCount: number; paidCount: number; pendingCount: number; overdueCount: number; partialCount: number } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const summary = await FinanceService.getFinancialSummary(context, termId);
    return { success: true, data: summary };
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function getStudentFinancialSummary(
  studentId: string
): Promise<{ success: true; data: { totalInvoiced: number; totalPaid: number; totalBalance: number; invoices: Invoice[] } } | { success: false; error: string }> {
  try {
    const context = await getCurrentUser();
    if (!context) return { success: false, error: 'Unauthorized' };

    const summary = await FinanceService.getStudentFinancialSummary(studentId, context);
    return { success: true, data: summary };
  } catch (error) {
    return handleServiceError(error);
  }
}
