import { SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <nav className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">SchoolSaaS</h1>
          <div className="flex gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-lg px-4 py-2 text-gray-600 hover:text-gray-900">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
                  Get Started
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
              >
                Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-6 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            School Management
            <span className="text-indigo-600"> Simplified</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            A complete multi-tenant school management system for administrators, teachers,
            students, parents, and accountants.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="rounded-lg bg-indigo-600 px-8 py-3 text-lg font-semibold text-white hover:bg-indigo-700">
                  Start Free Trial
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button className="rounded-lg border-2 border-gray-300 px-8 py-3 text-lg font-semibold text-gray-700 hover:border-gray-400">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="rounded-lg bg-indigo-600 px-8 py-3 text-lg font-semibold text-white hover:bg-indigo-700"
              >
                Go to Dashboard
              </Link>
            </SignedIn>
          </div>
        </section>

        {/* Features */}
        <section className="bg-gray-50 py-24">
          <div className="mx-auto max-w-7xl px-6">
            <h2 className="text-center text-3xl font-bold text-gray-900">
              Everything you need
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: 'Student Management', desc: 'Enrollments, records, and history' },
                { title: 'Academic Structure', desc: 'Classes, subjects, and scheduling' },
                { title: 'Exam & Results', desc: 'Grades and performance tracking' },
                { title: 'Attendance', desc: 'Daily tracking and reports' },
                { title: 'Finance', desc: 'Invoices, payments, and reports' },
                { title: 'Multi-tenant', desc: 'Secure school isolation' },
              ].map((feature) => (
                <div key={feature.title} className="rounded-lg bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                  <p className="mt-2 text-gray-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-8 text-center text-gray-600">
        <p>&copy; 2024 SchoolSaaS. All rights reserved.</p>
      </footer>
    </div>
  );
}
