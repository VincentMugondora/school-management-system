import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Plus, BookOpen, GraduationCap, ChevronRight } from 'lucide-react';

export default async function SubjectsPage() {
  const subjects = await prisma.subject.findMany({
    include: {
      _count: {
        select: { teachers: true, exams: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Subjects</h1>
          <p className="text-gray-500 mt-1">Manage subjects and assignments</p>
        </div>
        <Link
          href="/admin/subjects/new"
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Subject
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {subjects.map((subject) => (
          <Link
            key={subject.id}
            href={`/admin/subjects/${subject.id}`}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-800">{subject.name}</h3>
            <p className="text-sm text-gray-500">{subject.code || 'No code'}</p>
            
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <GraduationCap className="w-4 h-4" />
                <span>{subject._count.teachers} teachers</span>
              </div>
              <div className="text-sm text-gray-600">
                {subject._count.exams} exams
              </div>
            </div>
          </Link>
        ))}

        {subjects.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-100">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">No Subjects</h3>
            <p className="text-gray-500 mt-1">Create your first subject to get started</p>
            <Link
              href="/admin/subjects/new"
              className="inline-flex items-center gap-2 mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Subject
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
