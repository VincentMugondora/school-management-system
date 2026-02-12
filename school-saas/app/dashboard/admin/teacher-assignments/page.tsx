'use client';

import { useState, useEffect } from 'react';
import { Role } from '@prisma/client';
import {
  listTeachers,
  assignTeacherToClass,
  assignTeacherToSubject,
  removeTeacherFromClass,
  removeTeacherFromSubject,
} from '@/app/actions/teacher.actions';
import { listClasses } from '@/app/actions/teacher.actions';
import { listSubjects } from '@/app/actions/teacher.actions';
import { getCurrentUserProfile } from '@/app/actions/user.actions';

interface Teacher {
  id: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  classes: { id: string; name: string; grade: string }[];
  subjects: { id: string; name: string; code: string | null }[];
}

interface Class {
  id: string;
  name: string;
  grade: string;
  stream: string | null;
  classTeacher: { user: { firstName: string | null; lastName: string | null } } | null;
}

interface Subject {
  id: string;
  name: string;
  code: string | null;
  teachers: { id: string; user: { firstName: string | null; lastName: string | null } }[];
}

export default function TeacherAssignmentDashboard() {
  const [user, setUser] = useState<{ role: Role } | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    checkPermissions();
  }, []);

  async function checkPermissions() {
    const result = await getCurrentUserProfile();
    if (result.success) {
      setUser(result.data);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [teachersResult, classesResult, subjectsResult] = await Promise.all([
        listTeachers(),
        listClasses(),
        listSubjects(),
      ]);

      if (teachersResult.success) {
        // Cast teachers with proper types
        setTeachers(teachersResult.data.teachers as unknown as Teacher[]);
      }
      if (classesResult.success) {
        setClasses(classesResult.data.classes as unknown as Class[]);
      }
      if (subjectsResult.success) {
        setSubjects(subjectsResult.data.subjects as unknown as Subject[]);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignToClass(classId: string) {
    if (!selectedTeacher) {
      setError('Please select a teacher');
      return;
    }

    setLoading(true);
    const result = await assignTeacherToClass({ teacherId: selectedTeacher, classId });
    
    if (result.success) {
      setSuccess('Teacher assigned to class');
      await loadData();
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleRemoveFromClass(classId: string) {
    setLoading(true);
    const result = await removeTeacherFromClass(classId);
    
    if (result.success) {
      setSuccess('Teacher removed from class');
      await loadData();
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleAssignToSubject(subjectId: string) {
    if (!selectedTeacher) {
      setError('Please select a teacher');
      return;
    }

    setLoading(true);
    const result = await assignTeacherToSubject({ teacherId: selectedTeacher, subjectId });
    
    if (result.success) {
      setSuccess('Teacher assigned to subject');
      await loadData();
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleRemoveFromSubject(subjectId: string) {
    if (!selectedTeacher) {
      setError('Please select a teacher');
      return;
    }

    setLoading(true);
    const result = await removeTeacherFromSubject(selectedTeacher, subjectId);
    
    if (result.success) {
      setSuccess('Teacher removed from subject');
      await loadData();
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return <div>Access Denied. Only administrators can access this dashboard.</div>;
  }

  const selectedTeacherData = teachers.find(t => t.id === selectedTeacher);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Teacher Assignment Dashboard</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

      {/* Teacher Selection */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Select Teacher</h2>
        <select
          className="w-full p-2 border rounded"
          value={selectedTeacher || ''}
          onChange={(e) => setSelectedTeacher(e.target.value || null)}
        >
          <option value="">Select a teacher...</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.user.firstName} {teacher.user.lastName} ({teacher.user.email})
            </option>
          ))}
        </select>
      </div>

      {selectedTeacherData && (
        <div className="mb-6 p-4 bg-blue-50 rounded">
          <h3 className="font-semibold">Selected Teacher:</h3>
          <p>{selectedTeacherData.user.firstName} {selectedTeacherData.user.lastName}</p>
          <p className="text-sm text-gray-600">{selectedTeacherData.user.email}</p>
          
          <div className="mt-3">
            <h4 className="font-medium">Currently Assigned Classes:</h4>
            <ul className="list-disc ml-5">
              {selectedTeacherData.classes.map((cls) => (
                <li key={cls.id}>{cls.name} (Grade {cls.grade})</li>
              ))}
              {selectedTeacherData.classes.length === 0 && <li>None</li>}
            </ul>
          </div>

          <div className="mt-3">
            <h4 className="font-medium">Currently Assigned Subjects:</h4>
            <ul className="list-disc ml-5">
              {selectedTeacherData.subjects.map((subj) => (
                <li key={subj.id}>{subj.name}</li>
              ))}
              {selectedTeacherData.subjects.length === 0 && <li>None</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Classes Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Assign to Class (as Class Teacher)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <div key={cls.id} className="border p-4 rounded">
              <h3 className="font-medium">{cls.name}</h3>
              <p className="text-sm text-gray-600">Grade {cls.grade}</p>
              {cls.stream && <p className="text-sm text-gray-600">Stream: {cls.stream}</p>}
              
              {cls.classTeacher ? (
                <div className="mt-2">
                  <p className="text-sm text-green-600">
                    Teacher: {cls.classTeacher.user.firstName} {cls.classTeacher.user.lastName}
                  </p>
                  <button
                    onClick={() => handleRemoveFromClass(cls.id)}
                    disabled={loading}
                    className="mt-2 text-red-600 text-sm hover:underline"
                  >
                    Remove Teacher
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleAssignToClass(cls.id)}
                  disabled={loading || !selectedTeacher}
                  className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                >
                  Assign Selected Teacher
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Subjects Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Assign to Subject</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => {
            const isAssigned = selectedTeacherData?.subjects.some(s => s.id === subject.id);
            
            return (
              <div key={subject.id} className="border p-4 rounded">
                <h3 className="font-medium">{subject.name}</h3>
                {subject.code && <p className="text-sm text-gray-600">Code: {subject.code}</p>}
                
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Assigned Teachers: {subject.teachers.length}
                  </p>
                  
                  {isAssigned ? (
                    <button
                      onClick={() => handleRemoveFromSubject(subject.id)}
                      disabled={loading}
                      className="mt-2 text-red-600 text-sm hover:underline"
                    >
                      Remove Selected Teacher
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAssignToSubject(subject.id)}
                      disabled={loading || !selectedTeacher}
                      className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                    >
                      Assign Selected Teacher
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
