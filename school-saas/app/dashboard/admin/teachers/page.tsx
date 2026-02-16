'use client';

import { useState, useEffect } from 'react';
import { Role } from '@prisma/client';
import { getCurrentUserProfile } from '@/app/actions/user.actions';
import { listTeachers } from '@/app/actions/teacher.actions';
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
  FileText,
  Award,
  Star,
  ArrowLeft,
  Filter,
  Download,
  Mail,
  Phone
} from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/admin' },
  { icon: Users, label: 'Students', href: '/dashboard/admin/students' },
  { icon: GraduationCap, label: 'Teachers', href: '/dashboard/admin/teachers', active: true },
  { icon: BookOpen, label: 'Classes', href: '/dashboard/admin/classes' },
  { icon: FileText, label: 'Subjects', href: '/dashboard/admin/subjects' },
  { icon: Award, label: 'Exams', href: '/dashboard/admin/exams' },
  { icon: Wallet, label: 'Finance', href: '/dashboard/accountant' },
  { icon: Settings, label: 'Settings', href: '/dashboard/admin/settings' },
];

export default function TeachersPage() {
  const [user, setUser] = useState<{ role: Role; firstName: string | null; lastName: string | null; school?: { name: string } | null } | null>(null);
  const [schoolName, setSchoolName] = useState<string>('SchooIi');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
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

      const teachersResult = await listTeachers();
      if (teachersResult.success) {
        setTeachers(teachersResult.data.teachers);
      }
    } catch (err) {
      console.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
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
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search teachers..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-purple-100"
                />
              </div>
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
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">Teachers</h1>
              <p className="text-gray-500">Manage all teachers in your school</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
                <Filter className="w-4 h-4" />
                Filter
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
                <Download className="w-4 h-4" />
                Export
              </button>
              <Link 
                href="/teachers/create"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" />
                Add Teacher
              </Link>
            </div>
          </div>

          {/* Teachers Grid */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading teachers...</div>
          ) : teachers.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No teachers found</h3>
              <p className="text-gray-500 mb-4">Add your first teacher to get started</p>
              <Link 
                href="/teachers/create"
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" />
                Add Teacher
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teachers.map((teacher: any) => (
                <div key={teacher.id} className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-semibold">
                        {teacher.user?.firstName?.[0]}{teacher.user?.lastName?.[0]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{teacher.user?.firstName} {teacher.user?.lastName}</h3>
                        <p className="text-sm text-gray-500">{teacher.specialization || 'General'}</p>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-gray-50 rounded-lg">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{teacher.user?.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{teacher.phone || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Classes</span>
                      <span className="font-semibold text-gray-800">{teacher._count?.classTeachers || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
