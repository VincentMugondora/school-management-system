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
  Save,
  Star,
  ArrowLeft,
  User,
  School,
  Palette,
  Shield,
  Mail,
  BellRing,
  Database
} from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/admin' },
  { icon: Users, label: 'Students', href: '/dashboard/admin/students' },
  { icon: GraduationCap, label: 'Teachers', href: '/dashboard/admin/teachers' },
  { icon: BookOpen, label: 'Classes', href: '/dashboard/admin/classes' },
  { icon: BookOpen, label: 'Subjects', href: '/dashboard/admin/subjects' },
  { icon: BookOpen, label: 'Exams', href: '/dashboard/admin/exams' },
  { icon: Wallet, label: 'Finance', href: '/dashboard/accountant' },
  { icon: Settings, label: 'Settings', href: '/dashboard/admin/settings', active: true },
];

const settingSections = [
  { id: 'general', label: 'General', icon: School },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: BellRing },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'database', label: 'Database', icon: Database },
];

export default function SettingsPage() {
  const [user, setUser] = useState<{ role: Role; firstName: string | null; lastName: string | null } | null>(null);
  const [activeSection, setActiveSection] = useState('general');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const userResult = await getCurrentUserProfile();
      if (userResult.success) {
        setUser(userResult.data);
      }
    } catch (err) {
      console.error('Failed to load data');
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
          <span className="text-xl font-bold text-gray-800">SchooIi</span>
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
            <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
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
          <div className="flex gap-8">
            {/* Settings Navigation */}
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {settingSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-6 py-4 text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-purple-50 text-purple-600 border-l-4 border-purple-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <section.icon className="w-5 h-5" />
                    <span className="font-medium">{section.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Settings Content */}
            <div className="flex-1">
              <div className="bg-white rounded-2xl shadow-sm p-8">
                {activeSection === 'general' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-6">General Settings</h2>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">School Name</label>
                        <input
                          type="text"
                          defaultValue="SchooIi Academy"
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-purple-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <input
                          type="email"
                          defaultValue="admin@schooIi.edu"
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-purple-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                        <input
                          type="tel"
                          defaultValue="+1 234 567 890"
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-purple-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <textarea
                          rows={3}
                          defaultValue="123 Education Street, Learning City, ED 12345"
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-purple-100"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === 'profile' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Profile Settings</h2>
                    <div className="flex items-center gap-6 mb-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-2xl font-semibold">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </div>
                      <div>
                        <button className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700">
                          Change Avatar
                        </button>
                        <p className="text-sm text-gray-500 mt-2">JPG, GIF or PNG. Max size 2MB</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                        <input
                          type="text"
                          defaultValue={user.firstName || ''}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-purple-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                        <input
                          type="text"
                          defaultValue={user.lastName || ''}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-purple-100"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === 'appearance' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Appearance</h2>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
                        <div className="flex gap-4">
                          <button className="px-6 py-3 bg-purple-600 text-white rounded-xl text-sm font-medium">
                            Light
                          </button>
                          <button className="px-6 py-3 bg-gray-200 text-gray-600 rounded-xl text-sm font-medium">
                            Dark
                          </button>
                          <button className="px-6 py-3 bg-gray-200 text-gray-600 rounded-xl text-sm font-medium">
                            System
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Accent Color</label>
                        <div className="flex gap-3">
                          <button className="w-10 h-10 rounded-full bg-purple-600 ring-2 ring-offset-2 ring-purple-600"></button>
                          <button className="w-10 h-10 rounded-full bg-blue-600"></button>
                          <button className="w-10 h-10 rounded-full bg-green-600"></button>
                          <button className="w-10 h-10 rounded-full bg-red-600"></button>
                          <button className="w-10 h-10 rounded-full bg-orange-600"></button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === 'notifications' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Notifications</h2>
                    <div className="space-y-4">
                      {[
                        { label: 'Email Notifications', desc: 'Receive email updates about your account' },
                        { label: 'Push Notifications', desc: 'Receive push notifications in browser' },
                        { label: 'Exam Alerts', desc: 'Get notified when exams are scheduled' },
                        { label: 'New Student Registration', desc: 'Get notified when new students register' },
                        { label: 'Payment Reminders', desc: 'Get notified about upcoming payments' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                          <div>
                            <p className="font-medium text-gray-800">{item.label}</p>
                            <p className="text-sm text-gray-500">{item.desc}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeSection === 'security' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Security</h2>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                        <input
                          type="password"
                          placeholder="Enter current password"
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-purple-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                        <input
                          type="password"
                          placeholder="Enter new password"
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-purple-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                        <input
                          type="password"
                          placeholder="Confirm new password"
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-purple-100"
                        />
                      </div>
                      <div className="pt-4 border-t border-gray-100">
                        <h3 className="font-medium text-gray-800 mb-3">Two-Factor Authentication</h3>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-500">Add an extra layer of security</p>
                          <button className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700">
                            Enable 2FA
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === 'database' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Database</h2>
                    <div className="space-y-6">
                      <div className="p-6 bg-gray-50 rounded-xl">
                        <h3 className="font-medium text-gray-800 mb-2">Backup Database</h3>
                        <p className="text-sm text-gray-500 mb-4">Download a backup of all your data</p>
                        <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
                          Download Backup
                        </button>
                      </div>
                      <div className="p-6 bg-red-50 rounded-xl border border-red-100">
                        <h3 className="font-medium text-red-800 mb-2">Danger Zone</h3>
                        <p className="text-sm text-red-600 mb-4">These actions are irreversible</p>
                        <div className="flex gap-4">
                          <button className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50">
                            Reset Data
                          </button>
                          <button className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
                            Delete Account
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-gray-100">
                  <button className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700">
                    <Save className="w-4 h-4" />
                    Save Changes
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
