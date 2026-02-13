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
  BookMarked,
  ArrowLeft,
  Star,
} from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/admin' },
  { icon: Users, label: 'Students', href: '/dashboard/admin/students' },
  { icon: GraduationCap, label: 'Teachers', href: '/dashboard/admin/teachers' },
  { icon: BookOpen, label: 'Library', href: '/dashboard/admin/library', active: true },
  { icon: Wallet, label: 'Finance', href: '/dashboard/accountant' },
  { icon: BookOpen, label: 'Classes', href: '/dashboard/admin/classes' },
  { icon: BookOpen, label: 'Subjects', href: '/dashboard/admin/subjects' },
  { icon: Clock, label: 'Routine', href: '/dashboard/admin/routine' },
  { icon: Calendar, label: 'Attendance', href: '/dashboard/admin/attendance' },
  { icon: BookOpen, label: 'Exams', href: '/dashboard/admin/exams' },
  { icon: Bell, label: 'Notices', href: '/dashboard/admin/notices' },
  { icon: BookOpen, label: 'Transport', href: '/dashboard/admin/transport' },
  { icon: BookOpen, label: 'Hostel', href: '/dashboard/admin/hostel' },
  { icon: Settings, label: 'Settings', href: '/dashboard/admin/settings' },
];

// Mock books data
const books = [
  { id: 1, title: 'Mathematics Grade 10', author: 'John Smith', isbn: '978-3-16-148410-0', copies: 25, available: 18, category: 'Mathematics' },
  { id: 2, title: 'Advanced Physics', author: 'Albert Einstein', isbn: '978-3-16-148411-7', copies: 15, available: 12, category: 'Science' },
  { id: 3, title: 'English Literature', author: 'Jane Austen', isbn: '978-3-16-148412-4', copies: 30, available: 25, category: 'Literature' },
  { id: 4, title: 'Chemistry Basics', author: 'Marie Curie', isbn: '978-3-16-148413-1', copies: 20, available: 15, category: 'Science' },
  { id: 5, title: 'History of the World', author: 'Howard Zinn', isbn: '978-3-16-148414-8', copies: 12, available: 8, category: 'History' },
  { id: 6, title: 'Computer Science Fundamentals', author: 'Alan Turing', isbn: '978-3-16-148415-5', copies: 18, available: 14, category: 'Technology' },
];

export default function LibraryPage() {
  const [user, setUser] = useState<{ role: Role; firstName: string | null; lastName: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

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
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search books..."
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
              <h1 className="text-2xl font-bold text-gray-800 mb-1">Library Management</h1>
              <p className="text-gray-500">Manage books and library resources</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
                <BookMarked className="w-4 h-4" />
                Categories
              </button>
              <Link
                href="/library/books/create"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" />
                Add Book
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">1,245</p>
              <p className="text-sm text-gray-500">Total Books</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <BookMarked className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">892</p>
              <p className="text-sm text-gray-500">Available</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">153</p>
              <p className="text-sm text-gray-500">Issued</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <Bell className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">23</p>
              <p className="text-sm text-gray-500">Overdue</p>
            </div>
          </div>

          {/* Books Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-6 py-4 font-medium">Book</th>
                  <th className="px-6 py-4 font-medium">Author</th>
                  <th className="px-6 py-4 font-medium">ISBN</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Loading books...
                    </td>
                  </tr>
                ) : (
                  books.map((book) => (
                    <tr key={book.id} className="border-t border-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{book.title}</p>
                            <p className="text-sm text-gray-500">{book.copies} copies</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{book.author}</td>
                      <td className="px-6 py-4 text-gray-600">{book.isbn}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-medium">
                          {book.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          book.available > 5
                            ? 'bg-green-100 text-green-600'
                            : book.available > 0
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {book.available > 0 ? `${book.available} Available` : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="p-2 hover:bg-gray-50 rounded-lg">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
