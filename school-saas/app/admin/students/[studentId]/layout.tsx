import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { StudentTabs } from './StudentTabs';

interface StudentLayoutProps {
  children: React.ReactNode;
  params: Promise<{ studentId: string }>;
}

export default async function StudentLayout({ children, params }: StudentLayoutProps) {
  const { studentId } = await params;

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

      {/* Tabs - Client Component */}
      <StudentTabs studentId={studentId} />

      {/* Content */}
      {children}
    </div>
  );
}
