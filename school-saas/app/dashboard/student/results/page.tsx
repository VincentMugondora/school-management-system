'use client';

import { useState, useEffect } from 'react';
import { Role } from '@prisma/client';
import { getResultsByStudent, calculateStudentOverallPerformance } from '@/app/actions/exam.actions';
import { getCurrentUserProfile } from '@/app/actions/user.actions';

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

export default function StudentResultsDashboard() {
  const [user, setUser] = useState<{ 
    role: Role; 
    id: string;
    firstName: string | null; 
    lastName: string | null;
    school?: { name: string };
  } | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [performance, setPerformance] = useState<{
    totalExams: number;
    averagePercentage: number;
    highestPercentage: number;
    lowestPercentage: number;
    overallGrade: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Get current user profile
      const userResult = await getCurrentUserProfile();
      if (!userResult.success) {
        setError('Failed to load user profile');
        return;
      }

      const userData = userResult.data;
      setUser(userData);

      // For students, we need to get their student record first
      // Assuming the user has a related student record
      // In a real implementation, you'd fetch the studentId from the user's student relation
      // For now, we'll show a placeholder
      
      // Get results for student
      // Note: In production, you'd get studentId from user.student.id
      const studentId = userData.id; // This is a placeholder - in real app, get from student relation
      
      const [resultsResult, performanceResult] = await Promise.all([
        getResultsByStudent(studentId),
        // We need the current academic year - in production, get this from context
        calculateStudentOverallPerformance(studentId, 'current-year-id'),
      ]);

      if (resultsResult.success) {
        setResults(resultsResult.data as unknown as Result[]);
      }

      if (performanceResult.success) {
        setPerformance(performanceResult.data);
      }
    } catch (err) {
      setError('Failed to load results');
    } finally {
      setLoading(false);
    }
  }

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
        <div className="text-center">Loading your results...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Academic Results</h1>
        <p className="text-gray-600">
          Welcome, {user.firstName} {user.lastName}
        </p>
        {user.school && (
          <p className="text-gray-500 text-sm">{user.school.name}</p>
        )}
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-6">
          {error}
        </div>
      )}

      {/* Performance Overview */}
      {performance && performance.totalExams > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Performance Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 p-4 rounded text-center">
              <div className="text-3xl font-bold text-blue-600">
                {performance.totalExams}
              </div>
              <div className="text-sm text-gray-600">Total Exams</div>
            </div>
            <div className="bg-green-50 p-4 rounded text-center">
              <div className="text-3xl font-bold text-green-600">
                {performance.averagePercentage}%
              </div>
              <div className="text-sm text-gray-600">Average</div>
            </div>
            <div className="bg-purple-50 p-4 rounded text-center">
              <div className="text-3xl font-bold text-purple-600">
                {performance.highestPercentage}%
              </div>
              <div className="text-sm text-gray-600">Highest</div>
            </div>
            <div className="bg-orange-50 p-4 rounded text-center">
              <div className="text-3xl font-bold text-orange-600">
                {performance.lowestPercentage}%
              </div>
              <div className="text-sm text-gray-600">Lowest</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {performance.overallGrade}
              </div>
              <div className="text-sm text-gray-600">Overall Grade</div>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Exam Results</h2>
        
        {results.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Exam</th>
                  <th className="border p-3 text-left">Subject</th>
                  <th className="border p-3 text-center">Marks</th>
                  <th className="border p-3 text-center">Percentage</th>
                  <th className="border p-3 text-center">Grade</th>
                  <th className="border p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => {
                  const percentage = (result.marks / result.exam.maxMarks) * 100;
                  const isPass = percentage >= 40;
                  
                  return (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="border p-3 font-medium">
                        {result.exam.name}
                      </td>
                      <td className="border p-3">
                        {result.exam.subject.name}
                      </td>
                      <td className="border p-3 text-center">
                        {result.marks} / {result.exam.maxMarks}
                      </td>
                      <td className="border p-3 text-center">
                        {percentage.toFixed(1)}%
                      </td>
                      <td className="border p-3 text-center">
                        <span className={`font-bold ${
                          result.grade === 'A+' || result.grade === 'A' ? 'text-green-600' :
                          result.grade === 'B+' || result.grade === 'B' ? 'text-blue-600' :
                          result.grade === 'C' || result.grade === 'D' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {result.grade}
                        </span>
                      </td>
                      <td className="border p-3 text-center">
                        <span className={`px-2 py-1 rounded text-sm ${
                          isPass 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {isPass ? 'Pass' : 'Fail'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-gray-50 p-8 rounded text-center">
            <p className="text-gray-600 mb-4">No exam results available yet.</p>
            <p className="text-gray-500 text-sm">
              Your results will appear here once your teachers enter them.
            </p>
          </div>
        )}
      </div>

      {/* Grade Scale Reference */}
      <div className="bg-gray-50 p-6 rounded">
        <h3 className="font-semibold mb-4">Grade Scale</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
          <div className="text-center p-2 bg-green-100 rounded">
            <div className="font-bold text-green-700">A+</div>
            <div className="text-gray-600">90-100%</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="font-bold text-green-600">A</div>
            <div className="text-gray-600">80-89%</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="font-bold text-blue-600">B+</div>
            <div className="text-gray-600">70-79%</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="font-bold text-blue-500">B</div>
            <div className="text-gray-600">60-69%</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded">
            <div className="font-bold text-yellow-600">C</div>
            <div className="text-gray-600">50-59%</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded">
            <div className="font-bold text-orange-600">D</div>
            <div className="text-gray-600">40-49%</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <div className="font-bold text-red-600">F</div>
            <div className="text-gray-600">Below 40%</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>For any questions about your results, please contact your class teacher.</p>
      </div>
    </div>
  );
}
