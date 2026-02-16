import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { Role, Gender } from '@prisma/client';
import { StudentSearch } from './_components/StudentSearch';
import { StudentFilters } from './_components/StudentFilters';
import { StudentTable } from './_components/StudentTable';
import { Pagination } from './_components/Pagination';
import { Plus, Users } from 'lucide-react';

interface StudentsPageProps {
  searchParams: {
    search?: string;
    gender?: Gender;
    status?: string;
    classId?: string;
    page?: string;
    limit?: string;
  };
}

async function getStudentsData(
  schoolId: string,
  searchParams: StudentsPageProps['searchParams']
) {
  const page = parseInt(searchParams.page || '1', 10);
  const limit = parseInt(searchParams.limit || '20', 10);
  const skip = (page - 1) * limit;

  const where = {
    schoolId,
    deletedAt: null,
    ...(searchParams.search && {
      OR: [
        { firstName: { contains: searchParams.search, mode: 'insensitive' as const } },
        { lastName: { contains: searchParams.search, mode: 'insensitive' as const } },
        { studentId: { contains: searchParams.search, mode: 'insensitive' as const } },
      ],
    }),
    ...(searchParams.gender && { gender: searchParams.gender }),
    ...(searchParams.classId && {
      enrollments: {
        some: {
          classId: searchParams.classId,
          status: 'ACTIVE',
        },
      },
    }),
  };

  const [students, total, classes] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        parent: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            class: {
              select: { id: true, name: true, grade: true },
            },
            academicYear: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    }),
    prisma.student.count({ where }),
    prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true, grade: true },
      orderBy: { grade: 'asc' },
    }),
  ]);

  return {
    students,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    classes,
  };
}

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const session = await auth();

  if (!session.userId) {
    redirect('/sign-in');
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: session.userId },
    include: { school: true },
  });

  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    redirect('/unauthorized');
  }

  if (!user.schoolId) {
    redirect('/no-school');
  }

  const data = await getStudentsData(user.schoolId, searchParams);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Students
          </h1>
          <p className="text-gray-500 mt-1">
            Manage all students in your school
          </p>
        </div>
        <Link
          href="/admin/students/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Total Students</p>
          <p className="text-2xl font-bold text-gray-900">{data.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Active Enrollments</p>
          <p className="text-2xl font-bold text-green-600">
            {data.students.filter((s) => s.enrollments.length > 0).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="-sm text-gray-500">With Parent Info</p>
          <p className="text-2xl font-bold text-blue-600">
            {data.students.filter((s) => s.parent).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">New This Month</p>
          <p className="text-2xl font-bold text-purple-600">
            {data.students.filter((s) => {
              const created = new Date(s.createdAt);
              const now = new Date();
              return (
                created.getMonth() === now.getMonth() &&
                created.getFullYear() === now.getFullYear()
              );
            }).length}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 space-y-4">
        <StudentSearch initialSearch={searchParams.search} />
        <StudentFilters
          classes={data.classes}
          initialFilters={{
            gender: searchParams.gender,
            classId: searchParams.classId,
          }}
        />
      </div>

      {/* Table */}
      <Suspense fallback={<div className="text-center py-8">Loading students...</div>}>
        <StudentTable students={data.students} />
      </Suspense>

      {/* Pagination */}
      <Pagination
        currentPage={data.page}
        totalPages={data.totalPages}
        total={data.total}
        limit={data.limit}
      />
    </div>
  );
}
