import { prisma } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { Role, SchoolStatus } from '@prisma/client';
import {
  Building2,
  ArrowLeft,
  Users,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreVertical,
} from 'lucide-react';
import { revalidatePath } from 'next/cache';

/**
 * SuperAdmin School Details Page
 *
 * Displays school information with tabs for:
 * - Details (read-only)
 * - Admin users
 * - Academic years
 * - Status control
 *
 * @page app/dashboard/superadmin/schools/[schoolId]/page.tsx
 */

interface SchoolDetailsPageProps {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

async function getSchoolData(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      _count: {
        select: {
          users: true,
          students: true,
          teachers: true,
          parents: true,
          academicYears: true,
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
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      academicYears: {
        orderBy: { startDate: 'desc' },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          isCurrent: true,
          status: true,
        },
      },
    },
  });

  return school;
}

async function verifySuperAdmin(clerkId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true },
  });
  return user?.role === Role.SUPER_ADMIN;
}

async function updateSchoolStatus(schoolId: string, status: SchoolStatus) {
  'use server';

  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');

  const isSuperAdmin = await verifySuperAdmin(clerkId);
  if (!isSuperAdmin) throw new Error('Forbidden');

  await prisma.school.update({
    where: { id: schoolId },
    data: { status },
  });

  // Create audit log
  const superAdminUser = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  if (superAdminUser) {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: superAdminUser.id,
        action: 'UPDATE',
        entity: 'SCHOOL',
        entityId: schoolId,
        details: `School status changed to ${status}`,
      },
    });
  }

  revalidatePath(`/dashboard/superadmin/schools/${schoolId}`);
}

export default async function SchoolDetailsPage({
  params,
  searchParams,
}: SchoolDetailsPageProps) {
  // Verify SUPERADMIN access
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect('/sign-in');
  }

  const isSuperAdmin = await verifySuperAdmin(clerkId);

  if (!isSuperAdmin) {
    redirect('/dashboard/admin');
  }

  // Get school ID from params
  const { schoolId } = await params;

  // Get active tab from search params
  const { tab = 'details' } = await searchParams;
  const activeTab = ['details', 'admins', 'academic-years', 'status'].includes(tab)
    ? tab
    : 'details';

  // Fetch school data
  const school = await getSchoolData(schoolId);

  if (!school) {
    notFound();
  }

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/dashboard/superadmin/schools"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Schools
      </Link>

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <Building2 className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
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
                    school.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                {school.status}
              </span>
              <span className="text-sm text-gray-400">
                Created {formatDate(school.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {school._count.users}
              </p>
              <p className="text-sm text-gray-500">Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {school._count.students}
              </p>
              <p className="text-sm text-gray-500">Students</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {school._count.teachers}
              </p>
              <p className="text-sm text-gray-500">Teachers</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {school._count.academicYears}
              </p>
              <p className="text-sm text-gray-500">Academic Years</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'details', label: 'Details', icon: Building2 },
            { id: 'admins', label: 'Admin Users', icon: Users },
            { id: 'academic-years', label: 'Academic Years', icon: Calendar },
            { id: 'status', label: 'Status Control', icon: AlertCircle },
          ].map((tabItem) => (
            <Link
              key={tabItem.id}
              href={`/dashboard/superadmin/schools/${schoolId}?tab=${tabItem.id}`}
              className={`flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tabItem.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tabItem.icon className="w-4 h-4" />
              {tabItem.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {activeTab === 'details' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">
              School Details
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    School Name
                  </label>
                  <p className="text-gray-900 font-medium">{school.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Slug
                  </label>
                  <p className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded-lg">
                    {school.slug}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      Address
                    </span>
                  </label>
                  <p className="text-gray-900">
                    {school.address || 'Not provided'}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-4 h-4" />
                      Email
                    </span>
                  </label>
                  <p className="text-gray-900">
                    {school.email || 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4" />
                      Phone
                    </span>
                  </label>
                  <p className="text-gray-900">
                    {school.phone || 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      Created At
                    </span>
                  </label>
                  <p className="text-gray-900">
                    {formatDate(school.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admins' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Admin Users
              </h2>
              <span className="text-sm text-gray-500">
                {school.users.length} admin(s)
              </span>
            </div>
            {school.users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No admin users assigned</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Email
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {school.users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : 'Unnamed'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {user.email}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              user.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(user.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'academic-years' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Academic Years
              </h2>
              <span className="text-sm text-gray-500">
                {school.academicYears.length} year(s)
              </span>
            </div>
            {school.academicYears.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No academic years configured</p>
              </div>
            ) : (
              <div className="space-y-3">
                {school.academicYears.map((year) => (
                  <div
                    key={year.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-gray-900">{year.name}</p>
                        {year.isCurrent && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDate(year.startDate)} -{' '}
                        {formatDate(year.endDate)}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        year.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : year.status === 'COMPLETED'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {year.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'status' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Status Control
            </h2>
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="font-medium text-gray-900">
                    Current Status:{' '}
                    <span
                      className={
                        school.status === 'ACTIVE'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      {school.status}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {school.status === 'ACTIVE'
                      ? 'School is active and all users can access it.'
                      : 'School is suspended. Users cannot access it until reactivated.'}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    school.status === 'ACTIVE'
                      ? 'bg-green-100'
                      : 'bg-red-100'
                  }`}
                >
                  {school.status === 'ACTIVE' ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>
              </div>

              <form
                action={async () => {
                  'use server';
                  const newStatus =
                    school.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
                  await updateSchoolStatus(schoolId, newStatus as SchoolStatus);
                }}
                className="flex items-center gap-4"
              >
                <button
                  type="submit"
                  className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                    school.status === 'ACTIVE'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {school.status === 'ACTIVE'
                    ? 'Suspend School'
                    : 'Activate School'}
                </button>
                <p className="text-sm text-gray-500">
                  {school.status === 'ACTIVE'
                    ? 'This will prevent all users from accessing the school.'
                    : 'This will restore access for all users.'}
                </p>
              </form>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Warning</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Changing the school status affects all users associated with
                  this school. Make sure to communicate any changes to school
                  administrators.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
