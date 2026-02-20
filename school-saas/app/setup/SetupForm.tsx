'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createUserProfile, getAvailableSchools } from './actions';
type Role = 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN' | 'SUPER_ADMIN' | 'ACCOUNTANT';

interface School {
  id: string;
  name: string;
  slug: string;
}

interface SetupFormProps {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  isFirstUser: boolean;
}

const roleLabels: Record<Role, string> = {
  STUDENT: 'Student',
  TEACHER: 'Teacher',
  PARENT: 'Parent',
  ADMIN: 'School Administrator',
  SUPER_ADMIN: 'Super Administrator',
  ACCOUNTANT: 'Accountant',
};

export default function SetupForm({ 
  clerkId, 
  email, 
  firstName, 
  lastName, 
  isFirstUser 
}: SetupFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: email || '',
    firstName: firstName || '',
    lastName: lastName || '',
    phone: '',
    schoolName: '',
    role: Role.STUDENT,
    schoolId: '',
  });
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available schools for non-first users
  useEffect(() => {
    if (!isFirstUser) {
      getAvailableSchools().then((result) => {
        if (result.success && result.schools) {
          setSchools(result.schools);
        }
      });
    }
  }, [isFirstUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createUserProfile({
        clerkId,
        ...formData,
        isFirstUser,
      });

      if (result.success && result.data) {
        // Redirect based on approval status
        if (result.data.status === 'APPROVED') {
          router.push('/dashboard');
        } else {
          router.push('/waiting-approval');
        }
      } else {
        setError(result.error || 'Failed to create profile');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            First Name
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Last Name
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Phone (Optional)
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {isFirstUser ? (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              School Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.schoolName}
              onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
              placeholder="e.g., Harare High School"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              required={isFirstUser}
            />
            <p className="mt-1 text-xs text-gray-500">Your school will be created with you as administrator</p>
          </div>

          <div className="rounded-md bg-indigo-50 p-3 text-sm text-indigo-700">
            <strong>Role:</strong> Super Administrator (Full system access)
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              I want to join as a <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              required
            >
              {Object.entries(roleLabels).map(([role, label]) => (
                <option key={role} value={role}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Select School <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.schoolId}
              onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              required
            >
              <option value="">Select a school...</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Your account will be pending approval from the school administrator
            </p>
          </div>

          <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">
            <strong>Note:</strong> Your account will require approval before you can access the dashboard.
          </div>
        </>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Creating Profile...' : (isFirstUser ? 'Complete Setup' : 'Request Access')}
      </button>
    </form>
  );
}
