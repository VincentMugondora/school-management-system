'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import {
  getStudentById,
  getStudentAcademicHistory,
  getStudentAttendance,
  getStudentFees,
  getStudentGuardians,
} from '@/app/actions/student.actions';
import { ProfileTabs } from './_components/ProfileTabs';
import { OverviewTab } from './_components/OverviewTab';
import { AcademicHistoryTab } from './_components/AcademicHistoryTab';
import { AttendanceTab } from './_components/AttendanceTab';
import { FeesTab } from './_components/FeesTab';
import { GuardiansTab } from './_components/GuardiansTab';
import { use } from 'react';

type TabId = 'overview' | 'academic' | 'attendance' | 'fees' | 'guardians';

interface StudentProfilePageProps {
  params: { studentId: string };
}

interface StudentWithRelations {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  _count: {
    enrollments: number;
    results: number;
    attendances: number;
  };
  enrollments: Array<{
    id: string;
    status: string;
    academicYear: { id: string; name: string };
    class: { id: string; name: string };
  }>;
  parent: {
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  } | null;
}

export default function StudentProfilePage({ params }: StudentProfilePageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { studentId } = params;

  const overviewPromise = use(getStudentById(studentId));
  const academicPromise = use(getStudentAcademicHistory(studentId));
  const attendancePromise = use(getStudentAttendance(studentId));
  const feesPromise = use(getStudentFees(studentId));
  const guardiansPromise = use(getStudentGuardians(studentId));

  if (!overviewPromise.success || !overviewPromise.data) {
    notFound();
  }

  const student = overviewPromise.data as unknown as StudentWithRelations;
  const academicHistory = academicPromise.success && academicPromise.data ? academicPromise.data : [];
  const attendance = attendancePromise.success && attendancePromise.data ? attendancePromise.data : [];
  const fees = feesPromise.success && feesPromise.data ? feesPromise.data : [];
  const guardians = guardiansPromise.success && guardiansPromise.data ? guardiansPromise.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-gray-500 mt-1">
            Admission #: {student.studentId || 'Not assigned'}
          </p>
        </div>
      </div>

      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-6" role="tabpanel">
        {activeTab === 'overview' && <OverviewTab student={student} />}
        {activeTab === 'academic' && <AcademicHistoryTab enrollments={academicHistory} />}
        {activeTab === 'attendance' && <AttendanceTab records={attendance} />}
        {activeTab === 'fees' && <FeesTab invoices={fees} />}
        {activeTab === 'guardians' && <GuardiansTab guardians={guardians} />}
      </div>
    </div>
  );
}
