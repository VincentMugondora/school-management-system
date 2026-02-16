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
  Plus,
  FileText,
  Award,
  Calendar,
  CheckCircle,
  Loader2,
  GraduationCap as SchoolIcon
} from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/admin' },
  { icon: Users, label: 'Students', href: '/dashboard/admin/students' },
  { icon: GraduationCap, label: 'Teachers', href: '/dashboard/admin/teachers' },
  { icon: BookOpen, label: 'Classes', href: '/dashboard/admin/classes' },
  { icon: Calendar, label: 'Academic Years', href: '/dashboard/admin/academic-years', active: true },
  { icon: FileText, label: 'Subjects', href: '/dashboard/admin/subjects' },
  { icon: Award, label: 'Exams', href: '/dashboard/admin/exams' },
  { icon: Wallet, label: 'Finance', href: '/dashboard/accountant' },
  { icon: Settings, label: 'Settings', href: '/dashboard/admin/settings' },
];

const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100";

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: string;
}

export default function AcademicYearsPage() {
  const [user, setUser] = useState<{ role: Role; firstName: string | null; lastName: string | null; school?: { name: string } | null } | null>(null);
  const [schoolName, setSchoolName] = useState<string>('SchooIi');
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
  });

  const fetchYears = async () => {
    try {
      const res = await fetch('/api/admin/academic-years');
      const data = await res.json();
      if (data.success) {
        setYears(data.years);
      }
    } catch {
      setError('Failed to fetch academic years');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchYears();
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
      console.error('Failed to load user data');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowForm(false);
        setForm({ name: '', startDate: '', endDate: '', isCurrent: false });
        fetchYears();
      } else {
        setError(data.error || 'Failed to create academic year');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const setAsCurrent = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/academic-years/${id}/set-current`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchYears();
      }
    } catch {
      setError('Failed to set as current');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7FC] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white h-screen fixed left-0 top-0 border-r border-gray-100 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
            <SchoolIcon className="w-6 h-6 text-white" />
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
          <h1 className="text-xl font-semibold text-gray-800">Academic Years</h1>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-xl">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">Manage academic years for your school</p>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" />
            Add Academic Year
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm mb-6 space-y-4">
            <h2 className="font-semibold text-gray-800 mb-4">Create New Academic Year</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., 2026 Academic Year"
                  className={inputClass}
                  required
                />
              </div>
              <div className="flex items-center gap-2 pt-8">
                <input
                  type="checkbox"
                  id="isCurrent"
                  checked={form.isCurrent}
                  onChange={e => setForm(f => ({ ...f, isCurrent: e.target.checked }))}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <label htmlFor="isCurrent" className="text-sm text-gray-700">
                  Set as current academic year
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  className={inputClass}
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Academic Year
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : years.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-1">No academic years yet</h3>
            <p className="text-gray-500 mb-4">Create your first academic year to start managing classes</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Add Academic Year
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {years.map(year => (
                  <tr key={year.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">{year.name}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(year.startDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(year.endDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      {year.isCurrent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Current
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {!year.isCurrent && (
                        <button
                          onClick={() => setAsCurrent(year.id)}
                          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          Set as Current
                        </button>
                      )}
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
