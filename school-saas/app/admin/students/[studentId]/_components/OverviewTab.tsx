import Link from 'next/link';
import {
  Edit,
  UserX,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BookOpen,
  FileText,
  DollarSign,
} from 'lucide-react';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  _count: {
    enrollments: number;
    results: number;
    attendances: number;
  };
  enrollments: Array<{
    id: string;
    status: string;
    academicYear: { id: string; name: string };
    class: { id: string; name: string };
  }>;
  parent: {
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  } | null;
}

interface OverviewTabProps {
  student: Student;
}

export function OverviewTab({ student }: OverviewTabProps) {
  const activeEnrollment = student.enrollments.find((e) => e.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex items-center justify-end gap-3">
        <Link
          href={`/admin/students/${student.id}/edit`}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Edit className="w-4 h-4" />
          Edit Student
        </Link>
        <button className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
          <UserX className="w-4 h-4" />
          Suspend
        </button>
      </div>

      {/* Student Info Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-purple-600">
              {student.firstName[0]}
              {student.lastName[0]}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {student.firstName} {student.lastName}
                </h2>
                <p className="text-gray-500 mt-1">
                  Admission #: {student.studentId || 'Not assigned'}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  activeEnrollment
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {activeEnrollment ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-700">{student.email || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-gray-700">{student.phone || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="text-gray-700">
                    {student.dateOfBirth
                      ? new Date(student.dateOfBirth).toLocaleDateString()
                      : '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 md:col-span-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-gray-700">{student.address || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Enrollments</p>
              <p className="text-xl font-bold text-gray-800">{student._count.enrollments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Exam Results</p>
              <p className="text-xl font-bold text-gray-800">{student._count.results}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Attendance Records</p>
              <p className="text-xl font-bold text-gray-800">{student._count.attendances}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Class</p>
              <p className="text-xl font-bold text-gray-800">
                {activeEnrollment?.class.name || '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Enrollment */}
      {activeEnrollment && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Enrollment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Academic Year</p>
              <p className="font-medium text-gray-800">{activeEnrollment.academicYear.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Class</p>
              <p className="font-medium text-gray-800">{activeEnrollment.class.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {activeEnrollment.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Parent Info */}
      {student.parent && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Parent/Guardian</h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-lg font-medium text-gray-600">
                {student.parent.user.firstName[0]}
                {student.parent.user.lastName[0]}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-800">
                {student.parent.user.firstName} {student.parent.user.lastName}
              </p>
              <p className="text-sm text-gray-500">{student.parent.user.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
