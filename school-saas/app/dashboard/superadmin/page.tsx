import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Role, UserStatus, SchoolStatus } from '@prisma/client';
import Link from 'next/link';
import {
  Building2,
  Users,
  GraduationCap,
  School,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
} from 'lucide-react';

/**
 * SuperAdmin Dashboard Page
 *
 * Server-side rendered dashboard with system-wide statistics.
 * Only accessible to SUPERADMIN users.
 *
 * @page app/dashboard/superadmin/page.tsx
 */

async function getSystemStatistics() {
  const [
    totalSchools,
    activeSchools,
    pendingApprovals,
    totalUsers,
    totalStudents,
    totalTeachers,
    recentUsers,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({
      where: { status: SchoolStatus.ACTIVE },
    }),
    prisma.user.count({
      where: { status: UserStatus.PENDING },
    }),
    prisma.user.count(),
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    totalSchools,
    activeSchools,
    pendingApprovals,
    totalUsers,
    totalStudents,
    totalTeachers,
    recentUsers,
  };
}

export default async function SuperAdminDashboardPage() {
  // Verify SUPERADMIN access
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect('/sign-in');
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true },
  });

  if (!user || user.role !== Role.SUPER_ADMIN) {
    redirect('/dashboard/admin');
  }

  // Fetch system statistics
  const stats = await getSystemStatistics();

  const statCards = [
    {
      title: 'Total Schools',
      value: stats.totalSchools,
      icon: Building2,
      href: '/dashboard/superadmin/schools',
    },
    {
      title: 'Active Schools',
      value: stats.activeSchools,
      icon: School,
      href: '/dashboard/superadmin/schools',
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: Users,
      href: '/dashboard/superadmin/approvals',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      href: '/dashboard/superadmin/users',
    },
  ];

  const quickActions = [
    {
      label: 'Add New School',
      href: '/dashboard/superadmin/schools/new',
      icon: Plus,
      color: 'bg-indigo-500',
    },
    {
      label: 'Manage Users',
      href: '/dashboard/superadmin/users',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      label: 'View Analytics',
      href: '/dashboard/superadmin/analytics',
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      label: 'System Settings',
      href: '/dashboard/superadmin/settings',
      icon: Activity,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            SuperAdmin Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            System-wide overview and management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                <card.icon className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-gray-500 text-sm">{card.title}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {card.value.toLocaleString()}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <span className="font-medium text-gray-700">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity & Active Schools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Users
            </h2>
            <Link
              href="/dashboard/superadmin/users"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No users found
              </p>
            ) : (
              stats.recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {(user.firstName?.[0] || user.email[0]).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      {user.role} • {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Overview */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            System Overview
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Active Schools</span>
              <span className="font-semibold text-gray-900">
                {stats.activeSchools} / {stats.totalSchools}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Pending Approvals</span>
              <span className="font-semibold text-gray-900">
                {stats.pendingApprovals}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">User-to-School Ratio</span>
              <span className="font-semibold text-gray-900">
                {stats.totalSchools > 0
                  ? (stats.totalUsers / stats.totalSchools).toFixed(1)
                  : 0}{' '}
                users/school
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Student-to-Teacher Ratio</span>
              <span className="font-semibold text-gray-900">
                {stats.totalTeachers > 0
                  ? (stats.totalStudents / stats.totalTeachers).toFixed(1)
                  : 0}{' '}
                : 1
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">System Status</span>
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Operational
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
