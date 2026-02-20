'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
type Role = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT' | 'ACCOUNTANT';

interface ImpersonationBannerProps {
  targetUserId?: string;
  targetRole?: Role;
  targetName?: string;
  sessionId: string;
  schoolName?: string;
  isSchoolContext?: boolean;
}

export function ImpersonationBanner({
  targetUserId,
  targetRole,
  targetName,
  sessionId,
  schoolName,
  isSchoolContext = false,
}: ImpersonationBannerProps) {
  const router = useRouter();
  const [isEnding, setIsEnding] = useState(false);

  const handleEndImpersonation = async () => {
    setIsEnding(true);
    try {
      const response = await fetch('/api/superadmin/impersonate/exit', {
        method: 'POST',
      });

      if (response.ok || response.status === 302) {
        router.push('/dashboard/superadmin');
        router.refresh();
      } else {
        console.error('Failed to end impersonation');
      }
    } catch (error) {
      console.error('Error ending impersonation:', error);
    } finally {
      setIsEnding(false);
    }
  };

  const roleColors: Record<Role, string> = {
    SUPER_ADMIN: 'bg-purple-600',
    ADMIN: 'bg-blue-600',
    TEACHER: 'bg-green-600',
    STUDENT: 'bg-yellow-600',
    PARENT: 'bg-pink-600',
    ACCOUNTANT: 'bg-orange-600',
  };

  const displayText = isSchoolContext
    ? `VIEWING: ${schoolName || 'Unknown School'}`
    : `IMPERSONATING: ${targetName || targetUserId?.substring(0, 8)}...`;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <svg
            className="w-5 h-5 animate-pulse"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <span className="font-semibold text-sm">{displayText}</span>
          {targetRole && !isSchoolContext && (
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${roleColors[targetRole]} bg-opacity-90`}
            >
              {targetRole.replace('_', ' ')}
            </span>
          )}
          {isSchoolContext && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-600 bg-opacity-90">
              ADMIN VIEW
            </span>
          )}
        </div>

        <button
          onClick={handleEndImpersonation}
          disabled={isEnding}
          className="flex items-center space-x-2 bg-white text-red-600 px-3 py-1 rounded-md text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEnding ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Ending...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span>Exit Impersonation</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
