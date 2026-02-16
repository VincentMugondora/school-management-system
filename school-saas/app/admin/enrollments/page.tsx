import { prisma } from '@/lib/db';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export default async function EnrollmentsPage() {
  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true }
  });

  const enrollments = await prisma.enrollment.findMany({
    where: currentYear ? { academicYearId: currentYear.id } : {},
    include: {
      student: true,
      class: true
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Enrollments</h1>
          <p className="text-gray-500 mt-1">
            {currentYear ? `Current: ${currentYear.name}` : 'No active academic year'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/enrollments/promotions"
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowUpRight className="w-5 h-5" />
            Promotions
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
          <h3 className="text-sm font-medium text-blue-700 mb-2">Total Enrolled</h3>
          <p className="text-3xl font-bold text-blue-900">{enrollments.length}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-6 border border-green-100">
          <h3 className="text-sm font-medium text-green-700 mb-2">Active</h3>
          <p className="text-3xl font-bold text-green-900">
            {enrollments.filter(e => e.status === 'ACTIVE').length}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-100">
          <h3 className="text-sm font-medium text-yellow-700 mb-2">Completed</h3>
          <p className="text-3xl font-bold text-yellow-900">
            {enrollments.filter(e => e.status === 'COMPLETE').length}
          </p>
        </div>
        <div className="bg-red-50 rounded-xl p-6 border border-red-100">
          <h3 className="text-sm font-medium text-red-700 mb-2">Dropped</h3>
          <p className="text-3xl font-bold text-red-900">
            {enrollments.filter(e => e.status === 'DROPPED').length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Student</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Class</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Enrollment Date</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {enrollments.map((enrollment) => (
              <tr key={enrollment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-purple-600">
                        {enrollment.student.firstName?.[0]}{enrollment.student.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {enrollment.student.firstName} {enrollment.student.lastName}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {enrollment.class?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    enrollment.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                    enrollment.status === 'COMPLETE' ? 'bg-blue-100 text-blue-700' :
                    enrollment.status === 'DROPPED' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {enrollment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
