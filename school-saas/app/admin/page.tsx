import { prisma } from '@/lib/db';
import { 
  Users, 
  GraduationCap,
  Calendar,
  TrendingUp,
  AlertCircle,
  DollarSign,
  School
} from 'lucide-react';
import Link from 'next/link';

async function getDashboardData() {
  const [
    totalStudents,
    totalTeachers,
    totalClasses,
    currentAcademicYear,
    todayAttendance,
    outstandingFees,
    recentAlerts
  ] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.class.count(),
    prisma.academicYear.findFirst({
      where: { isCurrent: true },
      include: { terms: true }
    }),
    prisma.attendance.findMany({
      where: {
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      },
      select: { isPresent: true }
    }),
    prisma.invoice.aggregate({
      where: { status: { not: 'PAID' } },
      _sum: { amount: true }
    }),
    prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: true }
    })
  ]);

  const presentToday = todayAttendance.filter(a => a.isPresent).length;
  const attendanceRate = todayAttendance.length > 0 
    ? Math.round((presentToday / todayAttendance.length) * 100) 
    : 0;

  return {
    totalStudents,
    totalTeachers,
    totalClasses,
    currentAcademicYear,
    attendanceRate,
    outstandingFees: outstandingFees._sum.amount || 0,
    recentAlerts
  };
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  const stats = [
    { 
      label: 'Total Students', 
      value: data.totalStudents, 
      icon: Users, 
      href: '/admin/students',
      color: 'bg-blue-500',
      change: '+12%'
    },
    { 
      label: 'Total Teachers', 
      value: data.totalTeachers, 
      icon: GraduationCap, 
      href: '/admin/staff',
      color: 'bg-green-500',
      change: '+3%'
    },
    { 
      label: 'Classes', 
      value: data.totalClasses, 
      icon: School, 
      href: '/admin/classes',
      color: 'bg-purple-500',
      change: '0%'
    },
    { 
      label: 'Attendance Today', 
      value: `${data.attendanceRate}%`, 
      icon: Calendar, 
      href: '/admin/attendance',
      color: 'bg-orange-500',
      change: '-2%'
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">School Dashboard</h1>
        <p className="text-gray-500 mt-1">
          {data.currentAcademicYear 
            ? `${data.currentAcademicYear.name} - ${data.currentAcademicYear.terms.find(t => !t.isLocked)?.name || 'No active term'}`
            : 'No active academic year'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Link 
            key={stat.label} 
            href={stat.href}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500">{stat.change}</span>
              <span className="text-gray-400 ml-1">vs last month</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link 
                href="/admin/students/new"
                className="flex flex-col items-center p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <Users className="w-8 h-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-blue-700">Add Student</span>
              </Link>
              <Link 
                href="/admin/staff/new"
                className="flex flex-col items-center p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
              >
                <GraduationCap className="w-8 h-8 text-green-600 mb-2" />
                <span className="text-sm font-medium text-green-700">Add Teacher</span>
              </Link>
              <Link 
                href="/admin/classes/new"
                className="flex flex-col items-center p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
              >
                <School className="w-8 h-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium text-purple-700">Add Class</span>
              </Link>
              <Link 
                href="/admin/finance/invoices"
                className="flex flex-col items-center p-4 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors"
              >
                <DollarSign className="w-8 h-8 text-orange-600 mb-2" />
                <span className="text-sm font-medium text-orange-700">Fee Invoice</span>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {data.recentAlerts.map((log, index) => (
                <div key={index} className="flex items-start gap-3 pb-4 border-b border-gray-50 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{log.action}</p>
                    <p className="text-xs text-gray-400">
                      {log.user?.firstName} {log.user?.lastName} • {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {data.recentAlerts.length === 0 && (
                <p className="text-sm text-gray-400">No recent activity</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Alerts */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">System Alerts</h2>
            <div className="space-y-3">
              {data.outstandingFees > 0 && (
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-red-700">Outstanding Fees</p>
                    <p className="text-xs text-red-600">${data.outstandingFees.toLocaleString()} unpaid</p>
                  </div>
                </div>
              )}
              {!data.currentAcademicYear && (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium text-yellow-700">No Active Year</p>
                    <p className="text-xs text-yellow-600">Set up academic year</p>
                  </div>
                </div>
              )}
              {data.attendanceRate < 80 && (
                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-orange-700">Low Attendance</p>
                    <p className="text-xs text-orange-600">{data.attendanceRate}% today</p>
                  </div>
                </div>
              )}
              {data.outstandingFees === 0 && data.currentAcademicYear && data.attendanceRate >= 80 && (
                <p className="text-sm text-gray-400">All systems operational</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Links</h2>
            <div className="space-y-2">
              <Link href="/admin/enrollments/promotions" className="block p-3 hover:bg-gray-50 rounded-lg text-sm text-gray-700">
                Student Promotion
              </Link>
              <Link href="/admin/reports" className="block p-3 hover:bg-gray-50 rounded-lg text-sm text-gray-700">
                Generate Reports
              </Link>
              <Link href="/admin/audit/logs" className="block p-3 hover:bg-gray-50 rounded-lg text-sm text-gray-700">
                View Audit Logs
              </Link>
              <Link href="/admin/settings" className="block p-3 hover:bg-gray-50 rounded-lg text-sm text-gray-700">
                System Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
