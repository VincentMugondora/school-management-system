'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GraduationCap, Loader2, AlertCircle } from 'lucide-react';

/**
 * Zod schema for school creation form validation
 */
const schoolFormSchema = z.object({
  name: z
    .string()
    .min(2, 'School name must be at least 2 characters')
    .max(100, 'School name must be less than 100 characters'),
  email: z
    .string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .min(5, 'Phone number must be at least 5 characters')
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal('')),
});

type SchoolFormData = z.infer<typeof schoolFormSchema>;

/**
 * School Onboarding Page
 *
 * This page allows ADMIN users without a school to create their school.
 * Users with an existing school are redirected to the dashboard.
 *
 * @page /onboarding/school
 */
export default function SchoolOnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SchoolFormData>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
    },
  });

  /**
   * Check onboarding status on mount
   * Redirect if user already has a school or is not an admin
   */
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/user/profile');
        const data = await res.json();

        if (!data.success || !data.user) {
          setError('Unable to verify user profile. Please try again.');
          setIsChecking(false);
          return;
        }

        const { role, schoolId } = data.user;

        // Check if user is admin
        const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
        if (!isAdmin) {
          // Non-admin users should not be on onboarding page
          setError('Only administrators can create schools. Redirecting...');
          setTimeout(() => router.push('/dashboard'), 2000);
          return;
        }

        // Check if admin already has a school
        if (schoolId) {
          // Admin already has a school, redirect to dashboard
          router.push('/dashboard/admin');
          return;
        }

        // Admin without school - allow to stay on onboarding page
      } catch {
        setError('Failed to load user profile. Please refresh the page.');
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
  }, [router]);

  /**
   * Handle form submission
   * Posts to /api/onboarding/school and redirects on success
   */
  const onSubmit = async (data: SchoolFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Clean empty strings
      const payload = {
        name: data.name.trim(),
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
      };

      const res = await fetch('/api/onboarding/school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        // Success - redirect to admin dashboard
        router.push('/dashboard/admin');
      } else {
        // API returned error with specific message
        const errorMessage = result.error || 'Failed to create school. Please try again.';
        const errorCode = result.code;

        // Provide more context for specific errors
        if (errorCode === 'SCHOOL_ALREADY_EXISTS') {
          setError('You have already created a school. Only one school is allowed per administrator.');
        } else if (errorCode === 'FORBIDDEN') {
          setError('Only administrators can create schools.');
        } else if (errorCode === 'VALIDATION_ERROR' && result.details) {
          // Format validation errors
          const details = Object.entries(result.details)
            .map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
            .join('; ');
          setError(`Validation failed: ${details}`);
        } else if (errorCode === 'CONFLICT') {
          setError(`School creation conflict: ${errorMessage}`);
        } else {
          setError(errorMessage);
        }
      }
    } catch (err) {
      console.error('School creation error:', err);
      setError('An unexpected error occurred while creating your school. Please try again or contact support if the problem persists.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner while checking status
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#F8F7FC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7FC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Create Your School
          </h1>
          <p className="text-gray-500">
            Set up your school to start managing classes and students
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* School Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              School Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name')}
              type="text"
              id="name"
              placeholder="e.g., Harare High School"
              className={`w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-100 ${
                errors.name
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-200 focus:border-purple-500'
              }`}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="mt-1.5 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              School Email <span className="text-gray-400">(optional)</span>
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              placeholder="school@example.com"
              className={`w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-100 ${
                errors.email
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-200 focus:border-purple-500'
              }`}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Phone Number <span className="text-gray-400">(optional)</span>
            </label>
            <input
              {...register('phone')}
              type="tel"
              id="phone"
              placeholder="+263 12 345 6789"
              className={`w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-100 ${
                errors.phone
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-200 focus:border-purple-500'
              }`}
              disabled={isLoading}
            />
            {errors.phone && (
              <p className="mt-1.5 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating School...
              </>
            ) : (
              'Create School'
            )}
          </button>
        </form>

        {/* Footer Note */}
        <p className="mt-6 text-center text-sm text-gray-500">
          You can only create one school per account.
        </p>
      </div>
    </div>
  );
}
