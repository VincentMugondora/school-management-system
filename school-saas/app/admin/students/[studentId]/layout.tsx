'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, User, BookOpen, Calendar, FileText, DollarSign, Users } from 'lucide-react';

interface StudentLayoutProps {
  children: React.ReactNode;
  params: Promise<{ studentId: string }>;
}

const tabs = [
  { name: 'Overview', href: '', icon: User },
  { name: 'Academic History', href: '/academic-history', icon: BookOpen },
  { name: 'Attendance', href: '/attendance', icon: Calendar },
  { name: 'Results', href: '/results', icon: FileText },
  { name: 'Fees', href: '/fees', icon: DollarSign },
  { name: 'Guardians', href: '/guardians', icon: Users },
];

export default async function StudentLayout({ children, params }: StudentLayoutProps) {
  const pathname = usePathname();
  const { studentId } = await params;
  const basePath = `/admin/students/${studentId}`;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/students"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Student Profile</h1>
          <p className="text-gray-500 mt-1">View and manage student information</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex gap-1">
          {tabs.map((tab) => {
            const href = `${basePath}${tab.href}`;
            const isActive = pathname === href || (tab.href === '' && pathname === basePath);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.name}
                href={href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
