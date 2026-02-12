'use client';

import { useState, useEffect } from 'react';
import { Role } from '@prisma/client';
import { getResultsByStudent, calculateStudentOverallPerformance } from '@/app/actions/exam.actions';
import { getAttendanceByStudentAndTerm } from '@/app/actions/exam.actions';
import { listTerms } from '@/app/actions/academic.actions';
import { getCurrentUserProfile } from '@/app/actions/user.actions';
import Link from 'next/link';

interface Result {
  id: string;
  marks: number;
  grade: string;
  exam: {
    name: string;
    maxMarks: number;
    subject: { name: string };
  };
}

interface AttendanceRecord {
  id: string;
  date: string;
  isPresent: boolean;
}

// Mock schedule data - in production, this would come from a Schedule/Lesson service
const mockStudentSchedule = [
  { day: 'Monday', time: '08:00 - 09:00', subject: 'Mathematics', room: 'Room 101', teacher: 'Mr. Smith' },
  { day: 'Monday', time: '09:00 - 10:00', subject: 'English', room: 'Room 102', teacher: 'Ms. Johnson' },
  { day: 'Monday', time: '10:30 - 11:30', subject: 'Science', room: 'Lab 1', teacher: 'Mr. Brown' },
  { day: 'Monday', time: '13:00 - 14:00', subject: 'History', room: 'Room 103', teacher: 'Ms. Davis' },
  
  { day: 'Tuesday', time: '08:00 - 09:00', subject: 'English', room: 'Room 102', teacher: 'Ms. Johnson' },
  { day: 'Tuesday', time: '09:00 - 10:00', subject: 'Mathematics', room: 'Room 101', teacher: 'Mr. Smith' },
  { day: 'Tuesday', time: '10:30 - 11:30', subject: 'Physical Education', room: 'Gym', teacher: 'Coach Wilson' },
  { day: 'Tuesday', time: '13:00 - 14:00', subject: 'Art', room: 'Art Room', teacher: 'Ms. Garcia' },
  
  { day: 'Wednesday', time: '08:00 - 09:00', subject: 'Science', room: 'Lab 1', teacher: 'Mr. Brown' },
  { day: 'Wednesday', time: '09:00 - 10:00', subject: 'Mathematics', room: 'Room 101', teacher: 'Mr. Smith' },
  { day: 'Wednesday', time: '10:30 - 11:30', subject: 'English', room: 'Room 102', teacher: 'Ms. Johnson' },
  { day: 'Wednesday', time: '13:00 - 14:00', subject: 'Computer Science', room: 'Lab 2', teacher: 'Mr. Lee' },
  
  { day: 'Thursday', time: '08:00 - 09:00', subject: 'History', room: 'Room 103', teacher: 'Ms. Davis' },
  { day: 'Thursday', time: '09:00 - 10:00', subject: 'Science', room: 'Lab 1', teacher: 'Mr. Brown' },
  { day: 'Thursday', time: '10:30 - 11:30', subject: 'Mathematics', room: 'Room 101', teacher: 'Mr. Smith' },
  { day: 'Thursday', time: '13:00 - 14:00', subject: 'Music', room: 'Music Room', teacher: 'Ms. Taylor' },
  
  { day: 'Friday', time: '08:00 - 09:00', subject: 'English', room: 'Room 102', teacher: 'Ms. Johnson' },
  { day: 'Friday', time: '09:00 - 10:00', subject: 'Science', room: 'Lab 1', teacher: 'Mr. Brown' },
  { day: 'Friday', time: '10:30 - 11:30', subject: 'History', room: 'Room 103', teacher: 'Ms. Davis' },
  { day: 'Friday', time: '13:00 - 14:00', subject: 'Mathematics', room: 'Room 101', teacher: 'Mr. Smith' },
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function StudentDashboard() {
  const [user, setUser] = useState<{ role: Role; firstName: string | null; lastName: string | null; id: string } | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [performance, setPerformance] = useState<{
    totalExams: number;
    averagePercentage: number;
    highestPercentage: number;
    lowestPercentage: number;
    overallGrade: string;
  } | null>(null);
  const [attendance, setAttendance] = useState<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    attendancePercentage: number;
  } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
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
        
        const studentId = userResult.data.id;
        
        // Get results
        const resultsResult = await getResultsByStudent(studentId);
        if (resultsResult.success) {
          setResults(resultsResult.data as unknown as Result[]);
        }
        
        // Get performance (need current academic year - using placeholder)
        const termsResult = await listTerms();
        if (termsResult.success && termsResult.data.length > 0) {
          const currentTerm = termsResult.data[0];
          const performanceResult = await calculateStudentOverallPerformance(studentId, currentTerm.id);
          if (performanceResult.success) {
            setPerformance(performanceResult.data);
          }
          
          // Get attendance
          const attendanceResult = await getAttendanceByStudentAndTerm(studentId, currentTerm.id);
          if (attendanceResult.success) {
            setAttendance(attendanceResult.data);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load student data');
    } finally {
      setLoading(false);
    }
  }

  const scheduleForDay = mockStudentSchedule.filter(item => item.day === selectedDay);

  if (!user || user.role !== Role.STUDENT) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          Access Denied. Only students can access this dashboard.
        </div>
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
        <h1 className="text-3xl font-bold mb-2">Student Dashboard</h1>
        <p className="text-gray-600">
          Welcome, {user.firstName} {user.lastName}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">
            {performance?.averagePercentage || 0}%
          </div>
          <div className="text-sm text-gray-600">Avg Grade</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">
            {attendance?.attendancePercentage || 0}%
          </div>
          <div className="text-sm text-gray-600">Attendance</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">{results.length}</div>
          <div className="text-sm text-gray-600">Exams Taken</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-600">
            {performance?.overallGrade || '-'}
          </div>
          <div className="text-sm text-gray-600">Overall Grade</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Today's Schedule */}
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-semibold">My Schedule</h2>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="p-2 border rounded text-sm"
            >
              {days.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
          <div className="p-4">
            {scheduleForDay.length > 0 ? (
              <div className="space-y-3">
                {scheduleForDay.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-16 text-sm font-medium text-gray-600">{item.time.split(' - ')[0]}</div>
                      <div>
                        <div className="font-medium">{item.subject}</div>
                        <div className="text-sm text-gray-500">{item.teacher} • {item.room}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No classes scheduled for {selectedDay}</p>
            )}
          </div>
        </div>

        {/* Recent Results */}
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Recent Results</h2>
            <Link href="/dashboard/student/results" className="text-blue-600 hover:underline text-sm">
              View All
            </Link>
          </div>
          <div className="p-4">
            {results.length > 0 ? (
              <div className="space-y-3">
                {results.slice(0, 5).map((result) => (
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
                      <div className="text-sm text-gray-500">
                        {result.marks}/{result.exam.maxMarks}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No results available yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Overview */}
      <div className="bg-white border rounded-lg shadow-sm mb-8">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">Attendance Overview</h2>
        </div>
        <div className="p-4">
          {attendance ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{attendance.totalDays}</div>
                <div className="text-sm text-gray-600">Total Days</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{attendance.presentDays}</div>
                <div className="text-sm text-gray-600">Present</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{attendance.absentDays}</div>
                <div className="text-sm text-gray-600">Absent</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{attendance.attendancePercentage}%</div>
                <div className="text-sm text-gray-600">Percentage</div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No attendance records available</p>
          )}
        </div>
      </div>

      {/* Weekly Schedule Table */}
      <div className="bg-white border rounded-lg shadow-sm mb-8">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">Weekly Schedule</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 text-left border-b">Day</th>
                <th className="p-3 text-left border-b">Morning</th>
                <th className="p-3 text-left border-b">Mid-Morning</th>
                <th className="p-3 text-left border-b">Afternoon</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => {
                const daySchedule = mockStudentSchedule.filter(item => item.day === day);
                return (
                  <tr key={day} className="hover:bg-gray-50">
                    <td className="p-3 border-b font-medium">{day}</td>
                    <td className="p-3 border-b text-sm">
                      {daySchedule.slice(0, 2).map(s => s.subject).join(', ')}
                    </td>
                    <td className="p-3 border-b text-sm">
                      {daySchedule[2]?.subject || '-'}
                    </td>
                    <td className="p-3 border-b text-sm">
                      {daySchedule[3]?.subject || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/dashboard/student/results"
          className="p-4 bg-blue-50 rounded-lg text-center hover:bg-blue-100"
        >
          <div className="font-medium text-blue-700">View All Results</div>
        </Link>
        <Link
          href="/student/schedule"
          className="p-4 bg-green-50 rounded-lg text-center hover:bg-green-100"
        >
          <div className="font-medium text-green-700">Full Schedule</div>
        </Link>
        <Link
          href="/student/attendance"
          className="p-4 bg-purple-50 rounded-lg text-center hover:bg-purple-100"
        >
          <div className="font-medium text-purple-700">Attendance History</div>
        </Link>
        <Link
          href="/student/materials"
          className="p-4 bg-orange-50 rounded-lg text-center hover:bg-orange-100"
        >
          <div className="font-medium text-orange-700">Study Materials</div>
        </Link>
      </div>
    </div>
  );
}
