import { redirect } from 'next/navigation';

/**
 * Onboarding School Page
 * 
 * Redirects to the main setup flow.
 * 
 * @page app/onboarding/school/page.tsx
 */
export default function OnboardingSchoolPage() {
  redirect('/setup');
}
