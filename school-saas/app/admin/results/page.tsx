import { prisma } from '@/lib/db';
import Link from 'next/link';
import { FileText, TrendingUp, Users, GraduationCap, ChevronRight } from 'lucide-react';

export default async function ResultsPage() {
  const [exams, classes] = await Promise.all([
    prisma.exam.findMany({
      include: {
        subject: true,
        _count: { select: { results: true } }
      },
      orderBy: { examDate: 'desc' },
      take: 10
    }),
    prisma.class.findMany({
      include: {
        _count: { select: { enrollments: true } }
      }
    })
  ]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Results</h1>
          <p className="text-gray-500 mt-1">Manage and view exam results</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Exams */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Recent Exams</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {exams.map((exam) => (
                <Link
                  key={exam.id}
                  href={`/admin/exams/${exam.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{exam.name}</p>
                      <p className="text-sm text-gray-500">{exam.subject?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      {exam._count.results} results
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Class Results */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Class Results</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {classes.map((cls) => (
                <Link
                  key={cls.id}
                  href={`/admin/results/class/${cls.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-800">{cls.name}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Exams</span>
                <span className="font-semibold text-gray-800">{exams.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Results Submitted</span>
                <span className="font-semibold text-gray-800">
                  {exams.reduce((acc, e) => acc + e._count.results, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pending Grading</span>
                <span className="font-semibold text-orange-600">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
