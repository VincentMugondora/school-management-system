import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';
import {
  LayoutDashboard,
  School,
  Users,
  Settings,
  Bell,
  Search,
  Shield,
  Building2,
  GraduationCap,
  BarChart3,
  Layers,
} from 'lucide-react';

/**
 * SuperAdmin Dashboard Layout
 *
 * Server-side layout with strict SUPERADMIN role enforcement.
 * SuperAdmins have no school context (schoolId = null).
 *
 * @layout app/dashboard/superadmin/layout.tsx
 */

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

// SuperAdmin navigation items - no school context required
const superAdminNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/superadmin' },
  { icon: Building2, label: 'Schools', href: '/dashboard/superadmin/schools' },
  { icon: Users, label: 'Users', href: '/dashboard/superadmin/users' },
  { icon: GraduationCap, label: 'Students', href: '/dashboard/superadmin/students' },
  { icon: School, label: 'Teachers', href: '/dashboard/superadmin/teachers' },
  { icon: BarChart3, label: 'Analytics', href: '/dashboard/superadmin/analytics' },
  { icon: Layers, label: 'Subscriptions', href: '/dashboard/superadmin/subscriptions' },
  { icon: Settings, label: 'System Settings', href: '/dashboard/superadmin/settings' },
];

async function getSuperAdminUser(clerkId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      schoolId: true,
      imageUrl: true,
    },
  });

  return user;
}

export default async function SuperAdminLayout({
  children,
}: SuperAdminLayoutProps) {
  // Server-side auth check via Clerk
  const { userId: clerkId } = await import('@clerk/nextjs/server').then(
    (mod) => mod.auth()
  );

  if (!clerkId) {
    redirect('/sign-in?redirect_url=/dashboard/superadmin');
  }

  // Fetch user and verify SUPERADMIN role
  const user = await getSuperAdminUser(clerkId);

  if (!user) {
    redirect('/onboarding/profile');
  }

  // Strict SUPERADMIN role check
  if (user.role !== Role.SUPER_ADMIN) {
    // Redirect non-SUPERADMIN users to their appropriate dashboard
    if (user.role === Role.ADMIN) {
      redirect('/dashboard/admin');
    } else if (user.role === Role.TEACHER) {
      redirect('/dashboard/teacher');
    } else if (user.role === Role.STUDENT) {
      redirect('/dashboard/student');
    } else if (user.role === Role.PARENT) {
      redirect('/dashboard/parent');
    } else if (user.role === Role.ACCOUNTANT) {
      redirect('/dashboard/accountant');
    }
    redirect('/dashboard');
  }

  // Enforce SUPERADMIN has no school association
  if (user.schoolId !== null) {
    // This should not happen with proper role enforcement, but handle it gracefully
    console.error(
      `[SuperAdminLayout] User ${user.id} has SUPERADMIN role but schoolId is ${user.schoolId}. Expected null.`
    );
    // You may want to show an error or redirect to fix this
  }

  const displayName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.email?.split('@')[0] || 'Super Admin';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 h-screen fixed left-0 top-0 flex flex-col">
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">SchooLi</span>
              <p className="text-xs text-slate-400">SuperAdmin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="mb-4 px-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overview
            </span>
          </div>
          <ul className="space-y-1">
            {superAdminNavItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {displayName}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-4 flex items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search schools, users, analytics..."
                  className="w-full pl-12 pr-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors"
                />
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* System Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-700">
                  System Online
                </span>
              </div>

              {/* Notifications */}
              <button className="relative p-2.5 text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
