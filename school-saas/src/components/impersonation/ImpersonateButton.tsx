'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Role, UserStatus } from '@prisma/client';

interface ImpersonateButtonProps {
  userId: string;
  userRole: Role;
  userStatus: UserStatus;
  userName?: string;
  disabled?: boolean;
}

export function ImpersonateButton({
  userId,
  userRole,
  userStatus,
  userName,
  disabled = false,
}: ImpersonateButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Rules: Cannot impersonate SUPER_ADMIN, must be APPROVED
  const canImpersonate = userRole !== Role.SUPER_ADMIN && userStatus === UserStatus.APPROVED;
  const isDisabled = disabled || !canImpersonate || isLoading;

  const handleImpersonate = async () => {
    if (!canImpersonate) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/impersonate/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId: userId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Redirect to the target user's dashboard based on their role
        const targetDashboard = getDashboardUrlForRole(data.context.targetRole);
        router.push(targetDashboard);
        router.refresh();
      } else {
        console.error('Failed to start impersonation:', data.error);
        alert(data.error || 'Failed to start impersonation');
      }
    } catch (error) {
      console.error('Error starting impersonation:', error);
      alert('Error starting impersonation');
    } finally {
      setIsLoading(false);
    }
  };

  const getDashboardUrlForRole = (role: Role): string => {
    switch (role) {
      case Role.ADMIN:
        return '/dashboard/admin';
      case Role.TEACHER:
        return '/dashboard/teacher';
      case Role.STUDENT:
        return '/dashboard/student';
      case Role.PARENT:
        return '/dashboard/parent';
      case Role.ACCOUNTANT:
        return '/dashboard/accountant';
      default:
        return '/dashboard';
    }
  };

  if (!canImpersonate) {
    return (
      <button
        disabled
        className="text-gray-400 cursor-not-allowed text-sm"
        title={
          userRole === Role.SUPER_ADMIN
            ? 'Cannot impersonate SUPER_ADMIN'
            : userStatus !== UserStatus.APPROVED
            ? 'Can only impersonate APPROVED users'
            : 'Cannot impersonate'
        }
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </button>
    );
  }

  return (
    <button
      onClick={handleImpersonate}
      disabled={isDisabled}
      className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
      title={`Impersonate ${userName || 'user'}`}
    >
      {isLoading ? (
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
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      )}
    </button>
  );
}
