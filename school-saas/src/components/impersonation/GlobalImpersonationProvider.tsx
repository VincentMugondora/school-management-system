'use client';

import { useEffect, useState } from 'react';
import { ImpersonationBanner } from './ImpersonationBanner';

interface ImpersonationContext {
  isImpersonating: boolean;
  sessionId?: string;
  targetUserId?: string;
  targetRole?: string;
  schoolName?: string;
  isSchoolContext?: boolean;
}

export function GlobalImpersonationProvider({ children }: { children: React.ReactNode }) {
  const [impersonation, setImpersonation] = useState<ImpersonationContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check impersonation status on mount and when storage changes
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/admin/impersonate/status');
        if (response.ok) {
          const data = await response.json();
          setImpersonation(data.isImpersonating ? data : null);
        }
      } catch (error) {
        console.error('Failed to check impersonation status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();

    // Listen for storage events (when impersonation starts/ends in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'impersonation-update') {
        checkStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (loading) {
    return <>{children}</>;
  }

  return (
    <>
      {impersonation?.isImpersonating && (
        <ImpersonationBanner
          sessionId={impersonation.sessionId || ''}
          targetUserId={impersonation.targetUserId}
          targetRole={impersonation.targetRole as any}
          schoolName={impersonation.schoolName}
          isSchoolContext={impersonation.isSchoolContext}
        />
      )}
      {/* Add padding top when banner is visible */}
      <div className={impersonation?.isImpersonating ? 'pt-12' : ''}>
        {children}
      </div>
    </>
  );
}
