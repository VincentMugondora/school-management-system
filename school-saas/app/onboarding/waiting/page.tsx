'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Building2,
  UserCircle,
  CheckCircle2,
  Loader2,
  LogOut,
  Shield,
  School,
} from 'lucide-react';
import { checkUserApproval } from './actions';

/**
 * Onboarding Waiting Page
 *
 * Displayed to users pending approval after signup.
 * Polls for status changes and auto-redirects when approved.
 *
 * @page app/onboarding/waiting/page.tsx
 */

interface UserStatus {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  role: string;
  schoolName: string | null;
  requestedAt: string;
}

export default function OnboardingWaitingPage() {
  const { signOut } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [isChecking, setIsChecking] = useState(false);

  // Initial load
  useEffect(() => {
    fetchStatus();
  }, []);

  // Poll every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      pollStatus();
    }, 10000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function fetchStatus() {
    try {
      setLoading(true);
      const result = await checkUserApproval();

      if (result.success && result.data) {
        setStatus(result.data);
      } else {
        setError(result.error || 'Failed to check status');
      }
    } catch {
      setError('Unable to check approval status');
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  }

  async function pollStatus() {
    if (isChecking) return;

    try {
      setIsChecking(true);
      const result = await checkUserApproval();

      if (result.success && result.data) {
        setStatus(result.data);
        setLastChecked(new Date());
      }
    } catch (err) {
      console.error('Polling error:', err);
    } finally {
      setIsChecking(false);
    }
  }

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-indigo-600" />
          <p className="mt-4 text-gray-600">Loading your request...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">Error</h2>
          <p className="mb-6 text-gray-600">{error}</p>
          <button
            onClick={fetchStatus}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const approver = status?.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'School Administrator';
  const isApproved = status?.status === 'APPROVED';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Main Card */}
        <div className="overflow-hidden rounded-xl bg-white shadow-lg">
          {/* Header */}
          <div className="bg-indigo-600 px-6 py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <Clock className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Approval Pending</h1>
            <p className="mt-2 text-indigo-100">Your account request is being reviewed</p>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            {/* Status Badge */}
            <div className="mb-6 flex items-center justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-800">
                <Loader2 className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                Waiting for approval
              </span>
            </div>

            {/* Info Cards */}
            <div className="mb-6 space-y-3">
              {status?.schoolName && (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <School className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">School</p>
                    <p className="font-medium text-gray-900">{status.schoolName}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <UserCircle className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Requested Role</p>
                  <p className="font-medium text-gray-900">{status?.role || 'Unknown'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <Building2 className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Approver</p>
                  <p className="font-medium text-gray-900">{approver}</p>
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div className="mb-6 rounded-lg bg-blue-50 px-4 py-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900">
                <Shield className="h-4 w-4" />
                What happens next?
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>The {approver.toLowerCase()} will review your request</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>You will be notified when your account is approved</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Once approved, you can proceed to your dashboard</span>
                </li>
              </ul>
            </div>

            {isApproved && (
              <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-sm font-medium text-emerald-900">
                  Your account is approved.
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  Continue to your dashboard.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            )}

            {/* Polling Status */}
            <div className="mb-6 flex items-center justify-center gap-2 text-xs text-gray-500">
              <Loader2 className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
              <span>Last checked: {lastChecked.toLocaleTimeString()}</span>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={pollStatus}
                disabled={isChecking}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Loader2 className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                Check Now
              </button>
              <button
                onClick={handleLogout}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 font-medium text-red-700 hover:bg-red-100"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Need help? Contact your school administrator or support team.
        </p>
      </div>
    </div>
  );
}
