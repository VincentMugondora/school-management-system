import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Plus, Users, GraduationCap, ChevronRight, Mail, Phone } from 'lucide-react';

export default async function StaffPage() {
  const teachers = await prisma.teacher.findMany({
    include: {
      user: true,
      _count: {
        select: { classes: true, subjects: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Staff</h1>
          <p className="text-gray-500 mt-1">Manage teachers and staff members</p>
        </div>
        <Link
          href="/admin/staff/new"
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Staff
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.map((teacher) => (
          <Link
            key={teacher.id}
            href={`/admin/staff/${teacher.id}`}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-800">
              {teacher.user.firstName} {teacher.user.lastName}
            </h3>
            <p className="text-sm text-gray-500">{teacher.specialization || 'No specialization'}</p>
            
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{teacher.user.email}</span>
              </div>
              {teacher.employeeId && (
                <div className="text-sm text-gray-600">
                  ID: {teacher.employeeId}
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-purple-600">{teacher._count.classes} classes</span>
                <span className="text-blue-600">{teacher._count.subjects} subjects</span>
              </div>
            </div>
          </Link>
        ))}

        {teachers.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-100">
            <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">No Staff</h3>
            <p className="text-gray-500 mt-1">Add your first staff member to get started</p>
            <Link
              href="/admin/staff/new"
              className="inline-flex items-center gap-2 mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Staff
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
