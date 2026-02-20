import { DollarSign, CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  method: string | null;
  paymentDate: Date;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
  dueDate: Date | null;
  term: { name: string; academicYear: { name: string } };
  payments: Payment[];
}

interface FeesTabProps {
  invoices: Invoice[];
}

export function FeesTab({ invoices }: FeesTabProps) {
  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
        <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700">No Fee Records</h3>
        <p className="text-gray-500 mt-1">This student has no fee invoices recorded.</p>
      </div>
    );
  }

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices.reduce(
    (sum, inv) => sum + inv.payments.reduce((pSum, p) => pSum + p.amount, 0),
    0
  );
  const totalBalance = totalInvoiced - totalPaid;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'OVERDUE':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <DollarSign className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Invoiced</p>
              <p className="text-xl font-bold text-gray-800">${totalInvoiced.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-xl font-bold text-gray-800">${totalPaid.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Balance Due</p>
              <p className="text-xl font-bold text-gray-800">${totalBalance.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Fee Invoices</h3>
          <p className="text-sm text-gray-500 mt-1">All fee invoices and payments</p>
        </div>
        <div className="divide-y divide-gray-100">
          {invoices.map((invoice) => {
            const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
            const balance = invoice.amount - paidAmount;

            return (
              <div key={invoice.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(invoice.status)}
                    <div>
                      <h4 className="font-medium text-gray-800">
                        {invoice.term.academicYear.name} - {invoice.term.name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-800">${invoice.amount.toFixed(2)}</p>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(
                        invoice.status
                      )}`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                </div>

                {/* Payment Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-500">Payment Progress</span>
                    <span className="font-medium text-gray-700">
                      ${paidAmount.toFixed(2)} of ${invoice.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${Math.min((paidAmount / invoice.amount) * 100, 100)}%` }}
                    />
                  </div>
                  {balance > 0 && (
                    <p className="text-sm text-red-600 mt-1">Balance: ${balance.toFixed(2)}</p>
                  )}
                </div>

                {/* Payments */}
                {invoice.payments.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Payment History
                    </h5>
                    <div className="space-y-2">
                      {invoice.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              ${payment.amount.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(payment.paymentDate).toLocaleDateString()} •{' '}
                              {payment.method}
                            </p>
                          </div>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
