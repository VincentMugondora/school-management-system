import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Plus, FileText, Calendar, ChevronRight, CheckCircle, Clock } from 'lucide-react';

export default async function ExamsPage() {
  const exams = await prisma.exam.findMany({
    include: {
      subject: true,
      class: true,
      term: true,
      _count: {
        select: { results: true }
      }
    },
    orderBy: { examDate: 'desc' },
    take: 50
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Exams</h1>
          <p className="text-gray-500 mt-1">Manage exams and monitor results</p>
        </div>
        <Link
          href="/admin/exams/new"
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Exam
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam) => (
          <Link
            key={exam.id}
            href={`/admin/exams/${exam.id}`}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-800">{exam.name}</h3>
            <p className="text-sm text-gray-500">{exam.subject?.name} • {exam.class?.name}</p>
            
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date(exam.examDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4" />
                <span>{exam._count.results} results submitted</span>
              </div>
              <div className="text-sm text-gray-600">
                Max Marks: {exam.maxMarks}
              </div>
            </div>
          </Link>
        ))}

        {exams.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-100">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">No Exams</h3>
            <p className="text-gray-500 mt-1">Create your first exam to get started</p>
            <Link
              href="/admin/exams/new"
              className="inline-flex items-center gap-2 mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Exam
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
