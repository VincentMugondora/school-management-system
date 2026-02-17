'use client';

import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Building2,
  UserCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Mail,
} from 'lucide-react';

/**
 * Waiting for Approval Page
 *
 * Displayed to users who have requested access but are still pending approval.
 * Shows role, school info, and polls for approval status.
 *
 * @page app/waiting-approval/page.tsx
 */

interface PendingRequest {
  id: string;
  role: string;
  school: {
    id: string;
    name: string;
    slug: string;
  } | null;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export default function WaitingForApprovalPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  const [request, setRequest] = useState<PendingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [isChecking, setIsChecking] = useState(false);

  // Fetch pending request on mount
  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/sign-in');
      return;
    }

    fetchPendingRequest();
  }, [isLoaded, user, router]);

  // Poll for status changes every 10 seconds
  useEffect(() => {
    if (!request || request.status !== 'PENDING') return;

    const interval = setInterval(() => {
      checkStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [request?.id, request?.status]);

  async function fetchPendingRequest() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/pending-request');

      if (!response.ok) {
        if (response.status === 404) {
          // No pending request found
          router.push('/dashboard');
          return;
        }
        throw new Error('Failed to fetch pending request');
      }

      const data = await response.json();

      if (data.status === 'APPROVED') {
        // User was approved, redirect to dashboard
        router.push('/dashboard');
        return;
      }

      if (data.status === 'REJECTED') {
        setRequest({
          ...data,
          status: 'REJECTED',
        });
      } else {
        setRequest({
          ...data,
          status: 'PENDING',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus() {
    if (isChecking) return;

    try {
      setIsChecking(true);

      const response = await fetch('/api/auth/pending-request');

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setLastChecked(new Date());

      if (data.status === 'APPROVED') {
        // Redirect to dashboard on approval
        router.push('/dashboard');
        return;
      }

      if (data.status === 'REJECTED' && request?.status === 'PENDING') {
        // Update UI to show rejection
        setRequest({
          ...data,
          status: 'REJECTED',
        });
      }
    } catch {
      // Silent fail on polling
    } finally {
      setIsChecking(false);
    }
  }

  async function handleCancelRequest() {
    if (!request) return;

    if (!confirm('Are you sure you want to cancel your access request?')) {
      return;
    }

    try {
      const response = await fetch('/api/auth/cancel-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: request.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel request');
      }

      // Sign out after cancellation
      await signOut();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel request');
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={fetchPendingRequest}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!request) {
    return null;
  }

  // Rejected state
  if (request.status === 'REJECTED') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Request Rejected
          </h1>

          <p className="text-gray-500 text-center mb-6">
            Your access request has been rejected by the school administrator.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
            <div className="flex items-center gap-3">
              <UserCircle className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Requested Role</p>
                <p className="font-medium text-gray-900">{request.role}</p>
              </div>
            </div>

            {request.school && (
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">School</p>
                  <p className="font-medium text-gray-900">
                    {request.school.name}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/request-access')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
            >
              Request Access to Different School
            </button>

            <button
              onClick={handleSignOut}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors font-medium"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pending state (default)
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-600 animate-pulse" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Waiting for Approval
          </h1>

          <p className="text-gray-500">
            Your access request is being reviewed by the school administrator.
          </p>
        </div>

        {/* Request Details */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
              <UserCircle className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Requested Role</p>
              <p className="font-semibold text-gray-900">{request.role}</p>
            </div>
          </div>

          {request.school && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">School</p>
                <p className="font-semibold text-gray-900">
                  {request.school.name}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-semibold text-gray-900">
                {user?.primaryEmailAddress?.emailAddress || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Requested At</p>
              <p className="font-semibold text-gray-900">
                {new Date(request.requestedAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Status Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">What happens next?</p>
              <ul className="text-sm text-amber-700 mt-1 space-y-1">
                <li>• An administrator will review your request</li>
                <li>• You will receive email notification when approved</li>
                <li>• This page will automatically redirect you</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Polling Status */}
        <div className="flex items-center justify-between text-sm text-gray-400 mb-6">
          <span className="flex items-center gap-2">
            {isChecking ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking status...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3" />
                Last checked: {lastChecked.toLocaleTimeString()}
              </>
            )}
          </span>
          <button
            onClick={checkStatus}
            disabled={isChecking}
            className="text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleCancelRequest}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium border border-red-200"
          >
            <XCircle className="w-4 h-4" />
            Cancel Request
          </button>

          <button
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Need help? Contact your school administrator
        </p>
      </div>
    </div>
  );
}
