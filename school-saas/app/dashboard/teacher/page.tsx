'use client';

import { useState, useEffect } from 'react';
import { Role } from '@prisma/client';
import { getTeacherDashboard } from '@/app/actions/teacher.actions';
import { getCurrentUserProfile } from '@/app/actions/user.actions';

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

export default function TeacherDashboard() {
  const [user, setUser] = useState<{ role: Role; firstName: string | null; lastName: string | null } | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<Class[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Get current user
      const userResult = await getCurrentUserProfile();
      if (userResult.success) {
        setUser(userResult.data);
      }

      // Get teacher dashboard data
      const dashboardResult = await getTeacherDashboard();
      if (dashboardResult.success) {
        setAssignedClasses(dashboardResult.data.assignedClasses);
        setAssignedSubjects(dashboardResult.data.assignedSubjects);
      } else {
        setError(dashboardResult.error);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== Role.TEACHER) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          Access Denied. Only teachers can access this dashboard.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">
        Welcome, {user.firstName} {user.lastName}
      </h1>
      <p className="text-gray-600 mb-6">Teacher Dashboard</p>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Assigned Classes Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">My Classes</h2>
        
        {assignedClasses.length === 0 ? (
          <div className="bg-gray-50 p-4 rounded text-gray-600">
            You are not assigned as a class teacher to any classes yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedClasses.map((cls) => (
              <div key={cls.id} className="bg-blue-50 border border-blue-200 p-4 rounded">
                <h3 className="font-semibold text-lg">{cls.name}</h3>
                <p className="text-gray-600">Grade {cls.grade}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Academic Year: {cls.academicYear.name}
                </p>
                <div className="mt-3 flex gap-2">
                  <button className="text-blue-600 text-sm hover:underline">
                    View Students
                  </button>
                  <button className="text-blue-600 text-sm hover:underline">
                    Take Attendance
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assigned Subjects Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">My Subjects</h2>
        
        {assignedSubjects.length === 0 ? (
          <div className="bg-gray-50 p-4 rounded text-gray-600">
            You are not assigned to any subjects yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedSubjects.map((subject) => (
              <div key={subject.id} className="bg-green-50 border border-green-200 p-4 rounded">
                <h3 className="font-semibold text-lg">{subject.name}</h3>
                {subject.code && (
                  <p className="text-gray-600">Code: {subject.code}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button className="text-green-600 text-sm hover:underline">
                    View Classes
                  </button>
                  <button className="text-green-600 text-sm hover:underline">
                    Create Exam
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Mark Attendance
          </button>
          <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
            Enter Grades
          </button>
          <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
            View Schedule
          </button>
          <button className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
            My Students
          </button>
        </div>
      </div>
    </div>
  );
}
