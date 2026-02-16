import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

interface AttendanceRecord {
  termId: string;
  termName: string;
  academicYearName: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  percentage: number;
}

interface AttendanceTabProps {
  records: AttendanceRecord[];
}

export function AttendanceTab({ records }: AttendanceTabProps) {
  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700">No Attendance Records</h3>
        <p className="text-gray-500 mt-1">This student has no attendance data recorded.</p>
      </div>
    );
  }

  const totalPresent = records.reduce((sum, r) => sum + r.presentDays, 0);
  const totalAbsent = records.reduce((sum, r) => sum + r.absentDays, 0);
  const totalDays = totalPresent + totalAbsent;
  const overallPercentage = totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Present Days</p>
              <p className="text-xl font-bold text-gray-800">{totalPresent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Absent Days</p>
              <p className="text-xl font-bold text-gray-800">{totalAbsent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Days</p>
              <p className="text-xl font-bold text-gray-800">{totalDays}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Attendance Rate</p>
              <p className="text-xl font-bold text-gray-800">{overallPercentage}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Term-wise Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Attendance by Term</h3>
          <p className="text-sm text-gray-500 mt-1">Detailed breakdown of attendance records</p>
        </div>
        <div className="divide-y divide-gray-100">
          {records.map((record) => (
            <div key={record.termId} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-medium text-gray-800">{record.termName}</h4>
                  <p className="text-sm text-gray-500">{record.academicYearName}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-800">{record.percentage}%</p>
                  <p className="text-sm text-gray-500">Attendance Rate</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-semibold text-gray-800">{record.totalDays}</p>
                  <p className="text-xs text-gray-500">Total Days</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-semibold text-green-700">{record.presentDays}</p>
                  <p className="text-xs text-green-600">Present</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-semibold text-red-700">{record.absentDays}</p>
                  <p className="text-xs text-red-600">Absent</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      record.percentage >= 90
                        ? 'bg-green-500'
                        : record.percentage >= 75
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${record.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
