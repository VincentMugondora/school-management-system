'use client';

import { useState, useEffect } from 'react';
import { Role } from '@prisma/client';
import { getCurrentUserProfile } from '@/app/actions/user.actions';
import { listSchools } from '@/app/actions/school.actions';
import { listTeachers } from '@/app/actions/teacher.actions';
import { listStudents } from '@/app/actions/student.actions';
import { getFinancialSummary } from '@/app/actions/finance.actions';
import { listAcademicYears, listTerms } from '@/app/actions/academic.actions';
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
  MoreVertical,
  Calendar,
  Clock,
  FileText,
  Award,
  Star,
  Zap
} from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/admin', active: true },
  { icon: Users, label: 'Students', href: '/dashboard/admin/students' },
  { icon: GraduationCap, label: 'Teachers', href: '/dashboard/admin/teachers' },
  { icon: BookOpen, label: 'Library', href: '/dashboard/admin/library' },
  { icon: Wallet, label: 'Account', href: '/dashboard/accountant' },
  { icon: FileText, label: 'Class', href: '/dashboard/admin/classes' },
  { icon: BookOpen, label: 'Subject', href: '/dashboard/admin/subjects' },
  { icon: Clock, label: 'Routine', href: '/dashboard/admin/routine' },
  { icon: Calendar, label: 'Attendance', href: '/dashboard/admin/attendance' },
  { icon: FileText, label: 'Exam', href: '/dashboard/admin/exams' },
  { icon: Bell, label: 'Notice', href: '/dashboard/admin/notices' },
  { icon: BookOpen, label: 'Transport', href: '/dashboard/admin/transport' },
  { icon: BookOpen, label: 'Hostel', href: '/dashboard/admin/hostel' },
  { icon: Settings, label: 'Settings', href: '/dashboard/admin/settings' },
];

// Star students data
const starStudents = [
  { id: 1, name: 'Evelyn Harper', avatar: 'EH', studentId: 'PRE4378', marks: 1185, percent: 98 },
  { id: 2, name: 'Diana Plenty', avatar: 'DP', studentId: 'PRE4374', marks: 1165, percent: 91, selected: true },
  { id: 3, name: 'John Millar', avatar: 'JM', studentId: 'PRE4378', marks: 1175, percent: 92 },
];

// Library books data
const libraryBooks = [
  { title: 'Literature', copies: 120, available: 'Available' },
  { title: 'Mathematics', copies: 1872, available: '2 Issued' },
  { title: 'English', copies: 575, available: '5 Issued' },
  { title: 'Science', copies: 249, available: 'Available' },
];

// Best performers data
const bestPerformers = [
  { class: 'Class 06', subject: 'Math', score: 60 },
  { class: 'Class 04', subject: 'ICT', score: 70 },
  { class: 'Class 03', subject: 'Science', score: 72 },
  { class: 'Class 08', subject: 'English', score: 47 },
];

// Notifications data
const notifications = [
  { title: 'Emergency School Closure', time: '4:00 PM', date: '15 Aug', type: 'urgent', icon: '🔴' },
  { title: 'New Extracurricular Clubs', time: '4:00 PM', date: '15 Aug', type: 'info', icon: '🎨' },
];

export default function AdminDashboard() {
  const [user, setUser] = useState<{ role: Role; firstName: string | null; lastName: string | null } | null>(null);
  const [schoolName, setSchoolName] = useState<string>('SchooIi');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      // Get current user
      const userResult = await getCurrentUserProfile();
      if (userResult.success) {
        setUser(userResult.data);
        // Set school name if available
        if (userResult.data.schoolName) {
          setSchoolName(userResult.data.schoolName);
        }
      }

      // Fetch all stats in parallel
      const [
        schoolsResult,
        teachersResult,
        studentsResult,
        financeResult,
        academicYearsResult,
        termsResult,
      ] = await Promise.all([
        listSchools(),
        listTeachers(),
        listStudents(),
        getFinancialSummary(),
        listAcademicYears(),
        listTerms(),
      ]);

      const dashboardStats: DashboardStats = {
        totalSchools: schoolsResult.success ? schoolsResult.data.total : 0,
        totalTeachers: teachersResult.success ? teachersResult.data.total : 0,
        totalStudents: studentsResult.success ? studentsResult.data.total : 0,
        totalInvoiced: financeResult.success ? financeResult.data.totalInvoiced : 0,
        totalPaid: financeResult.success ? financeResult.data.totalPaid : 0,
        activeAcademicYears: academicYearsResult.success 
          ? academicYearsResult.data.filter((y: any) => y.status === 'ACTIVE').length 
          : 0,
        activeTerms: termsResult.success 
          ? termsResult.data.filter((t: any) => t.status === 'ACTIVE').length 
          : 0,
      };

      setStats(dashboardStats);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-600">
          Access Denied. Only administrators can access this dashboard.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7FC] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white h-screen fixed left-0 top-0 border-r border-gray-100 flex flex-col">
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-800 truncate">{schoolName}</span>
        </div>

        {/* Navigation */}
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
          {/* Search */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search anything here"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
            </div>
          </div>

          {/* Right Section */}
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

        {/* Dashboard Content */}
        <div className="p-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Welcome.</h1>
            <p className="text-gray-500">Navigate the future of education with SchooIi.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm mb-1">Students</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats ? (stats.totalStudents / 1000).toFixed(2) + 'K' : '0.00K'}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-blue-600" />
                </div>
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm mb-1">Teachers</p>
              <p className="text-3xl font-bold text-gray-800">{stats?.totalTeachers || 0}</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-orange-600" />
                </div>
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm mb-1">Awards</p>
              <p className="text-3xl font-bold text-gray-800">5.6K</p>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - 8 cols */}
            <div className="col-span-8 space-y-6">
              {/* Class Routine */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Class Routine</h3>
                  <div className="flex items-center gap-2">
                    <select className="px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 border-none">
                      <option>Select your day</option>
                    </select>
                    <select className="px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 border-none">
                      <option>Select your class</option>
                    </select>
                    <select className="px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 border-none">
                      <option>Section</option>
                    </select>
                    <button className="px-4 py-2 text-purple-600 text-sm font-medium hover:bg-purple-50 rounded-lg">
                      View All
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
                    <div className="flex items-center gap-3 mb-4">
                      <Calendar className="w-5 h-5" />
                      <span className="font-medium">October, 2023</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-purple-100 text-sm">Mathematics</p>
                      <p className="text-purple-100 text-sm">Science</p>
                    </div>
                    <button className="mt-4 w-full py-2.5 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4" />
                      Download routine (pdf)
                    </button>
                  </div>
                  
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 text-white">
                    <div className="flex items-center gap-3 mb-4">
                      <Calendar className="w-5 h-5" />
                      <span className="font-medium">November, 2023</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-gray-400 text-sm">English Literature</p>
                      <p className="text-gray-400 text-sm">History</p>
                    </div>
                    <button className="mt-4 w-full py-2.5 bg-white/10 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4" />
                      Download routine (pdf)
                    </button>
                  </div>
                </div>
              </div>

              {/* Star Students */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Star Students</h3>
                  <button className="p-2 hover:bg-gray-50 rounded-lg">
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-500">
                        <th className="pb-4 font-medium w-10">
                          <input type="checkbox" className="rounded border-gray-300" />
                        </th>
                        <th className="pb-4 font-medium">Name</th>
                        <th className="pb-4 font-medium">ID</th>
                        <th className="pb-4 font-medium">Marks</th>
                        <th className="pb-4 font-medium">Percent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {starStudents.map((student) => (
                        <tr key={student.id} className="border-t border-gray-50">
                          <td className="py-4">
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300" 
                              defaultChecked={student.selected}
                            />
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                                {student.avatar}
                              </div>
                              <span className="font-medium text-gray-800">{student.name}</span>
                            </div>
                          </td>
                          <td className="py-4 text-gray-600">{student.studentId}</td>
                          <td className="py-4 text-gray-800 font-semibold">{student.marks}</td>
                          <td className="py-4">
                            <span className="text-gray-800 font-semibold">{student.percent}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Exams & Best Performers */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Total Exams</h3>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-4xl font-bold text-gray-800">256</span>
                    <span className="text-green-500 text-sm mb-1">+10%</span>
                  </div>
                  <p className="text-gray-500 text-sm mb-4">Here is your total exams ratio in this month. Click here to <a href="#" className="text-purple-600 font-medium">view details</a></p>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"></div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Best Performers</h3>
                    <select className="text-sm text-gray-500 bg-transparent border-none">
                      <option>Weekly</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    {bestPerformers.map((performer, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 w-16">{performer.class}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              performer.subject === 'Math' ? 'bg-purple-500' :
                              performer.subject === 'ICT' ? 'bg-orange-400' :
                              performer.subject === 'Science' ? 'bg-cyan-400' :
                              'bg-red-400'
                            }`}
                            style={{ width: `${performer.score}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          performer.subject === 'Math' ? 'bg-purple-100 text-purple-600' :
                          performer.subject === 'ICT' ? 'bg-orange-100 text-orange-600' :
                          performer.subject === 'Science' ? 'bg-cyan-100 text-cyan-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {performer.score}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - 4 cols */}
            <div className="col-span-4 space-y-6">
              {/* Library */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Library</h3>
                  <button className="text-purple-600 text-sm font-medium hover:underline">View All</button>
                </div>
                <div className="space-y-4">
                  {libraryBooks.map((book, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-12 h-14 bg-gradient-to-br from-amber-700 to-amber-900 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{book.title}</p>
                        <p className="text-xs text-gray-500">{book.copies} Files</p>
                      </div>
                      <span className={`text-xs ${book.available === 'Available' ? 'text-green-500' : 'text-amber-500'}`}>
                        {book.available}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Course Statistics */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Course Statistics</h3>
                <div className="relative w-48 h-48 mx-auto mb-4">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E7EB" strokeWidth="12" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#8B5CF6" strokeWidth="12" strokeDasharray="75 251" strokeLinecap="round" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#F59E0B" strokeWidth="12" strokeDasharray="50 251" strokeDashoffset="-75" strokeLinecap="round" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#10B981" strokeWidth="12" strokeDasharray="40 251" strokeDashoffset="-125" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-800">Total</span>
                    <span className="text-3xl font-bold text-gray-800">15000</span>
                  </div>
                </div>
                <div className="flex justify-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-gray-600">Math</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-gray-600">English</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-gray-600">Chemistry</span>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Notifications</h3>
                  <button className="text-purple-600 text-sm font-medium hover:underline">View All</button>
                </div>
                <div className="space-y-4">
                  {notifications.map((notif, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                        {notif.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 mb-1">{notif.title}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{notif.time}</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span>{notif.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* New Course CTA */}
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-indigo-100 mb-2">New Course</p>
                  <h4 className="font-bold mb-2">Build your career with API</h4>
                  <button className="bg-black text-white text-xs px-4 py-2 rounded-lg font-medium">
                    Enrol Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
