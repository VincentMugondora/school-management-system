import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Plus, Calendar, CheckCircle, XCircle, AlertCircle, TrendingUp } from 'lucide-react';

export default async function AttendancePage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [classes, todayStats] = await Promise.all([
    prisma.class.findMany({
      include: {
        _count: { select: { enrollments: true } }
      },
      orderBy: { name: 'asc' }
    }),
    prisma.attendance.groupBy({
      by: ['isPresent'],
      where: {
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      },
      _count: true
    })
  ]);

  const presentCount = todayStats.find(s => s.isPresent)?._count || 0;
  const absentCount = todayStats.find(s => !s.isPresent)?._count || 0;
  const totalMarked = presentCount + absentCount;
  const attendanceRate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Attendance</h1>
          <p className="text-gray-500 mt-1">Monitor and manage student attendance</p>
        </div>
        <Link
          href="/admin/attendance/mark"
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Mark Attendance
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-green-50 rounded-xl p-6 border border-green-100">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">Present Today</span>
          </div>
          <p className="text-3xl font-bold text-green-900">{presentCount}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-6 border border-red-100">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-700">Absent Today</span>
          </div>
          <p className="text-3xl font-bold text-red-900">{absentCount}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Attendance Rate</span>
          </div>
          <p className="text-3xl font-bold text-blue-900">{attendanceRate}%</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-100">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">Not Marked</span>
          </div>
          <p className="text-3xl font-bold text-yellow-900">
            {classes.reduce((acc, c) => acc + c._count.enrollments, 0) - totalMarked}
          </p>
        </div>
      </div>

      {/* Classes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Class Attendance</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Class</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Students</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {classes.map((cls) => (
              <tr key={cls.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{cls.name}</p>
                      <p className="text-sm text-gray-500">Grade {cls.grade}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {cls._count.enrollments} students
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                    Pending
                  </span>
                </td>
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/attendance/class/${cls.id}`}
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                  >
                    Mark →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
