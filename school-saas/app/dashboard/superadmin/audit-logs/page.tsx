import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { Role } from '@prisma/client';
import {
  ClipboardList,
  Filter,
  ChevronLeft,
  ChevronRight,
  Building2,
  User,
  Calendar,
  Clock,
  Search,
  RotateCcw,
} from 'lucide-react';

/**
 * SuperAdmin Audit Logs Page
 *
 * Displays system-wide audit logs with filtering and pagination.
 * Only accessible to SUPERADMIN users.
 *
 * @page app/dashboard/superadmin/audit-logs/page.tsx
 */

const ITEMS_PER_PAGE = 20;

interface AuditLogsPageProps {
  searchParams: Promise<{
    page?: string;
    schoolId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-purple-100 text-purple-700',
  LOGOUT: 'bg-gray-100 text-gray-700',
  SUSPEND: 'bg-orange-100 text-orange-700',
  ACTIVATE: 'bg-emerald-100 text-emerald-700',
};

async function getAuditLogsData(params: {
  page: number;
  schoolId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}) {
  const where: any = {};

  if (params.schoolId) {
    where.schoolId = params.schoolId;
  }

  if (params.action) {
    where.action = params.action;
  }

  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) {
      where.createdAt.gte = new Date(params.startDate);
    }
    if (params.endDate) {
      where.createdAt.lte = new Date(params.endDate);
    }
  }

  const skip = (params.page - 1) * ITEMS_PER_PAGE;

  const [logs, totalCount, schools, actions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: ITEMS_PER_PAGE,
      orderBy: { createdAt: 'desc' },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
    prisma.school.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.auditLog.groupBy({
      by: ['action'],
      _count: true,
      orderBy: { action: 'asc' },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return {
    logs,
    totalCount,
    totalPages,
    schools,
    uniqueActions: actions.map((a) => a.action),
  };
}

async function verifySuperAdmin(clerkId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true },
  });
  return user?.role === Role.SUPER_ADMIN;
}

export default async function AuditLogsPage({
  searchParams,
}: AuditLogsPageProps) {
  // Verify SUPERADMIN access
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect('/sign-in');
  }

  const isSuperAdmin = await verifySuperAdmin(clerkId);

  if (!isSuperAdmin) {
    redirect('/dashboard/admin');
  }

  // Parse query params
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const schoolId = params.schoolId;
  const action = params.action;
  const startDate = params.startDate;
  const endDate = params.endDate;

  // Fetch audit logs
  const { logs, totalCount, totalPages, schools, uniqueActions } = await getAuditLogsData({
    page: currentPage,
    schoolId,
    action,
    startDate,
    endDate,
  });

  const formatDate = (date: Date) =>
    new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const buildQueryString = (updates: Record<string, string | undefined>) => {
    const current = new URLSearchParams();
    if (currentPage > 1) current.set('page', String(currentPage));
    if (schoolId) current.set('schoolId', schoolId);
    if (action) current.set('action', action);
    if (startDate) current.set('startDate', startDate);
    if (endDate) current.set('endDate', endDate);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    });

    // Reset to page 1 when filters change
    if (Object.keys(updates).some((k) => k !== 'page')) {
      current.delete('page');
    }

    const query = current.toString();
    return query ? `?${query}` : '';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 mt-1">
            System-wide activity tracking and monitoring
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <ClipboardList className="w-4 h-4" />
          {totalCount.toLocaleString()} total logs
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Filters</h2>
        </div>

        <form className="grid grid-cols-4 gap-4">
          {/* School Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              School
            </label>
            <select
              name="schoolId"
              defaultValue={schoolId || ''}
              className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors"
            >
              <option value="">All Schools</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              name="action"
              defaultValue={action || ''}
              className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors"
            >
              <option value="">All Actions</option>
              {uniqueActions.map((actionType) => (
                <option key={actionType} value={actionType}>
                  {actionType}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                From Date
              </span>
            </label>
            <input
              type="date"
              name="startDate"
              defaultValue={startDate || ''}
              className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                To Date
              </span>
            </label>
            <input
              type="date"
              name="endDate"
              defaultValue={endDate || ''}
              className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors"
            />
          </div>

          {/* Filter Actions */}
          <div className="col-span-4 flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <Search className="w-4 h-4" />
              Apply Filters
            </button>
            <Link
              href="/dashboard/superadmin/audit-logs"
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Link>
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Timestamp
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Action
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Entity
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  User
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  School
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <ClipboardList className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No audit logs found</p>
                    <p className="text-sm mt-1">
                      Try adjusting your filter criteria
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {formatDate(log.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          ACTION_COLORS[log.action] ||
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">
                          {log.entity}
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          ID: {log.entityId.slice(0, 8)}...
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div className="text-sm">
                          <p className="text-gray-900">
                            {log.user?.firstName && log.user?.lastName
                              ? `${log.user.firstName} ${log.user.lastName}`
                              : log.user?.email || 'Unknown'}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {log.user?.role}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.school ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <Link
                            href={`/dashboard/superadmin/schools/${log.schoolId}`}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            {log.school.name}
                          </Link>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">System</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 max-w-xs truncate">
                        {log.details || '-'}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing{' '}
              <span className="font-medium">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>{' '}
              -{' '}
              <span className="font-medium">
                {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}
              </span>{' '}
              of <span className="font-medium">{totalCount.toLocaleString()}</span> logs
            </p>
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/dashboard/superadmin/audit-logs${buildQueryString({
                    page: String(currentPage - 1),
                  })}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Link>
              )}
              <span className="text-sm text-gray-500 px-3">
                Page {currentPage} of {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={`/dashboard/superadmin/audit-logs${buildQueryString({
                    page: String(currentPage + 1),
                  })}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
