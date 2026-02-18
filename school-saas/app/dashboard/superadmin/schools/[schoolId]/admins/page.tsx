import {
  approveUser,
  rejectUser,
} from '@/src/lib/auth/userApproval';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { Role, SchoolStatus } from '@prisma/client';
import {
  createDelegatedContext,
  verifySuperAdminIdentity,
} from '@/src/lib/auth/superadminContext';
import {
  Users,
  ArrowLeft,
  Plus,
  Ban,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Mail,
  Shield,
  MoreVertical,
} from 'lucide-react';
import { revalidatePath } from 'next/cache';

/**
 * SuperAdmin School Admin Management Page
 *
 * Allows SUPERADMIN to manage school administrators.
 * - List admins
 * - Add admin
 * - Disable/enable admin
 * - Audit all actions
 *
 * @page app/dashboard/superadmin/schools/[schoolId]/admins/page.tsx
 */

interface AdminManagementPageProps {
  params: Promise<{ schoolId: string }>;
}

async function getSchoolAndAdmins(schoolId: string) {
  const [school, admins] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
      },
    }),
    prisma.user.findMany({
      where: {
        schoolId,
        role: Role.ADMIN,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        clerkId: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { school, admins };
}

async function toggleAdminStatus(
  schoolId: string,
  adminId: string,
  isActive: boolean,
  superAdminId: string
) {
  'use server';

  const admin = await prisma.user.update({
    where: { id: adminId, schoolId },
    data: { isActive },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: superAdminId,
      action: isActive ? 'ACTIVATE_ADMIN' : 'DISABLE_ADMIN',
      entity: 'USER',
      entityId: adminId,
      details: `${isActive ? 'Enabled' : 'Disabled'} admin ${admin.email}`,
    },
  });

  revalidatePath(`/dashboard/superadmin/schools/${schoolId}/admins`);
}

async function addAdmin(
  schoolId: string,
  data: {
    email: string;
    firstName: string;
    lastName: string;
  },
  superAdminId: string
) {
  'use server';

  // Check if email already exists
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });

  if (existing) {
    throw new Error('Email already registered');
  }

  const admin = await prisma.user.create({
    data: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: Role.ADMIN,
      schoolId,
      clerkId: `pending_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      isActive: true,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: superAdminId,
      action: 'CREATE_ADMIN',
      entity: 'USER',
      entityId: admin.id,
      details: `Created admin ${admin.email} for school`,
    },
  });

  revalidatePath(`/dashboard/superadmin/schools/${schoolId}/admins`);
}

export default async function AdminManagementPage({
  params,
}: AdminManagementPageProps) {
  // Step 1: Verify authentication
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect('/sign-in');
  }

  // Step 2: Verify SUPERADMIN identity
  const superAdmin = await verifySuperAdminIdentity(clerkId);

  if (!superAdmin) {
    redirect('/dashboard/admin');
  }

  // Step 3: Get target school ID
  const { schoolId } = await params;

  // Step 4: Create delegated context for audit logging
  const delegatedContext = await createDelegatedContext(
    clerkId,
    schoolId,
    'Managing school administrators'
  );

  if (!delegatedContext) {
    redirect('/dashboard/superadmin/schools');
  }

  // Step 5: Fetch school and admins
  const { school, admins } = await getSchoolAndAdmins(schoolId);

  if (!school) {
    notFound();
  }

  const formatDate = (date: Date | null) =>
    date
      ? new Date(date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Never';

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/superadmin/schools/${schoolId}`}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to School
        </Link>
        <span className="text-gray-300">|</span>
        <Link
          href="/dashboard/superadmin/schools"
          className="text-gray-500 hover:text-gray-700 transition-colors text-sm"
        >
          All Schools
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            School Administrators
          </h1>
          <p className="text-gray-500 mt-1">
            Manage administrators for <span className="font-medium">{school.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/superadmin/schools/${schoolId}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            View School Details
          </Link>
        </div>
      </div>

      {/* SuperAdmin Banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-3">
        <Shield className="w-5 h-5 text-indigo-600" />
        <div>
          <p className="font-medium text-indigo-900">SuperAdmin Access</p>
          <p className="text-sm text-indigo-700">
            You are managing this school's administrators with elevated privileges.
            All actions are logged for security.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{admins.length}</p>
              <p className="text-sm text-gray-500">Total Admins</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {admins.filter((a) => a.isActive).length}
              </p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {admins.filter((a) => !a.isActive).length}
              </p>
              <p className="text-sm text-gray-500">Disabled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Admin Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Add New Administrator</h2>
        </div>

        <form
          action={async (formData) => {
            'use server';
            const email = formData.get('email') as string;
            const firstName = formData.get('firstName') as string;
            const lastName = formData.get('lastName') as string;

            if (!email || !firstName || !lastName) {
              throw new Error('All fields are required');
            }

            await addAdmin(
              schoolId,
              { email, firstName, lastName },
              superAdmin.id
            );
          }}
          className="grid grid-cols-4 gap-4 items-end"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                Email
              </span>
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="admin@school.edu"
              className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              required
              placeholder="John"
              className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              required
              placeholder="Doe"
              className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Admin
          </button>
        </form>
      </div>

      {/* Admins Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Administrators</h2>
          </div>
          <span className="text-sm text-gray-500">
            {admins.length} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Email
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <UserCheck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No administrators</p>
                    <p className="text-sm mt-1">
                      Add your first admin using the form above
                    </p>
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-600 font-medium">
                            {admin.firstName?.[0] || admin.email[0].toUpperCase()}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900">
                          {admin.firstName && admin.lastName
                            ? `${admin.firstName} ${admin.lastName}`
                            : 'Unnamed'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{admin.email}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          admin.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {admin.isActive ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <Ban className="w-3 h-3" />
                            Disabled
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(admin.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(admin.lastLoginAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {admin.clerkId?.startsWith('pending_') ? (
                        <span className="text-xs text-gray-400">
                          Pending setup
                        </span>
                      ) : (
                        <form
                          action={async () => {
                            'use server';
                            await toggleAdminStatus(
                              schoolId,
                              admin.id,
                              !admin.isActive,
                              superAdmin.id
                            );
                          }}
                        >
                          <button
                            type="submit"
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              admin.isActive
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {admin.isActive ? (
                              <>
                                <Ban className="w-4 h-4" />
                                Disable
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                Enable
                              </>
                            )}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warning Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-yellow-800">Important</p>
          <p className="text-sm text-yellow-700 mt-1">
            Disabling an admin will prevent them from accessing the school dashboard.
            This action can be reversed at any time. All changes are logged for
            security auditing purposes.
          </p>
        </div>
      </div>
    </div>
  );
}
