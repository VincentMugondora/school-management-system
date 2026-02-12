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

interface DashboardStats {
  totalSchools: number;
  totalTeachers: number;
  totalStudents: number;
  totalInvoiced: number;
  totalPaid: number;
  activeAcademicYears: number;
  activeTerms: number;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<{ role: Role; firstName: string | null; lastName: string | null } | null>(null);
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
      <div className="p-6">
        <div className="text-center text-red-600">
          Access Denied. Only administrators can access this dashboard.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">
          Welcome, {user.firstName} {user.lastName}
        </p>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-6">
          {error}
        </div>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.totalSchools}</div>
            <div className="text-sm text-gray-600">Schools</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-green-600">{stats.totalTeachers}</div>
            <div className="text-sm text-gray-600">Teachers</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-purple-600">{stats.totalStudents}</div>
            <div className="text-sm text-gray-600">Students</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-orange-600">
              ${stats.totalInvoiced.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Invoiced</div>
          </div>
          <div className="bg-teal-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-teal-600">
              ${stats.totalPaid.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Paid</div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-indigo-600">{stats.activeAcademicYears}</div>
            <div className="text-sm text-gray-600">Active Years</div>
          </div>
          <div className="bg-pink-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-pink-600">{stats.activeTerms}</div>
            <div className="text-sm text-gray-600">Active Terms</div>
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* School Management */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2 text-blue-600">S</span>
            School Management
          </h2>
          <ul className="space-y-2">
            <li>
              <Link href="/schools" className="text-blue-600 hover:underline">
                View All Schools
              </Link>
            </li>
            <li>
              <Link href="/schools/create" className="text-blue-600 hover:underline">
                Create New School
              </Link>
            </li>
            <li>
              <Link href="/dashboard/admin/settings" className="text-blue-600 hover:underline">
                School Settings
              </Link>
            </li>
          </ul>
        </div>

        {/* User Management */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2 text-green-600">U</span>
            User Management
          </h2>
          <ul className="space-y-2">
            <li>
              <Link href="/users" className="text-blue-600 hover:underline">
                Manage Users
              </Link>
            </li>
            <li>
              <Link href="/teachers" className="text-blue-600 hover:underline">
                Manage Teachers
              </Link>
            </li>
            <li>
              <Link href="/dashboard/admin/teacher-assignments" className="text-blue-600 hover:underline">
                Teacher Assignments
              </Link>
            </li>
          </ul>
        </div>

        {/* Student Management */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-2 text-purple-600">St</span>
            Student Management
          </h2>
          <ul className="space-y-2">
            <li>
              <Link href="/students" className="text-blue-600 hover:underline">
                View All Students
              </Link>
            </li>
            <li>
              <Link href="/students/enrollments" className="text-blue-600 hover:underline">
                Manage Enrollments
              </Link>
            </li>
            <li>
              <Link href="/students/promote" className="text-blue-600 hover:underline">
                Promote Students
              </Link>
            </li>
          </ul>
        </div>

        {/* Academic Management */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-2 text-indigo-600">A</span>
            Academic Management
          </h2>
          <ul className="space-y-2">
            <li>
              <Link href="/academics/years" className="text-blue-600 hover:underline">
                Academic Years
              </Link>
            </li>
            <li>
              <Link href="/academics/terms" className="text-blue-600 hover:underline">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/classes" className="text-blue-600 hover:underline">
                Classes
              </Link>
            </li>
            <li>
              <Link href="/subjects" className="text-blue-600 hover:underline">
                Subjects
              </Link>
            </li>
          </ul>
        </div>

        {/* Finance */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-2 text-orange-600">F</span>
            Finance
          </h2>
          <ul className="space-y-2">
            <li>
              <Link href="/dashboard/accountant" className="text-blue-600 hover:underline">
                Finance Dashboard
              </Link>
            </li>
            <li>
              <Link href="/invoices" className="text-blue-600 hover:underline">
                Manage Invoices
              </Link>
            </li>
            <li>
              <Link href="/payments" className="text-blue-600 hover:underline">
                View Payments
              </Link>
            </li>
          </ul>
        </div>

        {/* Exams & Results */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center mr-2 text-teal-600">E</span>
            Exams & Results
          </h2>
          <ul className="space-y-2">
            <li>
              <Link href="/exams" className="text-blue-600 hover:underline">
                Manage Exams
              </Link>
            </li>
            <li>
              <Link href="/results" className="text-blue-600 hover:underline">
                View All Results
              </Link>
            </li>
            <li>
              <Link href="/results/reports" className="text-blue-600 hover:underline">
                Generate Reports
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">System Overview</h2>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Collection Rate</span>
              <span className="font-medium">
                {stats && stats.totalInvoiced > 0
                  ? ((stats.totalPaid / stats.totalInvoiced) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Students per Teacher</span>
              <span className="font-medium">
                {stats && stats.totalTeachers > 0
                  ? (stats.totalStudents / stats.totalTeachers).toFixed(1)
                  : 0}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Active Academic Periods</span>
              <span className="font-medium">{stats?.activeAcademicYears || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/students/create"
              className="p-3 bg-purple-50 rounded text-center text-purple-700 hover:bg-purple-100"
            >
              Add Student
            </Link>
            <Link
              href="/teachers/create"
              className="p-3 bg-green-50 rounded text-center text-green-700 hover:bg-green-100"
            >
              Add Teacher
            </Link>
            <Link
              href="/exams/create"
              className="p-3 bg-teal-50 rounded text-center text-teal-700 hover:bg-teal-100"
            >
              Create Exam
            </Link>
            <Link
              href="/invoices/generate"
              className="p-3 bg-orange-50 rounded text-center text-orange-700 hover:bg-orange-100"
            >
              Generate Invoices
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
