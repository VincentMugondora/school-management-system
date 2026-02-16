import { prisma } from '@/lib/db';
import Link from 'next/link';
import { ClipboardList, Eye } from 'lucide-react';

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Audit Logs</h1>
          <p className="text-gray-500 mt-1">Track system changes and user actions</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Action</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">User</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Entity</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Timestamp</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ClipboardList className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-800">{log.action}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xs text-gray-600">
                        {log.user?.firstName?.[0]}{log.user?.lastName?.[0]}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {log.user?.firstName} {log.user?.lastName}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {log.entityType}
                  {log.entityId && <span className="text-gray-400 ml-1">({log.entityId.slice(-6)})</span>}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <Link 
                    href={`/admin/audit/logs/${log.id}`}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4 text-gray-400" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {logs.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">No Audit Logs</h3>
            <p className="text-gray-500 mt-1">System activity will be logged here</p>
          </div>
        )}
      </div>
    </div>
  );
}
