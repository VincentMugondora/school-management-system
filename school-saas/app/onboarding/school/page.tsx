import Link from 'next/link';

export default function OnboardingSchoolPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900">School Required</h1>
        <p className="mt-3 text-gray-600">
          Your account needs to be associated with a school before you can continue.
        </p>
        <p className="mt-2 text-gray-600">
          Please complete account setup to select or create a school.
        </p>

        <div className="mt-6">
          <Link
            href="/setup"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
          >
            Continue to Setup
          </Link>
        </div>
      </div>
    </div>
  );
}
