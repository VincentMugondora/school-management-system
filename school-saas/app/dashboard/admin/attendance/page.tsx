'use client';

import { useState, useEffect } from 'react';
import { Role } from '@prisma/client';
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
  CheckCircle,
  XCircle,
  Calendar,
  ArrowLeft,
  Star,
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
  { icon: Calendar, label: 'Attendance', href: '/dashboard/admin/attendance', active: true },
  { icon: BookOpen, label: 'Exams', href: '/dashboard/admin/exams' },
  { icon: Bell, label: 'Notices', href: '/dashboard/admin/notices' },
  { icon: BookOpen, label: 'Transport', href: '/dashboard/admin/transport' },
  { icon: BookOpen, label: 'Hostel', href: '/dashboard/admin/hostel' },
  { icon: Settings, label: 'Settings', href: '/dashboard/admin/settings' },
];

// Mock attendance data
const students = [
  { id: 1, name: 'John Doe', rollNo: '001', present: true },
  { id: 2, name: 'Jane Smith', rollNo: '002', present: true },
  { id: 3, name: 'Bob Johnson', rollNo: '003', present: false },
  { id: 4, name: 'Alice Brown', rollNo: '004', present: true },
  { id: 5, name: 'Charlie Wilson', rollNo: '005', present: true },
  { id: 6, name: 'Diana Prince', rollNo: '006', present: false },
  { id: 7, name: 'Eve Davis', rollNo: '007', present: true },
  { id: 8, name: 'Frank Miller', rollNo: '008', present: true },
];

export default function AttendancePage() {
  const [user, setUser] = useState<{ role: Role; firstName: string | null; lastName: string | null; school?: { name: string } | null } | null>(null);
  const [schoolName, setSchoolName] = useState<string>('SchooIi');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('10th Grade A');
  const [attendanceData, setAttendanceData] = useState(students);

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

  function toggleAttendance(studentId: number) {
    setAttendanceData(prev =>
      prev.map(student =>
        student.id === studentId ? { ...student, present: !student.present } : student
      )
    );
  }

  const presentCount = attendanceData.filter(s => s.present).length;
  const absentCount = attendanceData.filter(s => !s.present).length;
  const attendanceRate = Math.round((presentCount / attendanceData.length) * 100);

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
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Attendance Management</h1>
              <p className="text-sm text-gray-500">Track daily student attendance</p>
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
          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
              >
                <option>10th Grade A</option>
                <option>10th Grade B</option>
                <option>11th Grade A</option>
                <option>11th Grade B</option>
                <option>12th Grade A</option>
                <option>12th Grade B</option>
              </select>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
                <Calendar className="w-4 h-4" />
                Reports
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700">
                <Plus className="w-4 h-4" />
                Save Attendance
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{presentCount}</p>
                  <p className="text-sm text-gray-500">Present</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{absentCount}</p>
                  <p className="text-sm text-gray-500">Absent</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{attendanceRate}%</p>
                  <p className="text-sm text-gray-500">Attendance Rate</p>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-6 py-4 font-medium">Roll No</th>
                  <th className="px-6 py-4 font-medium">Student Name</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.map((student) => (
                  <tr key={student.id} className="border-t border-gray-50">
                    <td className="px-6 py-4 text-gray-600">{student.rollNo}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="font-medium text-gray-800">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        student.present
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {student.present ? 'Present' : 'Absent'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleAttendance(student.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          student.present
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        Mark {student.present ? 'Absent' : 'Present'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
