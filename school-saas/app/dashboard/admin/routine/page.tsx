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
  Clock,
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
  { icon: Clock, label: 'Routine', href: '/dashboard/admin/routine', active: true },
  { icon: Calendar, label: 'Attendance', href: '/dashboard/admin/attendance' },
  { icon: BookOpen, label: 'Exams', href: '/dashboard/admin/exams' },
  { icon: Bell, label: 'Notices', href: '/dashboard/admin/notices' },
  { icon: BookOpen, label: 'Transport', href: '/dashboard/admin/transport' },
  { icon: BookOpen, label: 'Hostel', href: '/dashboard/admin/hostel' },
  { icon: Settings, label: 'Settings', href: '/dashboard/admin/settings' },
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const timeSlots = [
  '8:00 AM - 9:00 AM',
  '9:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 1:00 PM',
  '1:00 PM - 2:00 PM',
];

// Mock routine data
const routineData: Record<string, Array<{ subject: string; teacher: string; room: string } | null>> = {
  'Monday': [
    { subject: 'Mathematics', teacher: 'Mr. Johnson', room: '101' },
    { subject: 'English', teacher: 'Ms. Smith', room: '102' },
    { subject: 'Physics', teacher: 'Dr. Brown', room: 'Lab 1' },
    null, // Break
    { subject: 'Chemistry', teacher: 'Mrs. Davis', room: 'Lab 2' },
    { subject: 'History', teacher: 'Mr. Wilson', room: '103' },
  ],
  'Tuesday': [
    { subject: 'Biology', teacher: 'Dr. Green', room: 'Lab 3' },
    { subject: 'Mathematics', teacher: 'Mr. Johnson', room: '101' },
    { subject: 'Geography', teacher: 'Ms. Clark', room: '104' },
    null,
    { subject: 'English', teacher: 'Ms. Smith', room: '102' },
    { subject: 'Computer Science', teacher: 'Mr. Lee', room: 'Lab 4' },
  ],
  'Wednesday': [
    { subject: 'Physics', teacher: 'Dr. Brown', room: 'Lab 1' },
    { subject: 'Chemistry', teacher: 'Mrs. Davis', room: 'Lab 2' },
    { subject: 'Mathematics', teacher: 'Mr. Johnson', room: '101' },
    null,
    { subject: 'Physical Ed', teacher: 'Coach Taylor', room: 'Gym' },
    { subject: 'Art', teacher: 'Ms. White', room: 'Studio' },
  ],
  'Thursday': [
    { subject: 'English', teacher: 'Ms. Smith', room: '102' },
    { subject: 'History', teacher: 'Mr. Wilson', room: '103' },
    { subject: 'Biology', teacher: 'Dr. Green', room: 'Lab 3' },
    null,
    { subject: 'Mathematics', teacher: 'Mr. Johnson', room: '101' },
    { subject: 'Music', teacher: 'Ms. Black', room: 'Music Room' },
  ],
  'Friday': [
    { subject: 'Geography', teacher: 'Ms. Clark', room: '104' },
    { subject: 'Computer Science', teacher: 'Mr. Lee', room: 'Lab 4' },
    { subject: 'English', teacher: 'Ms. Smith', room: '102' },
    null,
    { subject: 'Mathematics', teacher: 'Mr. Johnson', room: '101' },
    { subject: 'Club Activities', teacher: 'Various', room: 'Various' },
  ],
};

export default function RoutinePage() {
  const [user, setUser] = useState<{ role: Role; firstName: string | null; lastName: string | null; school?: { name: string } | null } | null>(null);
  const [schoolName, setSchoolName] = useState<string>('SchooIi');
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('10th Grade A');

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
              <h1 className="text-2xl font-bold text-gray-800">Class Routine</h1>
              <p className="text-sm text-gray-500">Manage class schedules and timetables</p>
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
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
                <Clock className="w-4 h-4" />
                Periods
              </button>
              <Link
                href="/routine/create"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" />
                Add Schedule
              </Link>
            </div>
          </div>

          {/* Routine Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-sm text-gray-500">
                    <th className="px-4 py-4 font-medium w-32">Time</th>
                    {days.map((day) => (
                      <th key={day} className="px-4 py-4 font-medium">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((timeSlot, slotIndex) => (
                    <tr key={timeSlot} className="border-t border-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-600 bg-gray-50">
                        {timeSlot}
                      </td>
                      {days.map((day) => {
                        const slot = routineData[day][slotIndex];
                        return (
                          <td key={`${day}-${slotIndex}`} className="px-4 py-2">
                            {slot ? (
                              <div className="bg-purple-50 rounded-xl p-3">
                                <p className="font-medium text-purple-700 text-sm">{slot.subject}</p>
                                <p className="text-xs text-purple-500">{slot.teacher}</p>
                                <p className="text-xs text-gray-400 mt-1">Room {slot.room}</p>
                              </div>
                            ) : (
                              <div className="bg-gray-100 rounded-xl p-3 text-center">
                                <p className="text-sm text-gray-400">Break</p>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
