import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Plus, Calendar, ChevronRight, Lock, CheckCircle } from 'lucide-react';

export default async function AcademicYearsPage() {
  const academicYears = await prisma.academicYear.findMany({
    include: {
      terms: true,
      _count: {
        select: { classes: true, enrollments: true }
      }
    },
    orderBy: { startDate: 'desc' }
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Academic Years</h1>
          <p className="text-gray-500 mt-1">Manage academic years and terms</p>
        </div>
        <Link
          href="/admin/academics/years/new"
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Academic Year
        </Link>
      </div>

      {/* Academic Years List */}
      <div className="space-y-4">
        {academicYears.map((year) => (
          <div
            key={year.id}
            className={`bg-white rounded-xl p-6 shadow-sm border ${
              year.isCurrent ? 'border-purple-200 ring-1 ring-purple-100' : 'border-gray-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  year.isCurrent ? 'bg-purple-100' : 'bg-gray-100'
                }`}>
                  <Calendar className={`w-6 h-6 ${year.isCurrent ? 'text-purple-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-800">{year.name}</h3>
                    {year.isCurrent && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(year.startDate).toLocaleDateString()} - {new Date(year.endDate).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <span>{year._count.classes} classes</span>
                    <span>{year._count.enrollments} enrollments</span>
                    <span>{year.terms.length} terms</span>
                  </div>
                </div>
              </div>
              <Link
                href={`/admin/academics/years/${year.id}`}
                className="flex items-center gap-1 text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                Manage
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Terms */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Terms</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {year.terms.map((term) => (
                  <div
                    key={term.id}
                    className={`p-3 rounded-lg border ${
                      term.isLocked 
                        ? 'bg-gray-50 border-gray-200' 
                        : 'bg-green-50 border-green-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">{term.name}</span>
                      {term.isLocked ? (
                        <Lock className="w-4 h-4 text-gray-400" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(term.startDate).toLocaleDateString()} - {new Date(term.endDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {academicYears.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">No Academic Years</h3>
            <p className="text-gray-500 mt-1">Create your first academic year to get started</p>
            <Link
              href="/admin/academics/years/new"
              className="inline-flex items-center gap-2 mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Academic Year
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
