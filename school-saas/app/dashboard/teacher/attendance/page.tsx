'use client';

import { useState, useEffect } from 'react';
import type { Role } from '@prisma/client';
import { listClasses } from '@/app/actions/teacher.actions';
import { listTerms } from '@/app/actions/academic.actions';
import { getAttendanceByClassAndDate, bulkUpdateAttendance } from '@/app/actions/exam.actions';
import { getCurrentUserProfile } from '@/app/actions/user.actions';

interface Class {
  id: string;
  name: string;
  grade: string;
  stream: string | null;
  _count?: { enrollments: number };
}

interface Term {
  id: string;
  name: string;
  academicYear: { name: string };
}

interface StudentAttendance {
  enrollmentId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  isPresent: boolean;
  remarks: string;
}

export default function TeacherAttendanceDashboard() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkPermissions();
    loadClassesAndTerms();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedTerm && selectedDate) {
      loadAttendance();
    }
  }, [selectedClass, selectedTerm, selectedDate]);

  async function checkPermissions() {
    const result = await getCurrentUserProfile();
    if (result.success) {
      setUser(result.data);
    }
  }

  async function loadClassesAndTerms() {
    setLoading(true);
    try {
      const [classesResult, termsResult] = await Promise.all([
        listClasses(),
        listTerms(),
      ]);

      if (classesResult.success) {
        setClasses(classesResult.data.classes as unknown as Class[]);
      }
      if (termsResult.success) {
        setTerms(termsResult.data as unknown as Term[]);
      }
    } catch (err) {
      setError('Failed to load classes and terms');
    } finally {
      setLoading(false);
    }
  }

  async function loadAttendance() {
    if (!selectedClass || !selectedDate) return;

    setLoading(true);
    try {
      const result = await getAttendanceByClassAndDate(selectedClass, new Date(selectedDate));
      
      if (result.success) {
        // Transform data to our format
        const existingAttendance = result.data;
        const transformed: StudentAttendance[] = existingAttendance.map((a: any) => ({
          enrollmentId: a.enrollmentId,
          studentId: a.studentId,
          firstName: a.student.firstName,
          lastName: a.student.lastName,
          isPresent: a.isPresent,
          remarks: a.remarks || '',
        }));
        setAttendance(transformed);
      }
    } catch (err) {
      setError('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }

  function toggleAttendance(index: number) {
    setAttendance(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isPresent: !updated[index].isPresent };
      return updated;
    });
  }

  function updateRemarks(index: number, remarks: string) {
    setAttendance(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], remarks };
      return updated;
    });
  }

  async function saveAttendance() {
    if (!selectedClass || !selectedTerm || !selectedDate) {
      setError('Please select class, term, and date');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await bulkUpdateAttendance({
        classId: selectedClass,
        termId: selectedTerm,
        date: new Date(selectedDate),
        attendances: attendance.map(a => ({
          enrollmentId: a.enrollmentId,
          isPresent: a.isPresent,
          remarks: a.remarks || undefined,
        })),
      });

      if (result.success) {
        setSuccess(`Attendance saved! ${result.data.successCount} records updated.`);
        if (result.data.errorCount > 0) {
          setError(`${result.data.errorCount} records failed to save.`);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  }

  function markAllPresent() {
    setAttendance(prev => prev.map(a => ({ ...a, isPresent: true })));
  }

  function markAllAbsent() {
    setAttendance(prev => prev.map(a => ({ ...a, isPresent: false })));
  }

  if (!user || (user.role !== 'TEACHER' && user.role !== 'SUPER_ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-600">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Mark Attendance</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Class</label>
          <select
            className="w-full p-2 border rounded"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">Select Class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} (Grade {cls.grade})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Term</label>
          <select
            className="w-full p-2 border rounded"
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
          >
            <option value="">Select Term</option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name} - {term.academicYear.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            className="w-full p-2 border rounded"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {attendance.length > 0 && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={markAllPresent}
            className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600"
          >
            Mark All Present
          </button>
          <button
            onClick={markAllAbsent}
            className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600"
          >
            Mark All Absent
          </button>
        </div>
      )}

      {/* Attendance Table */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : attendance.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-3 text-left">Student</th>
                <th className="border p-3 text-center">Status</th>
                <th className="border p-3 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((student, index) => (
                <tr key={student.enrollmentId} className="hover:bg-gray-50">
                  <td className="border p-3">
                    <div className="font-medium">
                      {student.firstName} {student.lastName}
                    </div>
                  </td>
                  <td className="border p-3 text-center">
                    <button
                      onClick={() => toggleAttendance(index)}
                      className={`px-4 py-2 rounded font-medium ${
                        student.isPresent
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {student.isPresent ? 'Present' : 'Absent'}
                    </button>
                  </td>
                  <td className="border p-3">
                    <input
                      type="text"
                      placeholder="Remarks (optional)"
                      className="w-full p-2 border rounded"
                      value={student.remarks}
                      onChange={(e) => updateRemarks(index, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6">
            <button
              onClick={saveAttendance}
              disabled={saving}
              className="bg-blue-500 text-white px-6 py-3 rounded font-medium hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      ) : selectedClass ? (
        <div className="text-center py-8 text-gray-600">
          No students found in this class or no attendance records yet.
        </div>
      ) : (
        <div className="text-center py-8 text-gray-600">
          Please select a class to view students.
        </div>
      )}
    </div>
  );
}
