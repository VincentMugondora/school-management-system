'use client';

import { useState, useEffect } from 'react';
import type { Role } from '@prisma/client';
import { listInvoices, getFinancialSummary, applyPayment, updateInvoiceStatus, generateInvoices } from '@/app/actions/finance.actions';
import { listEnrollmentsByClass } from '@/app/actions/student.actions';
import { listClasses } from '@/app/actions/teacher.actions';
import { listTerms } from '@/app/actions/academic.actions';
import { getCurrentUserProfile } from '@/app/actions/user.actions';

type InvoiceStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL' | 'CANCELLED';

interface Invoice {
  id: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
  dueDate: string | null;
  createdAt: string;
  student: {
    firstName: string;
    lastName: string;
    studentId: string | null;
  };
  term: {
    name: string;
  };
  _count?: {
    payments: number;
  };
}

export default function AccountantDashboard() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<{
    totalInvoiced: number;
    totalPaid: number;
    totalBalance: number;
    invoiceCount: number;
    paidCount: number;
    pendingCount: number;
    overdueCount: number;
    partialCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Generate invoice form state
  const [classes, setClasses] = useState<{ id: string; name: string; grade: string }[]>([]);
  const [terms, setTerms] = useState<{ id: string; name: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    checkPermissions();
    loadData();
    loadClassesAndTerms();
  }, []);

  async function checkPermissions() {
    const result = await getCurrentUserProfile();
    if (result.success) {
      setUser(result.data);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [invoicesResult, summaryResult] = await Promise.all([
        listInvoices(),
        getFinancialSummary(),
      ]);

      if (invoicesResult.success) {
        setInvoices(invoicesResult.data.invoices as unknown as Invoice[]);
      }
      if (summaryResult.success) {
        setSummary(summaryResult.data);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function loadClassesAndTerms() {
    const [classesResult, termsResult] = await Promise.all([
      listClasses(),
      listTerms(),
    ]);

    if (classesResult.success) {
      setClasses(classesResult.data.classes as unknown as { id: string; name: string; grade: string }[]);
    }
    if (termsResult.success) {
      setTerms(termsResult.data as unknown as { id: string; name: string }[]);
    }
  }

  async function handleApplyPayment() {
    if (!selectedInvoice || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedInvoice.balance) {
      setError('Invalid payment amount');
      return;
    }

    setLoading(true);
    const result = await applyPayment({
      invoiceId: selectedInvoice.id,
      amount,
      method: paymentMethod || undefined,
      reference: paymentReference || undefined,
    });

    if (result.success) {
      setSuccess('Payment applied successfully');
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentMethod('');
      setPaymentReference('');
      await loadData();
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleGenerateInvoices() {
    if (!selectedClass || !selectedTerm || !invoiceAmount) {
      setError('Please fill in all required fields');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      // Get enrollments for the class
      const enrollmentsResult = await listEnrollmentsByClass(selectedClass, 'ACTIVE');
      if (!enrollmentsResult.success) {
        setError('Failed to load enrollments');
        return;
      }

      const enrollmentIds = enrollmentsResult.data.map((e: any) => e.id);
      if (enrollmentIds.length === 0) {
        setError('No active enrollments found in this class');
        return;
      }

      const result = await generateInvoices({
        enrollmentIds,
        termId: selectedTerm,
        amount: parseFloat(invoiceAmount),
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });

      if (result.success) {
        setSuccess(`Generated ${result.data.invoices.length} invoices successfully`);
        if (result.data.errors.length > 0) {
          setError(`${result.data.errors.length} invoices failed to generate`);
        }
        setShowGenerateModal(false);
        setSelectedClass('');
        setSelectedTerm('');
        setInvoiceAmount('');
        setDueDate('');
        await loadData();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to generate invoices');
    } finally {
      setGenerating(false);
    }
  }

  function openPaymentModal(invoice: Invoice) {
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.balance.toString());
    setShowPaymentModal(true);
  }

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-700';
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'OVERDUE': return 'bg-red-100 text-red-700';
      case 'PARTIAL': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (!user || (user.role !== 'ACCOUNTANT' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          Access Denied. Only accountants and administrators can access this dashboard.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Finance Management</h1>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Generate Invoices
        </button>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

      {/* Financial Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded text-center">
            <div className="text-2xl font-bold">${summary.totalInvoiced.toFixed(2)}</div>
            <div className="text-xs text-gray-600">Total Invoiced</div>
          </div>
          <div className="bg-green-50 p-4 rounded text-center">
            <div className="text-2xl font-bold">${summary.totalPaid.toFixed(2)}</div>
            <div className="text-xs text-gray-600">Total Paid</div>
          </div>
          <div className="bg-orange-50 p-4 rounded text-center">
            <div className="text-2xl font-bold">${summary.totalBalance.toFixed(2)}</div>
            <div className="text-xs text-gray-600">Total Balance</div>
          </div>
          <div className="bg-gray-50 p-4 rounded text-center">
            <div className="text-2xl font-bold">{summary.invoiceCount}</div>
            <div className="text-xs text-gray-600">Invoices</div>
          </div>
          <div className="bg-green-100 p-4 rounded text-center">
            <div className="text-2xl font-bold">{summary.paidCount}</div>
            <div className="text-xs text-gray-600">Paid</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded text-center">
            <div className="text-2xl font-bold">{summary.pendingCount}</div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
          <div className="bg-red-100 p-4 rounded text-center">
            <div className="text-2xl font-bold">{summary.overdueCount}</div>
            <div className="text-xs text-gray-600">Overdue</div>
          </div>
          <div className="bg-blue-100 p-4 rounded text-center">
            <div className="text-2xl font-bold">{summary.partialCount}</div>
            <div className="text-xs text-gray-600">Partial</div>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-3 text-left">Student</th>
              <th className="border p-3 text-left">Term</th>
              <th className="border p-3 text-right">Amount</th>
              <th className="border p-3 text-right">Paid</th>
              <th className="border p-3 text-right">Balance</th>
              <th className="border p-3 text-center">Status</th>
              <th className="border p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="border p-3">
                  <div className="font-medium">
                    {invoice.student.firstName} {invoice.student.lastName}
                  </div>
                  {invoice.student.studentId && (
                    <div className="text-sm text-gray-500">ID: {invoice.student.studentId}</div>
                  )}
                </td>
                <td className="border p-3">{invoice.term.name}</td>
                <td className="border p-3 text-right">${invoice.amount.toFixed(2)}</td>
                <td className="border p-3 text-right">${invoice.paidAmount.toFixed(2)}</td>
                <td className="border p-3 text-right font-medium">${invoice.balance.toFixed(2)}</td>
                <td className="border p-3 text-center">
                  <span className={`px-2 py-1 rounded text-sm ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="border p-3 text-center">
                  {invoice.balance > 0 && (
                    <button
                      onClick={() => openPaymentModal(invoice)}
                      className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                    >
                      Pay
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Apply Payment</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Student: {selectedInvoice.student.firstName} {selectedInvoice.student.lastName}</p>
              <p className="text-sm text-gray-600">Balance: ${selectedInvoice.balance.toFixed(2)}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  className="w-full p-2 border rounded"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  max={selectedInvoice.balance}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select
                  className="w-full p-2 border rounded"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="">Select Method</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Mobile Money">Mobile Money</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reference Number</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyPayment}
                disabled={loading}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Apply Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Invoices Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Generate Invoices</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Class</label>
                <select
                  className="w-full p-2 border rounded"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} (Grade {cls.grade})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Term</label>
                <select
                  className="w-full p-2 border rounded"
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                >
                  <option value="">Select Term</option>
                  {terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  className="w-full p-2 border rounded"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date (Optional)</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateInvoices}
                disabled={generating}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate Invoices'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
