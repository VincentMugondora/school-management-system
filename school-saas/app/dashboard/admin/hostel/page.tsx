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
  Building,
  Bed,
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
  { icon: Building, label: 'Transport', href: '/dashboard/admin/transport' },
  { icon: Building, label: 'Hostel', href: '/dashboard/admin/hostel', active: true },
  { icon: Settings, label: 'Settings', href: '/dashboard/admin/settings' },
];

// Mock hostel data
const hostelBlocks = [
  { id: 1, name: 'Block A', type: 'Boys', floors: 3, rooms: 45, students: 120, warden: 'Mr. Johnson' },
  { id: 2, name: 'Block B', type: 'Boys', floors: 3, rooms: 42, students: 115, warden: 'Mr. Smith' },
  { id: 3, name: 'Block C', type: 'Girls', floors: 4, rooms: 50, students: 140, warden: 'Mrs. Davis' },
  { id: 4, name: 'Block D', type: 'Girls', floors: 3, rooms: 40, students: 98, warden: 'Ms. Wilson' },
];

const rooms = [
  { id: 1, roomNo: 'A-101', block: 'Block A', capacity: 4, occupied: 3, type: 'Standard' },
  { id: 2, roomNo: 'A-102', block: 'Block A', capacity: 4, occupied: 4, type: 'Standard' },
  { id: 3, roomNo: 'A-103', block: 'Block A', capacity: 2, occupied: 2, type: 'Deluxe' },
  { id: 4, roomNo: 'C-201', block: 'Block C', capacity: 4, occupied: 3, type: 'Standard' },
  { id: 5, roomNo: 'C-202', block: 'Block C', capacity: 2, occupied: 1, type: 'Deluxe' },
  { id: 6, roomNo: 'D-301', block: 'Block D', capacity: 4, occupied: 4, type: 'Standard' },
];

export default function HostelPage() {
  const [user, setUser] = useState<{ role: Role; firstName: string | null; lastName: string | null; school?: { name: string } | null } | null>(null);
  const [schoolName, setSchoolName] = useState<string>('SchooIi');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'blocks' | 'rooms'>('blocks');

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
              <h1 className="text-2xl font-bold text-gray-800">Hostel Management</h1>
              <p className="text-sm text-gray-500">Manage hostel blocks, rooms, and students</p>
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
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Building className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">4</p>
              <p className="text-sm text-gray-500">Hostel Blocks</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Bed className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">177</p>
              <p className="text-sm text-gray-500">Total Rooms</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Users2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">473</p>
              <p className="text-sm text-gray-500">Hostel Students</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Bed className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">23</p>
              <p className="text-sm text-gray-500">Available Beds</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setActiveTab('blocks')}
              className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                activeTab === 'blocks'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Blocks
            </button>
            <button
              onClick={() => setActiveTab('rooms')}
              className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                activeTab === 'rooms'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Rooms
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'blocks' ? (
            <div className="grid grid-cols-2 gap-6">
              {hostelBlocks.map((block) => (
                <div key={block.id} className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                        block.type === 'Boys' ? 'bg-blue-100' : 'bg-pink-100'
                      }`}>
                        <Building className={`w-7 h-7 ${
                          block.type === 'Boys' ? 'text-blue-600' : 'text-pink-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg">{block.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          block.type === 'Boys'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-pink-100 text-pink-600'
                        }`}>
                          {block.type}
                        </span>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-gray-50 rounded-lg">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-800">{block.floors}</p>
                      <p className="text-xs text-gray-500">Floors</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-800">{block.rooms}</p>
                      <p className="text-xs text-gray-500">Rooms</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-800">{block.students}</p>
                      <p className="text-xs text-gray-500">Students</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500">Warden: <span className="text-gray-700 font-medium">{block.warden}</span></p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-sm text-gray-500">
                    <th className="px-6 py-4 font-medium">Room No</th>
                    <th className="px-6 py-4 font-medium">Block</th>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Capacity</th>
                    <th className="px-6 py-4 font-medium">Occupied</th>
                    <th className="px-6 py-4 font-medium">Available</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => (
                    <tr key={room.id} className="border-t border-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Bed className="w-5 h-5 text-purple-600" />
                          </div>
                          <span className="font-medium text-gray-800">{room.roomNo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{room.block}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-medium">
                          {room.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{room.capacity}</td>
                      <td className="px-6 py-4 text-gray-600">{room.occupied}</td>
                      <td className="px-6 py-4 text-gray-600">{room.capacity - room.occupied}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          room.occupied < room.capacity
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {room.occupied < room.capacity ? 'Available' : 'Full'}
                        </span>
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
