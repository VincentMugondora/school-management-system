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
  MoreVertical,
  Bus,
  MapPin,
  Users2,
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
  { icon: Users, label: 'Attendance', href: '/dashboard/admin/attendance' },
  { icon: BookOpen, label: 'Exams', href: '/dashboard/admin/exams' },
  { icon: Bell, label: 'Notices', href: '/dashboard/admin/notices' },
  { icon: Bus, label: 'Transport', href: '/dashboard/admin/transport', active: true },
  { icon: BookOpen, label: 'Hostel', href: '/dashboard/admin/hostel' },
  { icon: Settings, label: 'Settings', href: '/dashboard/admin/settings' },
];

// Mock transport data
const buses = [
  { id: 1, number: 'BUS-001', route: 'Downtown - School', driver: 'John Smith', capacity: 40, students: 35, status: 'active' },
  { id: 2, number: 'BUS-002', route: 'Northside - School', driver: 'Mike Johnson', capacity: 40, students: 38, status: 'active' },
  { id: 3, number: 'BUS-003', route: 'Eastside - School', driver: 'Sarah Williams', capacity: 35, students: 30, status: 'maintenance' },
  { id: 4, number: 'BUS-004', route: 'Westside - School', driver: 'David Brown', capacity: 40, students: 42, status: 'active' },
  { id: 5, number: 'BUS-005', route: 'Southside - School', driver: 'Lisa Davis', capacity: 40, students: 28, status: 'active' },
];

const routes = [
  { id: 1, name: 'Downtown Route', stops: 12, startTime: '6:30 AM', endTime: '8:00 AM', students: 35 },
  { id: 2, name: 'Northside Route', stops: 8, startTime: '6:45 AM', endTime: '8:00 AM', students: 38 },
  { id: 3, name: 'Eastside Route', stops: 10, startTime: '6:30 AM', endTime: '8:00 AM', students: 30 },
  { id: 4, name: 'Westside Route', stops: 15, startTime: '6:15 AM', endTime: '8:00 AM', students: 42 },
  { id: 5, name: 'Southside Route', stops: 9, startTime: '6:45 AM', endTime: '8:00 AM', students: 28 },
];

export default function TransportPage() {
  const [user, setUser] = useState<{ role: Role; firstName: string | null; lastName: string | null; school?: { name: string } | null } | null>(null);
  const [schoolName, setSchoolName] = useState<string>('SchooIi');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'buses' | 'routes'>('buses');

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
              <h1 className="text-2xl font-bold text-gray-800">Transport Management</h1>
              <p className="text-sm text-gray-500">Manage school buses and routes</p>
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
          {/* Stats */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Bus className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">5</p>
              <p className="text-sm text-gray-500">Total Buses</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">5</p>
              <p className="text-sm text-gray-500">Active Routes</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users2 className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">173</p>
              <p className="text-sm text-gray-500">Students Using Transport</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Bus className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">1</p>
              <p className="text-sm text-gray-500">In Maintenance</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setActiveTab('buses')}
              className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                activeTab === 'buses'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Buses
            </button>
            <button
              onClick={() => setActiveTab('routes')}
              className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                activeTab === 'routes'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Routes
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'buses' ? (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-sm text-gray-500">
                    <th className="px-6 py-4 font-medium">Bus Number</th>
                    <th className="px-6 py-4 font-medium">Route</th>
                    <th className="px-6 py-4 font-medium">Driver</th>
                    <th className="px-6 py-4 font-medium">Capacity</th>
                    <th className="px-6 py-4 font-medium">Students</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {buses.map((bus) => (
                    <tr key={bus.id} className="border-t border-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Bus className="w-5 h-5 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-800">{bus.number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{bus.route}</td>
                      <td className="px-6 py-4 text-gray-600">{bus.driver}</td>
                      <td className="px-6 py-4 text-gray-600">{bus.capacity}</td>
                      <td className="px-6 py-4 text-gray-600">{bus.students}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          bus.status === 'active'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-yellow-100 text-yellow-600'
                        }`}>
                          {bus.status.charAt(0).toUpperCase() + bus.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="p-2 hover:bg-gray-50 rounded-lg">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-sm text-gray-500">
                    <th className="px-6 py-4 font-medium">Route Name</th>
                    <th className="px-6 py-4 font-medium">Stops</th>
                    <th className="px-6 py-4 font-medium">Start Time</th>
                    <th className="px-6 py-4 font-medium">End Time</th>
                    <th className="px-6 py-4 font-medium">Students</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route) => (
                    <tr key={route.id} className="border-t border-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-green-600" />
                          </div>
                          <span className="font-medium text-gray-800">{route.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{route.stops} stops</td>
                      <td className="px-6 py-4 text-gray-600">{route.startTime}</td>
                      <td className="px-6 py-4 text-gray-600">{route.endTime}</td>
                      <td className="px-6 py-4 text-gray-600">{route.students}</td>
                      <td className="px-6 py-4">
                        <button className="p-2 hover:bg-gray-50 rounded-lg">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
