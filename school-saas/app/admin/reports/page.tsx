import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Plus, Users, BarChart3, FileDown, Printer, Calendar } from 'lucide-react';

export default async function ReportsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-500 mt-1">Generate and export school reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Academic Reports */}
        <Link href="/admin/reports/academic" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Academic Reports</h3>
          <p className="text-sm text-gray-500 mt-2">Class performance, subject analysis, grade distributions</p>
        </Link>

        {/* Attendance Reports */}
        <Link href="/admin/reports/attendance" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Attendance Reports</h3>
          <p className="text-sm text-gray-500 mt-2">Daily, weekly, monthly attendance summaries</p>
        </Link>

        {/* Finance Reports */}
        <Link href="/admin/reports/finance" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
            <FileDown className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Finance Reports</h3>
          <p className="text-sm text-gray-500 mt-2">Fee collection, outstanding payments, revenue</p>
        </Link>

        {/* Student Reports */}
        <Link href="/admin/reports/students" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Student Reports</h3>
          <p className="text-sm text-gray-500 mt-2">Enrollment, demographics, performance</p>
        </Link>

        {/* End of Term Reports */}
        <Link href="/admin/reports/end-of-term" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
            <Printer className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">End of Term Reports</h3>
          <p className="text-sm text-gray-500 mt-2">Report cards, class summaries, transcripts</p>
        </Link>

        {/* Custom Reports */}
        <Link href="/admin/reports/custom" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
            <BarChart3 className="w-6 h-6 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Custom Reports</h3>
          <p className="text-sm text-gray-500 mt-2">Build custom queries and exports</p>
        </Link>
      </div>
    </div>
  );
}
