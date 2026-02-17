import { prisma } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { Role, SchoolStatus } from '@prisma/client';
import {
  createDelegatedContext,
  verifySuperAdminIdentity,
} from '@/lib/auth/superadminContext';
import {
  Building2,
  ArrowLeft,
  Users,
  GraduationCap,
  UserCheck,
  AlertTriangle,
  Eye,
  LayoutDashboard,
  BookOpen,
  Calendar,
  Settings,
} from 'lucide-react';

/**
 * SuperAdmin Delegated School Dashboard View
 *
 * Allows SUPERADMIN to view a school's admin dashboard in read-only mode.
 * Creates a delegated context for audit logging.
 *
 * @page app/dashboard/superadmin/schools/[schoolId]/view/page.tsx
 */

interface DelegatedViewPageProps {
  params: Promise<{ schoolId: string }>;
}

async function getSchoolDashboardData(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      _count: {
        select: {
          users: true,
          students: true,
          teachers: true,
          parents: true,
          classes: true,
          subjects: true,
        },
      },
      users: {
        where: { role: Role.ADMIN },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      academicYears: {
        where: { isCurrent: true },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  });

  return school;
}

export default async function DelegatedSchoolViewPage({
  params,
}: DelegatedViewPageProps) {
  // Step 1: Verify authentication
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect('/sign-in');
  }

  // Step 2: Verify SUPERADMIN identity (must have no schoolId)
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
    'Viewing school dashboard as SuperAdmin',
    undefined // IP will be captured by middleware if needed
  );

  if (!delegatedContext) {
    redirect('/dashboard/superadmin/schools');
  }

  // Step 5: Fetch school data
  const school = await getSchoolDashboardData(schoolId);

  if (!school) {
    notFound();
  }

  // Step 6: Verify school is accessible (not suspended)
  if (school.status === SchoolStatus.SUSPENDED) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h1 className="text-2xl font-bold text-red-800 mb-2">
              School Suspended
            </h1>
            <p className="text-red-600 mb-6">
              This school is currently suspended and cannot be accessed.
            </p>
            <Link
              href="/dashboard/superadmin/schools"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Schools
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | null) =>
    date
      ? new Date(date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Never';

  const currentYear = school.academicYears[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SuperAdmin Viewing Banner */}
      <div className="bg-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">Viewing as SuperAdmin</p>
                <p className="text-sm text-indigo-200">
                  Read-only access to {school.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-indigo-200">
                Delegated at: {formatDate(new Date())}
              </p>
              <Link
                href="/dashboard/superadmin/schools"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
              >
                Exit View
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link
            href="/dashboard/superadmin"
            className="hover:text-gray-700 transition-colors"
          >
            SuperAdmin
          </Link>
          <span>/</span>
          <Link
            href="/dashboard/superadmin/schools"
            className="hover:text-gray-700 transition-colors"
          >
            Schools
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{school.name}</span>
        </div>

        {/* School Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {school.name}
                </h1>
                <p className="text-gray-500">/{school.slug}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      school.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        school.status === 'ACTIVE'
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }`}
                    />
                    {school.status}
                  </span>
                  {currentYear && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      <Calendar className="w-3 h-3" />
                      {currentYear.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Created</p>
              <p className="font-medium text-gray-900">
                {formatDate(school.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500 font-medium">
                Total Users
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {school._count.users}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-500 font-medium">
                Students
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {school._count.students}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500 font-medium">
                Teachers
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {school._count.teachers}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-sm text-gray-500 font-medium">
                Classes
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {school._count.classes}
            </p>
          </div>
        </div>

        {/* Read-Only Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">Read-Only Mode</p>
            <p className="text-sm text-yellow-700 mt-1">
              You are viewing this school dashboard in read-only mode. All
              destructive actions (create, update, delete) are disabled. To make
              changes, visit the{' '}
              <Link
                href={`/dashboard/superadmin/schools/${schoolId}`}
                className="underline hover:no-underline"
              >
                school management page
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Admin Users Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                School Administrators
              </h2>
            </div>
            <span className="text-sm text-gray-500">
              {school.users.length} admin(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Last Login
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {school.users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : 'Unnamed'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(user.lastLoginAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {school.users.length === 0 && (
            <div className="text-center py-12">
              <UserCheck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No administrators assigned</p>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Link
            href={`/dashboard/superadmin/schools/${schoolId}`}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                <LayoutDashboard className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  School Management
                </h3>
                <p className="text-sm text-gray-500">
                  View details, manage admins, control status
                </p>
              </div>
            </div>
          </Link>

          <Link
            href={`/dashboard/superadmin/schools/${schoolId}?tab=admins`}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Manage Admins</h3>
                <p className="text-sm text-gray-500">
                  Add or remove school administrators
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
