'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Building2, Enter, X } from 'lucide-react';

interface School {
  id: string;
  name: string;
  status: string;
  _count?: {
    users: number;
    students: number;
    teachers: number;
  };
}

interface SchoolImpersonationPanelProps {
  schools: School[];
}

export function SchoolImpersonationPanel({ schools }: SchoolImpersonationPanelProps) {
  const router = useRouter();
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnterSchool = async (school: School) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/superadmin/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schoolId: school.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to enter school');
      }

      // Redirect to admin dashboard on success
      router.push('/dashboard/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">Impersonation Mode</h3>
            <p className="text-sm text-amber-700 mt-1">
              Entering a school will simulate ADMIN access to that school&apos;s data.
              All actions will be logged for audit purposes. This is intended for
              troubleshooting and support only.
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700">
            <X className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Schools List */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="font-semibold text-gray-900">Available Schools</h2>
          <p className="text-sm text-gray-500">
            Select a school to enter impersonation mode
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {schools.map((school) => (
            <div
              key={school.id}
              className="flex items-center justify-between px-4 py-4 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{school.name}</p>
                  <p className="text-sm text-gray-500">
                    {school._count?.users || 0} users ·{' '}
                    {school._count?.students || 0} students ·{' '}
                    {school._count?.teachers || 0} teachers
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSchool(school)}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Enter className="h-4 w-4" />
                Enter School
              </button>
            </div>
          ))}
        </div>

        {schools.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500">
            No schools available for impersonation.
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-100 p-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Enter {selectedSchool.name}?
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  You are about to impersonate an ADMIN user for this school.
                  Your actions will be logged and visible to the school.
                </p>
                <ul className="mt-3 list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>Session expires after 4 hours</li>
                  <li>Click &quot;Exit Impersonation&quot; to return</li>
                  <li>All actions are audited</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setSelectedSchool(null)}
                disabled={isLoading}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEnterSchool(selectedSchool)}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Entering...
                  </>
                ) : (
                  <>
                    <Enter className="h-4 w-4" />
                    Enter School
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
