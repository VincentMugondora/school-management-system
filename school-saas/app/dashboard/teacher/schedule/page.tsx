'use client';

import { useState, useEffect } from 'react';
import type { Role } from '@prisma/client';
import { getTeacherDashboard } from '@/app/actions/teacher.actions';
import { listClasses } from '@/app/actions/teacher.actions';
import { listTerms } from '@/app/actions/academic.actions';
import { getClassAttendanceSummary } from '@/app/actions/exam.actions';
import { getCurrentUserProfile } from '@/app/actions/user.actions';
import Link from 'next/link';

interface Class {
  id: string;
  name: string;
  grade: string;
  academicYear: { name: string };
}

interface Subject {
  id: string;
  name: string;
  code: string | null;
}

interface ScheduleItem {
  day: string;
  time: string;
  class: string;
  subject: string;
  room: string;
}

// Mock schedule data - in production, this would come from a Lesson/Schedule service
const mockSchedule: ScheduleItem[] = [
  { day: 'Monday', time: '08:00 - 09:00', class: '10A', subject: 'Mathematics', room: 'Room 101' },
  { day: 'Monday', time: '09:00 - 10:00', class: '10A', subject: 'Mathematics', room: 'Room 101' },
  { day: 'Monday', time: '11:00 - 12:00', class: '9B', subject: 'Science', room: 'Lab 2' },
  { day: 'Tuesday', time: '08:00 - 09:00', class: '11A', subject: 'Physics', room: 'Lab 1' },
  { day: 'Tuesday', time: '10:00 - 11:00', class: '10A', subject: 'Mathematics', room: 'Room 101' },
  { day: 'Wednesday', time: '09:00 - 10:00', class: '9A', subject: 'Chemistry', room: 'Lab 3' },
  { day: 'Wednesday', time: '13:00 - 14:00', class: '10B', subject: 'Mathematics', room: 'Room 102' },
  { day: 'Thursday', time: '08:00 - 09:00', class: '11A', subject: 'Physics', room: 'Lab 1' },
  { day: 'Thursday', time: '11:00 - 12:00', class: '9B', subject: 'Science', room: 'Lab 2' },
  { day: 'Friday', time: '09:00 - 10:00', class: '10A', subject: 'Mathematics', room: 'Room 101' },
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TeacherScheduleDashboard() {
  const [user, setUser] = useState<{ role: string; firstName: string | null; lastName: string | null } | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<Class[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<Subject[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [attendanceData, setAttendanceData] = useState<{[key: string]: number}>({});
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

      const dashboardResult = await getTeacherDashboard();
      if (dashboardResult.success) {
        setAssignedClasses(dashboardResult.data.assignedClasses);
        setAssignedSubjects(dashboardResult.data.assignedSubjects);
      }

      // Load attendance data for assigned classes
      const termsResult = await listTerms();
      if (termsResult.success && termsResult.data.length > 0) {
        const currentTerm = termsResult.data[0];
        const attendancePromises = dashboardResult.success 
          ? dashboardResult.data.assignedClasses.map((cls: Class) => 
              getClassAttendanceSummary(cls.id, currentTerm.id)
            )
          : [];
        
        const attendanceResults = await Promise.all(attendancePromises);
        const attendanceMap: {[key: string]: number} = {};
        
        attendanceResults.forEach((result, index) => {
          if (result.success && dashboardResult.success) {
            const cls = dashboardResult.data.assignedClasses[index];
            attendanceMap[cls.id] = result.data.averageAttendancePercentage;
          }
        });
        
        setAttendanceData(attendanceMap);
      }
    } catch (error) {
      console.error('Failed to load teacher data');
    } finally {
      setLoading(false);
    }
  }

  const scheduleForDay = mockSchedule.filter(item => item.day === selectedDay);

  if (!user || (user.role !== 'TEACHER' && user.role !== 'SUPER_ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-600">Access Denied</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading schedule...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">My Schedule</h1>
        <p className="text-gray-600">
          Welcome, {user.firstName} {user.lastName}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{assignedClasses.length}</div>
          <div className="text-sm text-gray-600">Classes</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{assignedSubjects.length}</div>
          <div className="text-sm text-gray-600">Subjects</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">{mockSchedule.length}</div>
          <div className="text-sm text-gray-600">Weekly Periods</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-600">
            {Object.values(attendanceData).length > 0
              ? (Object.values(attendanceData).reduce((a, b) => a + b, 0) / Object.values(attendanceData).length).toFixed(1)
              : 0}%
          </div>
          <div className="text-sm text-gray-600">Avg Attendance</div>
        </div>
      </div>

      {/* Day Selector */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-lg font-medium ${
                selectedDay === day
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule for Selected Day */}
      <div className="bg-white border rounded-lg shadow-sm mb-8">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">{selectedDay}'s Schedule</h2>
        </div>
        <div className="p-4">
          {scheduleForDay.length > 0 ? (
            <div className="space-y-3">
              {scheduleForDay.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-20 font-medium text-gray-600">{item.time}</div>
                    <div>
                      <div className="font-semibold">{item.subject}</div>
                      <div className="text-sm text-gray-500">{item.class} • {item.room}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/teacher/attendance?class=${item.class}`}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                    >
                      Attendance
                    </Link>
                    <Link
                      href={`/dashboard/teacher/exams?class=${item.class}`}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                    >
                      Results
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No classes scheduled for {selectedDay}
            </div>
          )}
        </div>
      </div>

      {/* Assigned Classes Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">My Classes</h2>
          {assignedClasses.length > 0 ? (
            <div className="space-y-3">
              {assignedClasses.map((cls) => (
                <div key={cls.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{cls.name}</div>
                      <div className="text-sm text-gray-500">
                        Grade {cls.grade} • {cls.academicYear.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-blue-600">
                        {attendanceData[cls.id]?.toFixed(1) || 0}% Attendance
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No classes assigned yet.</p>
          )}
        </div>

        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">My Subjects</h2>
          {assignedSubjects.length > 0 ? (
            <div className="space-y-3">
              {assignedSubjects.map((subject) => (
                <div key={subject.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium">{subject.name}</div>
                  {subject.code && (
                    <div className="text-sm text-gray-500">Code: {subject.code}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No subjects assigned yet.</p>
          )}
        </div>
      </div>

      {/* Weekly Overview Table */}
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">Weekly Overview</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 text-left border-b">Day</th>
                <th className="p-3 text-center border-b">Classes</th>
                <th className="p-3 text-left border-b">Subjects</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => {
                const daySchedule = mockSchedule.filter(item => item.day === day);
                const uniqueSubjects = [...new Set(daySchedule.map(item => item.subject))];
                
                return (
                  <tr key={day} className="hover:bg-gray-50">
                    <td className="p-3 border-b font-medium">{day}</td>
                    <td className="p-3 border-b text-center">{daySchedule.length} periods</td>
                    <td className="p-3 border-b">{uniqueSubjects.join(', ') || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/dashboard/teacher/attendance"
          className="p-4 bg-blue-50 rounded-lg text-center hover:bg-blue-100"
        >
          <div className="font-medium text-blue-700">Mark Attendance</div>
        </Link>
        <Link
          href="/dashboard/teacher/exams"
          className="p-4 bg-green-50 rounded-lg text-center hover:bg-green-100"
        >
          <div className="font-medium text-green-700">Enter Results</div>
        </Link>
        <Link
          href="/dashboard/teacher"
          className="p-4 bg-purple-50 rounded-lg text-center hover:bg-purple-100"
        >
          <div className="font-medium text-purple-700">My Dashboard</div>
        </Link>
        <Link
          href="/teacher/reports"
          className="p-4 bg-orange-50 rounded-lg text-center hover:bg-orange-100"
        >
          <div className="font-medium text-orange-700">View Reports</div>
        </Link>
      </div>
    </div>
  );
}
