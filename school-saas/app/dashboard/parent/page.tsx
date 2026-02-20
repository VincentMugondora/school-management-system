'use client';

import { useState, useEffect } from 'react';
import type { Role } from '@prisma/client';
import { getResultsByStudent, calculateStudentOverallPerformance } from '@/app/actions/exam.actions';
import { getAttendanceByStudentAndTerm } from '@/app/actions/exam.actions';
import { listTerms } from '@/app/actions/academic.actions';
import { getCurrentUserProfile } from '@/app/actions/user.actions';
import { getStudentById } from '@/app/actions/student.actions';
import Link from 'next/link';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string | null;
  currentClass: string;
  enrollmentId: string;
}

interface ChildData {
  info: Child;
  results: {
    id: string;
    marks: number;
    grade: string;
    exam: {
      name: string;
      subject: { name: string };
    };
  }[];
  performance: {
    totalExams: number;
    averagePercentage: number;
    overallGrade: string;
  } | null;
  attendance: {
    totalDays: number;
    presentDays: number;
    attendancePercentage: number;
  } | null;
}

// Mock children data - in production, this would come from a parent-student relationship query
const mockChildren: Child[] = [
  { id: 'student-1', firstName: 'John', lastName: 'Doe', studentId: 'STU001', currentClass: '10A', enrollmentId: 'enroll-1' },
  { id: 'student-2', firstName: 'Jane', lastName: 'Doe', studentId: 'STU002', currentClass: '8B', enrollmentId: 'enroll-2' },
];

export default function ParentDashboard() {
  const [user, setUser] = useState<{ role: string; firstName: string | null; lastName: string | null } | null>(null);
  const [children, setChildren] = useState<ChildData[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>(mockChildren[0]?.id || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const userResult = await getCurrentUserProfile();
      if (userResult.success) {
        setUser(userResult.data);
      }

      // Get current term
      const termsResult = await listTerms();
      const currentTerm = termsResult.success ? termsResult.data[0] : null;

      // Load data for each child
      const childrenDataPromises = mockChildren.map(async (child) => {
        const [resultsResult, performanceResult, attendanceResult] = await Promise.all([
          getResultsByStudent(child.id),
          currentTerm ? calculateStudentOverallPerformance(child.id, currentTerm.id) : Promise.resolve({ success: false }),
          currentTerm ? getAttendanceByStudentAndTerm(child.id, currentTerm.id) : Promise.resolve({ success: false }),
        ]);

        return {
          info: child,
          results: resultsResult.success ? (resultsResult.data as any[]).slice(0, 5) : [],
          performance: performanceResult.success ? performanceResult.data : null,
          attendance: attendanceResult.success ? {
            totalDays: attendanceResult.data.totalDays,
            presentDays: attendanceResult.data.presentDays,
            attendancePercentage: attendanceResult.data.attendancePercentage,
          } : null,
        };
      });

      const childrenData = await Promise.all(childrenDataPromises);
      setChildren(childrenData);
    } catch (error) {
      console.error('Failed to load parent dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const selectedChildData = children.find(c => c.info.id === selectedChild);

  if (!user || (user.role !== 'PARENT' && user.role !== 'SUPER_ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-600">Access Denied</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Parent Dashboard</h1>
        <p className="text-gray-600">
          Welcome, {user.firstName} {user.lastName}
        </p>
      </div>

      {/* Children Selector */}
      {children.length > 1 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {children.map((child) => (
              <button
                key={child.info.id}
                onClick={() => setSelectedChild(child.info.id)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  selectedChild === child.info.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {child.info.firstName} {child.info.lastName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Child Overview */}
      {selectedChildData && (
        <>
          {/* Child Header */}
          <div className="bg-white border rounded-lg p-6 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h2 className="text-2xl font-bold">
                  {selectedChildData.info.firstName} {selectedChildData.info.lastName}
                </h2>
                <p className="text-gray-600">
                  Student ID: {selectedChildData.info.studentId} • Class: {selectedChildData.info.currentClass}
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex gap-3">
                <Link
                  href={`/parent/child/${selectedChildData.info.id}/results`}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  View All Results
                </Link>
                <Link
                  href={`/parent/child/${selectedChildData.info.id}/attendance`}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                >
                  View Attendance
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">
                {selectedChildData.performance?.averagePercentage || 0}%
              </div>
              <div className="text-sm text-gray-600">Average Grade</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {selectedChildData.attendance?.attendancePercentage || 0}%
              </div>
              <div className="text-sm text-gray-600">Attendance</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">
                {selectedChildData.results.length}
              </div>
              <div className="text-sm text-gray-600">Recent Exams</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">
                {selectedChildData.performance?.overallGrade || '-'}
              </div>
              <div className="text-sm text-gray-600">Overall Grade</div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Recent Results */}
            <div className="bg-white border rounded-lg shadow-sm">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="text-lg font-semibold">Recent Exam Results</h2>
              </div>
              <div className="p-4">
                {selectedChildData.results.length > 0 ? (
                  <div className="space-y-3">
                    {selectedChildData.results.map((result) => (
                      <div key={result.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{result.exam.subject.name}</div>
                          <div className="text-sm text-gray-500">{result.exam.name}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${
                            result.grade === 'A+' || result.grade === 'A' ? 'text-green-600' :
                            result.grade === 'F' ? 'text-red-600' : 'text-blue-600'
                          }`}>
                            {result.grade}
                          </div>
                          <div className="text-sm text-gray-500">{result.marks} marks</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent results available</p>
                )}
              </div>
            </div>

            {/* Attendance Summary */}
            <div className="bg-white border rounded-lg shadow-sm">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="text-lg font-semibold">Attendance Summary</h2>
              </div>
              <div className="p-4">
                {selectedChildData.attendance ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-xl font-bold text-blue-600">
                          {selectedChildData.attendance.totalDays}
                        </div>
                        <div className="text-xs text-gray-600">Total Days</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-xl font-bold text-green-600">
                          {selectedChildData.attendance.presentDays}
                        </div>
                        <div className="text-xs text-gray-600">Present</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-xl font-bold text-red-600">
                          {selectedChildData.attendance.totalDays - selectedChildData.attendance.presentDays}
                        </div>
                        <div className="text-xs text-gray-600">Absent</div>
                      </div>
                    </div>
                    
                    {/* Attendance Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Attendance Rate</span>
                        <span className="font-medium">{selectedChildData.attendance.attendancePercentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${
                            selectedChildData.attendance.attendancePercentage >= 90 ? 'bg-green-500' :
                            selectedChildData.attendance.attendancePercentage >= 75 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${selectedChildData.attendance.attendancePercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No attendance data available</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* All Children Overview (if multiple) */}
      {children.length > 1 && (
        <div className="bg-white border rounded-lg shadow-sm mb-8">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold">All My Children</h2>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {children.map((child) => (
                <div 
                  key={child.info.id}
                  className={`p-4 rounded-lg cursor-pointer ${
                    selectedChild === child.info.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                  }`}
                  onClick={() => setSelectedChild(child.info.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">
                        {child.info.firstName} {child.info.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {child.info.currentClass} • ID: {child.info.studentId}
                      </div>
                    </div>
                    <div className="text-right flex gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Grade</div>
                        <div className="font-bold text-blue-600">
                          {child.performance?.overallGrade || '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Attendance</div>
                        <div className={`font-bold ${
                          (child.attendance?.attendancePercentage || 0) >= 90 ? 'text-green-600' :
                          (child.attendance?.attendancePercentage || 0) >= 75 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {child.attendance?.attendancePercentage || 0}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/parent/fees"
          className="p-4 bg-orange-50 rounded-lg text-center hover:bg-orange-100"
        >
          <div className="font-medium text-orange-700">Fee Payments</div>
        </Link>
        <Link
          href="/parent/messages"
          className="p-4 bg-blue-50 rounded-lg text-center hover:bg-blue-100"
        >
          <div className="font-medium text-blue-700">Messages</div>
        </Link>
        <Link
          href="/parent/announcements"
          className="p-4 bg-purple-50 rounded-lg text-center hover:bg-purple-100"
        >
          <div className="font-medium text-purple-700">Announcements</div>
        </Link>
        <Link
          href="/parent/calendar"
          className="p-4 bg-green-50 rounded-lg text-center hover:bg-green-100"
        >
          <div className="font-medium text-green-700">School Calendar</div>
        </Link>
      </div>
    </div>
  );
}
