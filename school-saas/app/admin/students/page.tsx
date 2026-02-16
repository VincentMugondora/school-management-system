import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Plus, Users, GraduationCap, ChevronRight } from 'lucide-react';

export default async function StudentsPage() {
  const students = await prisma.student.findMany({
    include: {
      user: true,
      class: true,
      enrollments: {
        where: { status: 'ACTIVE' },
        include: { class: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Students</h1>
          <p className="text-gray-500 mt-1">Manage student records and enrollments</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/students/import"
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Import CSV
          </Link>
          <Link
            href="/admin/students/new"
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Student
          </Link>
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
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link href={`/admin/students/${student.id}`} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-purple-600">
                        {student.user.firstName?.[0]}{student.user.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{student.user.firstName} {student.user.lastName}</p>
                      <p className="text-sm text-gray-500">{student.user.email}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">
                    {student.enrollments[0]?.class?.name || 'Not enrolled'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(student.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {students.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">No Students</h3>
            <p className="text-gray-500 mt-1">Add your first student to get started</p>
            <Link
              href="/admin/students/new"
              className="inline-flex items-center gap-2 mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Student
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
