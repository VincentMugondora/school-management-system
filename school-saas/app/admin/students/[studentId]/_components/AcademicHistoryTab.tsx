import { GraduationCap, Calendar, FileText } from 'lucide-react';

interface Enrollment {
  id: string;
  enrollmentDate: Date;
  status: string;
  academicYear: { id: string; name: string };
  class: { id: string; name: string; grade: string };
  results: Array<{
    id: string;
    marks: number;
    exam: {
      name: string;
      maxMarks: number;
      subject: { name: string };
    };
  }>;
}

interface AcademicHistoryTabProps {
  enrollments: Enrollment[];
}

export function AcademicHistoryTab({ enrollments }: AcademicHistoryTabProps) {
  if (enrollments.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
        <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700">No Academic History</h3>
        <p className="text-gray-500 mt-1">This student has no enrollment records.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {enrollments.map((enrollment) => (
        <div key={enrollment.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">{enrollment.academicYear.name}</h3>
                <p className="text-sm text-gray-500">
                  Enrolled on {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                enrollment.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : enrollment.status === 'COMPLETED'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {enrollment.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Class</p>
              <p className="font-medium text-gray-800">
                {enrollment.class.name} (Grade {enrollment.class.grade})
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Results</p>
              <p className="font-medium text-gray-800">{enrollment.results.length} exams</p>
            </div>
          </div>

          {enrollment.results.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Exam Results
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {enrollment.results.map((result) => (
                  <div key={result.id} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-800">{result.exam.subject.name}</p>
                    <p className="text-xs text-gray-500">{result.exam.name}</p>
                    <p className="text-sm font-semibold text-purple-600 mt-1">
                      {result.marks} / {result.exam.maxMarks}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
