'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  XCircle,
  Mail,
  Phone,
  LogOut,
  Shield,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';

/**
 * Onboarding Rejected Page
 *
 * Displayed to users whose account has been rejected.
 * Explains the rejection and provides contact information.
 *
 * @page app/onboarding/rejected/page.tsx
 */

export default function OnboardingRejectedPage() {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Main Card */}
        <div className="overflow-hidden rounded-xl bg-white shadow-lg">
          {/* Header */}
          <div className="bg-red-600 px-6 py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <XCircle className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Account Rejected</h1>
            <p className="mt-2 text-red-100">
              Your account request has been declined
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            {/* Status Badge */}
            <div className="mb-6 flex items-center justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-medium text-red-800">
                <AlertTriangle className="h-4 w-4" />
                Access Denied
              </span>
            </div>

            {/* Explanation */}
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Shield className="h-4 w-4" />
                What does this mean?
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                After reviewing your account request, the school administrator has decided 
                not to grant you access to the system. This decision is final and cannot 
                be appealed through this portal.
              </p>
            </div>

            {/* Possible Reasons */}
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <HelpCircle className="h-4 w-4" />
                Common reasons for rejection:
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-400" />
                  <span>Invalid or unverified email address</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-400" />
                  <span>Not affiliated with the school</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-400" />
                  <span>Duplicate account request</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-400" />
                  <span>Incorrect role selected</span>
                </li>
              </ul>
            </div>

            {/* Contact Information */}
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-blue-900">
                Need help or have questions?
              </h3>
              <p className="mb-4 text-sm text-blue-700">
                Contact your school administrator for more information about this decision.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-blue-800">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span>Contact your school&apos;s IT department or administration office</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-blue-800">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>Visit the school in person to verify your identity</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white hover:bg-red-700"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          If you believe this is an error, please contact your school administrator directly.
        </p>
      </div>
    </div>
  );
}
