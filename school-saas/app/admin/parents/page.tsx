import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Plus, Users, UserCog, ChevronRight, Mail, Phone } from 'lucide-react';

export default async function ParentsPage() {
  const parents = await prisma.parent.findMany({
    include: {
      _count: {
        select: { students: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Parents & Guardians</h1>
          <p className="text-gray-500 mt-1">Manage parent records and student links</p>
        </div>
        <Link
          href="/admin/parents/new"
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Parent
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Parent/Guardian</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Contact</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Linked Students</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Occupation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {parents.map((parent) => (
              <tr key={parent.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link href={`/admin/parents/${parent.id}`} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <UserCog className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{parent.firstName} {parent.lastName}</p>
                      <p className="text-sm text-gray-500 capitalize">{parent.relationship.toLowerCase()}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600">{parent.email}</div>
                  {parent.phone && <div className="text-sm text-gray-500">{parent.phone}</div>}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {parent._count.students} students
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {parent.occupation || 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {parents.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">No Parents</h3>
            <p className="text-gray-500 mt-1">Add your first parent record to get started</p>
            <Link
              href="/admin/parents/new"
              className="inline-flex items-center gap-2 mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Parent
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
