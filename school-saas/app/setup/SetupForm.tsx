'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserProfile } from './actions';

interface SetupFormProps {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  isFirstUser: boolean;
}

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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      if (result.success) {
        router.push('/dashboard');
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

      {isFirstUser && (
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
      )}

      {isFirstUser && (
        <div className="rounded-md bg-indigo-50 p-3 text-sm text-indigo-700">
          <strong>Role:</strong> Super Administrator (Full system access)
        </div>
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
        {loading ? 'Creating Profile...' : 'Complete Setup'}
      </button>
    </form>
  );
}
