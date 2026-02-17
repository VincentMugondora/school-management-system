import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  FileText,
  Settings,
  Bell,
  Search,
  GraduationCap,
  ClipboardList,
  Award,
} from 'lucide-react';

/**
 * Teacher Dashboard Layout
 *
 * Server-side layout with TEACHER role enforcement.
 * Teachers are associated with a specific school.
 *
 * @layout app/dashboard/teacher/layout.tsx
 */

interface TeacherLayoutProps {
  children: React.ReactNode;
}

// Teacher navigation items
const teacherNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/teacher' },
  { icon: Users, label: 'My Classes', href: '/dashboard/teacher/classes' },
  { icon: BookOpen, label: 'Subjects', href: '/dashboard/teacher/subjects' },
  { icon: ClipboardList, label: 'Attendance', href: '/dashboard/teacher/attendance' },
  { icon: FileText, label: 'Exams & Results', href: '/dashboard/teacher/exams' },
  { icon: Award, label: 'Grades', href: '/dashboard/teacher/grades' },
  { icon: Calendar, label: 'Schedule', href: '/dashboard/teacher/schedule' },
  { icon: GraduationCap, label: 'Students', href: '/dashboard/teacher/students' },
  { icon: Settings, label: 'Settings', href: '/dashboard/teacher/settings' },
];

async function getTeacherUser(clerkId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      schoolId: true,
      school: { select: { name: true } },
      imageUrl: true,
    },
  });

  return user;
}

export default async function TeacherLayout({
  children,
}: TeacherLayoutProps) {
  // Server-side auth check via Clerk
  const { userId: clerkId } = await import('@clerk/nextjs/server').then(
    (mod) => mod.auth()
  );

  if (!clerkId) {
    redirect('/sign-in?redirect_url=/dashboard/teacher');
  }

  // Fetch user and verify TEACHER role
  const user = await getTeacherUser(clerkId);

  if (!user) {
    redirect('/onboarding/profile');
  }

  // Strict TEACHER role check
  if (user.role !== Role.TEACHER) {
    // Redirect non-TEACHER users to their appropriate dashboard
    if (user.role === Role.SUPER_ADMIN) {
      redirect('/dashboard/superadmin');
    } else if (user.role === Role.ADMIN) {
      redirect('/dashboard/admin');
    } else if (user.role === Role.STUDENT) {
      redirect('/dashboard/student');
    } else if (user.role === Role.PARENT) {
      redirect('/dashboard/parent');
    } else if (user.role === Role.ACCOUNTANT) {
      redirect('/dashboard/accountant');
    }
    redirect('/dashboard');
  }

  // Verify teacher has school association
  if (!user.schoolId) {
    redirect('/onboarding/school');
  }

  const displayName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.email?.split('@')[0] || 'Teacher';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-emerald-900 h-screen fixed left-0 top-0 flex flex-col">
        {/* Logo Section */}
        <div className="p-6 border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">SchooLi</span>
              <p className="text-xs text-emerald-300">Teacher Portal</p>
            </div>
          </div>
        </div>

        {/* School Info */}
        <div className="px-4 py-3 border-b border-emerald-800">
          <p className="text-xs text-emerald-400 uppercase tracking-wider">School</p>
          <p className="text-sm font-medium text-white truncate">{user.school?.name}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="mb-4 px-2">
            <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">
              Teaching
            </span>
          </div>
          <ul className="space-y-1">
            {teacherNavItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-emerald-100 hover:bg-emerald-800 hover:text-white transition-colors"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-emerald-800">
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {displayName}
              </p>
              <p className="text-xs text-emerald-400 truncate">
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
                  placeholder="Search classes, students, subjects..."
                  className="w-full pl-12 pr-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 transition-colors"
                />
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
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
