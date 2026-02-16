import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Plus, FileText, CreditCard } from 'lucide-react';

export default async function FinancePage() {
  const [invoices, payments, feeStructures] = await Promise.all([
    prisma.invoice.findMany({
      include: { student: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.payment.findMany({
      orderBy: { paymentDate: 'desc' },
      take: 10
    }),
    prisma.feeStructure.count()
  ]);

  const totalOutstanding = await prisma.invoice.aggregate({
    where: { status: { not: 'PAID' } },
    _sum: { amount: true, balance: true }
  });

  const totalRevenue = await prisma.payment.aggregate({
    _sum: { amount: true }
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Finance</h1>
          <p className="text-gray-500 mt-1">Manage fees, invoices, and payments</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/finance/fee-structures/new"
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Fee Structure
          </Link>
          <Link
            href="/admin/finance/invoices"
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <FileText className="w-5 h-5" />
            Invoices
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
          <h3 className="text-sm font-medium text-purple-700 mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-purple-900">
            ${totalRevenue._sum.amount?.toLocaleString() || '0'}
          </p>
        </div>
        <div className="bg-red-50 rounded-xl p-6 border border-red-100">
          <h3 className="text-sm font-medium text-red-700 mb-2">Outstanding</h3>
          <p className="text-3xl font-bold text-red-900">
            ${totalOutstanding._sum.balance?.toLocaleString() || '0'}
          </p>
        </div>
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
          <h3 className="text-sm font-medium text-blue-700 mb-2">Fee Structures</h3>
          <p className="text-3xl font-bold text-blue-900">{feeStructures}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-6 border border-green-100">
          <h3 className="text-sm font-medium text-green-700 mb-2">Recent Payments</h3>
          <p className="text-3xl font-bold text-green-900">{payments.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Recent Invoices</h2>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-gray-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-800">#{invoice.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">${invoice.amount}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      invoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                      invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Recent Payments</h2>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-gray-100">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-gray-800">${payment.amount}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {payment.paymentMethod}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(payment.paymentDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
