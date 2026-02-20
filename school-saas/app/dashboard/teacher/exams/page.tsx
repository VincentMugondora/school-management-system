'use client';

import { useState, useEffect } from 'react';
import type { Role } from '@prisma/client';
import { listClasses } from '@/app/actions/teacher.actions';
import { listExams, bulkEnterResults, calculateExamStatistics, getResultsByExam } from '@/app/actions/exam.actions';
import { listEnrollmentsByClass } from '@/app/actions/student.actions';
import { getCurrentUserProfile } from '@/app/actions/user.actions';

interface Class {
  id: string;
  name: string;
  grade: string;
}

interface Exam {
  id: string;
  name: string;
  maxMarks: number;
  subject: { name: string };
  term: { name: string };
}

interface Enrollment {
  id: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface StudentResult {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  marks: string;
  remarks: string;
  existingResult?: {
    marks: number;
    grade: string;
  };
}

export default function TeacherExamEntryDashboard() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalStudents: number;
    averageMarks: number;
    highestMarks: number;
    lowestMarks: number;
    passCount: number;
    passPercentage: number;
  } | null>(null);

  useEffect(() => {
    checkPermissions();
    loadClasses();
    loadExams();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedExam) {
      loadStudentsAndExistingResults();
    }
  }, [selectedClass, selectedExam]);

  async function checkPermissions() {
    const result = await getCurrentUserProfile();
    if (result.success) {
      setUser(result.data);
    }
  }

  async function loadClasses() {
    const result = await listClasses();
    if (result.success) {
      setClasses(result.data.classes as unknown as Class[]);
    }
  }

  async function loadExams() {
    const result = await listExams();
    if (result.success) {
      setExams(result.data.exams as unknown as Exam[]);
    }
  }

  async function loadStudentsAndExistingResults() {
    if (!selectedClass || !selectedExam) return;

    setLoading(true);
    try {
      // Get students in class
      const enrollmentsResult = await listEnrollmentsByClass(selectedClass, 'ACTIVE');
      
      // Get existing results for this exam
      const resultsResult = await getResultsByExam(selectedExam);

      const existingResultsMap = new Map();
      if (resultsResult.success) {
        resultsResult.data.forEach((r: any) => {
          existingResultsMap.set(r.enrollmentId, { marks: r.marks, grade: r.grade });
        });
      }

      if (enrollmentsResult.success) {
        const studentsData: StudentResult[] = enrollmentsResult.data.map((e: any) => ({
          enrollmentId: e.id,
          studentId: e.student.id,
          studentName: `${e.student.firstName} ${e.student.lastName}`,
          marks: existingResultsMap.get(e.id)?.marks?.toString() || '',
          remarks: '',
          existingResult: existingResultsMap.get(e.id),
        }));
        setStudents(studentsData);
      }

      // Load statistics
      const statsResult = await calculateExamStatistics(selectedExam);
      if (statsResult.success) {
        setStats(statsResult.data);
      }
    } catch (err) {
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  }

  function updateMarks(index: number, marks: string) {
    setStudents(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], marks };
      return updated;
    });
  }

  function updateRemarks(index: number, remarks: string) {
    setStudents(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], remarks };
      return updated;
    });
  }

  async function saveResults() {
    if (!selectedExam) {
      setError('Please select an exam');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Filter out students with empty marks
      const resultsToSave = students
        .filter(s => s.marks.trim() !== '')
        .map(s => ({
          enrollmentId: s.enrollmentId,
          marks: parseFloat(s.marks),
          remarks: s.remarks || undefined,
        }));

      if (resultsToSave.length === 0) {
        setError('Please enter marks for at least one student');
        setSaving(false);
        return;
      }

      const result = await bulkEnterResults({
        examId: selectedExam,
        results: resultsToSave,
      });

      if (result.success) {
        setSuccess(`Results saved! ${result.data.successCount} records updated.`);
        if (result.data.errorCount > 0) {
          setError(`${result.data.errorCount} records failed to save.`);
        }
        // Reload stats
        const statsResult = await calculateExamStatistics(selectedExam);
        if (statsResult.success) {
          setStats(statsResult.data);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to save results');
    } finally {
      setSaving(false);
    }
  }

  const selectedExamData = exams.find(e => e.id === selectedExam);

  if (!user || (user.role !== 'TEACHER' && user.role !== 'SUPER_ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-600">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Enter Exam Results</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
          <label className="block text-sm font-medium mb-1">Exam</label>
          <select
            className="w-full p-2 border rounded"
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
          >
            <option value="">Select Exam</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name} - {exam.subject.name} ({exam.term.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Exam Info */}
      {selectedExamData && (
        <div className="bg-blue-50 p-4 rounded mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Subject:</span> {selectedExamData.subject.name}
            </div>
            <div>
              <span className="font-medium">Max Marks:</span> {selectedExamData.maxMarks}
            </div>
            <div>
              <span className="font-medium">Term:</span> {selectedExamData.term.name}
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats && stats.totalStudents > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded text-center">
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <div className="text-xs text-gray-600">Students</div>
          </div>
          <div className="bg-gray-50 p-3 rounded text-center">
            <div className="text-2xl font-bold">{stats.averageMarks}</div>
            <div className="text-xs text-gray-600">Average</div>
          </div>
          <div className="bg-gray-50 p-3 rounded text-center">
            <div className="text-2xl font-bold">{stats.highestMarks}</div>
            <div className="text-xs text-gray-600">Highest</div>
          </div>
          <div className="bg-gray-50 p-3 rounded text-center">
            <div className="text-2xl font-bold">{stats.lowestMarks}</div>
            <div className="text-xs text-gray-600">Lowest</div>
          </div>
          <div className="bg-gray-50 p-3 rounded text-center">
            <div className="text-2xl font-bold text-green-600">{stats.passCount}</div>
            <div className="text-xs text-gray-600">Passed</div>
          </div>
          <div className="bg-gray-50 p-3 rounded text-center">
            <div className="text-2xl font-bold">{stats.passPercentage}%</div>
            <div className="text-xs text-gray-600">Pass Rate</div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : students.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-3 text-left">#</th>
                <th className="border p-3 text-left">Student Name</th>
                <th className="border p-3 text-center">Marks (/{selectedExamData?.maxMarks})</th>
                <th className="border p-3 text-center">Grade</th>
                <th className="border p-3 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => {
                const marks = parseFloat(student.marks);
                const percentage = selectedExamData && !isNaN(marks) 
                  ? (marks / selectedExamData.maxMarks) * 100 
                  : 0;
                let grade = '-';
                if (!isNaN(marks)) {
                  if (percentage >= 90) grade = 'A+';
                  else if (percentage >= 80) grade = 'A';
                  else if (percentage >= 70) grade = 'B+';
                  else if (percentage >= 60) grade = 'B';
                  else if (percentage >= 50) grade = 'C';
                  else if (percentage >= 40) grade = 'D';
                  else grade = 'F';
                }

                return (
                  <tr key={student.enrollmentId} className="hover:bg-gray-50">
                    <td className="border p-3">{index + 1}</td>
                    <td className="border p-3 font-medium">{student.studentName}</td>
                    <td className="border p-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max={selectedExamData?.maxMarks}
                        className="w-20 p-2 border rounded text-center"
                        value={student.marks}
                        onChange={(e) => updateMarks(index, e.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td className="border p-3 text-center font-medium">
                      <span className={
                        grade === 'A+' || grade === 'A' ? 'text-green-600' :
                        grade === 'F' ? 'text-red-600' : 'text-blue-600'
                      }>
                        {grade}
                      </span>
                    </td>
                    <td className="border p-3">
                      <input
                        type="text"
                        placeholder="Optional remarks"
                        className="w-full p-2 border rounded"
                        value={student.remarks}
                        onChange={(e) => updateRemarks(index, e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-6 flex gap-3">
            <button
              onClick={saveResults}
              disabled={saving}
              className="bg-blue-500 text-white px-6 py-3 rounded font-medium hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Results'}
            </button>
            <button
              onClick={() => loadStudentsAndExistingResults()}
              className="bg-gray-500 text-white px-6 py-3 rounded font-medium hover:bg-gray-600"
            >
              Refresh
            </button>
          </div>
        </div>
      ) : selectedClass ? (
        <div className="text-center py-8 text-gray-600">
          No students found in this class.
        </div>
      ) : (
        <div className="text-center py-8 text-gray-600">
          Please select a class and exam to enter results.
        </div>
      )}
    </div>
  );
}
