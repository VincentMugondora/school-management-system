import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Role, UserStatus } from '@prisma/client';
import {
  approveUser,
  rejectUser,
} from '@/src/lib/auth/userApproval';
import {
  Users,
  UserCheck,
  XCircle,
  CheckCircle,
  Clock,
  Building2,
  Mail,
  Calendar,
  Filter,
  Search,
  Shield,
} from 'lucide-react';
import { revalidatePath } from 'next/cache';

/**
 * SuperAdmin Approvals Dashboard
 *
 * Allows SuperAdmin to manage pending user access requests across all schools.
 *
 * @page app/dashboard/superadmin/approvals/page.tsx
 */

interface ApprovalsPageProps {
  searchParams: Promise<{ schoolId?: string; search?: string; role?: string }>;
}

async function getPendingUsers(schoolId?: string, search?: string, role?: string) {
  const where: {
    status: UserStatus;
    schoolId?: string;
    role?: Role;
    OR?: Array<{
      firstName?: { contains: string; mode: 'insensitive' };
      lastName?: { contains: string; mode: 'insensitive' };
      email?: { contains: string; mode: 'insensitive' };
    }>;
  } = {
    status: UserStatus.PENDING,
  };

  if (schoolId) {
    where.schoolId = schoolId;
  }

  if (role && role !== 'ALL') {
    where.role = role as Role;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      school: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return users;
}

async function getAllSchools() {
  return prisma.school.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });
}

export default async function SuperAdminApprovalsPage({
  searchParams,
}: ApprovalsPageProps) {
  // Step 1: Verify authentication
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect('/sign-in');
  }

  // Step 2: Verify SuperAdmin
  const superAdmin = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      role: true,
      email: true,
    },
  });

  if (!superAdmin || superAdmin.role !== Role.SUPER_ADMIN) {
    redirect('/dashboard');
  }

  // Step 3: Parse search params
  const { schoolId, search, role } = await searchParams;

  // Step 4: Fetch pending users across all schools
  const pendingUsers = await getPendingUsers(schoolId, search, role);
  const schools = await getAllSchools();

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  // Calculate stats
  const totalPending = pendingUsers.length;
  const adminRequests = pendingUsers.filter((u) => u.role === Role.ADMIN).length;
  const teacherRequests = pendingUsers.filter((u) => u.role === Role.TEACHER).length;
  const studentRequests = pendingUsers.filter((u) => u.role === Role.STUDENT).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              SuperAdmin Approvals
            </h1>
          </div>
          <p className="text-gray-500">
            Manage pending access requests across all schools
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg">
          <Clock className="w-5 h-5" />
          <span className="font-medium">{totalPending} Pending</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalPending}</p>
              <p className="text-sm text-gray-500">Total Pending</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{adminRequests}</p>
              <p className="text-sm text-gray-500">Admin Requests</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {teacherRequests}
              </p>
              <p className="text-sm text-gray-500">Teacher Requests</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {studentRequests}
              </p>
              <p className="text-sm text-gray-500">Student Requests</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <form className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              name="search"
              placeholder="Search by name or email..."
              defaultValue={search}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors"
            />
          </div>

          <select
            name="schoolId"
            defaultValue={schoolId || ''}
            className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors"
          >
            <option value="">All Schools</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>

          <select
            name="role"
            defaultValue={role || 'ALL'}
            className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors"
          >
            <option value="ALL">All Roles</option>
            {Object.values(Role).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </form>
      </div>

      {/* Pending Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Pending Approvals</h2>
          </div>
          <span className="text-sm text-gray-500">
            Showing {pendingUsers.length} request(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  User
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  School
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Requested
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-300" />
                    <p className="text-lg font-medium">No pending requests</p>
                    <p className="text-sm mt-1">
                      All user requests have been processed
                    </p>
                  </td>
                </tr>
              ) : (
                pendingUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-600 font-medium">
                            {user.firstName?.[0] ||
                              user.email[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : 'Unnamed'}
                          </p>
                          <p className="text-sm text-gray-500">{user.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.school ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            {user.school.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">No school</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {formatDate(user.createdAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <form
                          action={async () => {
                            'use server';
                            await approveUser(
                              user.id,
                              superAdmin.id,
                              superAdmin.role,
                              null // SuperAdmin has no schoolId
                            );
                            revalidatePath(
                              '/dashboard/superadmin/approvals'
                            );
                          }}
                        >
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium text-sm"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                        </form>

                        <form
                          action={async () => {
                            'use server';
                            await rejectUser(
                              user.id,
                              superAdmin.id,
                              superAdmin.role,
                              null // SuperAdmin has no schoolId
                            );
                            revalidatePath(
                              '/dashboard/superadmin/approvals'
                            );
                          }}
                        >
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Notice */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-indigo-900">
            SuperAdmin Approval Guidelines
          </p>
          <ul className="text-sm text-indigo-700 mt-1 space-y-1">
            <li>
              • You have access to approve requests across all schools
            </li>
            <li>• Admin requests should be carefully verified</li>
            <li>• Consider school capacity and needs when approving</li>
            <li>• All approval actions are logged for audit purposes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
