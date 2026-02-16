'use client';

import Link from 'next/link';
import { Student, Gender, Prisma } from '@prisma/client';
import { Eye, Edit, Trash2, GraduationCap } from 'lucide-react';

type StudentWithRelations = Prisma.StudentGetPayload<{
  include: {
    parent: {
      select: {
        user: {
          select: {
            firstName: true;
            lastName: true;
            email: true;
          };
        };
      };
    };
    enrollments: {
      include: {
        class: {
          select: { id: true; name: true; grade: true };
        };
        academicYear: {
          select: { id: true; name: true };
        };
      };
    };
    _count: {
      select: { enrollments: true };
    };
  };
}>;

interface StudentTableProps {
  students: StudentWithRelations[];
}

export function StudentTable({ students }: StudentTableProps) {
  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No Students Found</h3>
        <p className="text-gray-500 mt-1">
          Try adjusting your search or filters
        </p>
        <Link
          href="/admin/students/new"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Add Student
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Student
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Admission #
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Gender
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Current Class
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Parent/Guardian
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Status
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {students.map((student) => {
              const activeEnrollment = student.enrollments[0];
              return (
                <tr
                  key={student.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-purple-700">
                          {student.firstName[0]}
                          {student.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {student.firstName} {student.lastName}
                        </p>
                        {student.email && (
                          <p className="text-sm text-gray-500">{student.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {student.studentId || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {student.gender || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {activeEnrollment ? (
                      <span>
                        {activeEnrollment.class.name} (Grade{' '}
                        {activeEnrollment.class.grade})
                      </span>
                    ) : (
                      <span className="text-gray-400">Not enrolled</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {student.parent ? (
                      <div>
                        <p>
                          {student.parent.user.firstName}{' '}
                          {student.parent.user.lastName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {student.parent.user.email}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        activeEnrollment
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {activeEnrollment ? 'Enrolled' : 'Not Enrolled'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="View student"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/admin/students/${student.id}/edit`}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit student"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
