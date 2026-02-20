'use client';

import { useState, useEffect } from 'react';
import type { Role } from '@prisma/client';
import { getCurrentUserProfile } from '@/app/actions/user.actions';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Wallet,
  Settings,
  Bell,
  Search,
  Plus,
  MoreVertical,
  Megaphone,
  Calendar,
  ArrowLeft,
  Star,
  Trash2,
  Edit,
} from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/admin' },
  { icon: Users, label: 'Students', href: '/dashboard/admin/students' },
  { icon: GraduationCap, label: 'Teachers', href: '/dashboard/admin/teachers' },
  { icon: BookOpen, label: 'Library', href: '/dashboard/admin/library' },
  { icon: Wallet, label: 'Finance', href: '/dashboard/accountant' },
  { icon: BookOpen, label: 'Classes', href: '/dashboard/admin/classes' },
  { icon: BookOpen, label: 'Subjects', href: '/dashboard/admin/subjects' },
  { icon: GraduationCap, label: 'Routine', href: '/dashboard/admin/routine' },
  { icon: Calendar, label: 'Attendance', href: '/dashboard/admin/attendance' },
  { icon: BookOpen, label: 'Exams', href: '/dashboard/admin/exams' },
  { icon: Bell, label: 'Notices', href: '/dashboard/admin/notices', active: true },
  { icon: BookOpen, label: 'Transport', href: '/dashboard/admin/transport' },
  { icon: BookOpen, label: 'Hostel', href: '/dashboard/admin/hostel' },
  { icon: Settings, label: 'Settings', href: '/dashboard/admin/settings' },
];

// Mock notices data
const notices = [
  { id: 1, title: 'Mid-term Examination Schedule', content: 'Mid-term examinations will start from next Monday. Please check the schedule.', date: '2024-01-15', type: 'exam', priority: 'high' },
  { id: 2, title: 'Annual Sports Day', content: 'Annual Sports Day will be held on February 10th. All students must participate.', date: '2024-01-12', type: 'event', priority: 'medium' },
  { id: 3, title: 'Parent-Teacher Meeting', content: 'Parent-Teacher meeting scheduled for January 20th at 10:00 AM.', date: '2024-01-10', type: 'meeting', priority: 'high' },
  { id: 4, title: 'Library Timings Update', content: 'Library will remain open until 6:00 PM from now on.', date: '2024-01-08', type: 'general', priority: 'low' },
  { id: 5, title: 'Fee Payment Deadline', content: 'Last date for fee payment is January 25th. Late fees will apply after that.', date: '2024-01-05', type: 'fee', priority: 'high' },
];

export default function NoticesPage() {
  const [user, setUser] = useState<{ role: Role; firstName: string | null; lastName: string | null; school?: { name: string } | null } | null>(null);
  const [schoolName, setSchoolName] = useState<string>('SchooIi');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const userResult = await getCurrentUserProfile();
      if (userResult.success) {
        setUser(userResult.data);
        // Set school name if available
        const schoolNameFromProfile = userResult.data.school?.name;
        if (schoolNameFromProfile) {
          setSchoolName(schoolNameFromProfile);
        }
      }
    } catch (err) {
      console.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-600">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7FC] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white h-screen fixed left-0 top-0 border-r border-gray-100 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-800 truncate">{schoolName}</span>
        </div>

        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          {navItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-colors ${
                item.active
                  ? 'bg-purple-50 text-purple-600'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {item.active && <div className="ml-auto w-1.5 h-1.5 bg-purple-600 rounded-full"></div>}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-white px-8 py-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin" className="p-2 hover:bg-gray-100 rounded-xl">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Notice Board</h1>
              <p className="text-sm text-gray-500">Manage school announcements and notices</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-xl">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-800">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notices..."
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <Link
                href="/notices/create"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" />
                Post Notice
              </Link>
            </div>
          </div>

          {/* Notices List */}
          <div className="space-y-4">
            {notices.map((notice) => (
              <div key={notice.id} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      notice.priority === 'high'
                        ? 'bg-red-100'
                        : notice.priority === 'medium'
                        ? 'bg-yellow-100'
                        : 'bg-blue-100'
                    }`}>
                      <Megaphone className={`w-6 h-6 ${
                        notice.priority === 'high'
                          ? 'text-red-600'
                          : notice.priority === 'medium'
                          ? 'text-yellow-600'
                          : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-800">{notice.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          notice.priority === 'high'
                            ? 'bg-red-100 text-red-600'
                            : notice.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {notice.priority.charAt(0).toUpperCase() + notice.priority.slice(1)} Priority
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium capitalize">
                          {notice.type}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{notice.content}</p>
                      <p className="text-sm text-gray-400">Posted on {new Date(notice.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-blue-600">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
