import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { Role } from '@prisma/client';
import {
  Building2,
  Plus,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  GraduationCap,
  Calendar,
} from 'lucide-react';

/**
 * SuperAdmin Schools List Page
 *
 * Displays all schools in the system with pagination.
 * Only accessible to SUPERADMIN users.
 *
 * @page app/dashboard/superadmin/schools/page.tsx
 */

const ITEMS_PER_PAGE = 10;

interface SchoolsPageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

async function getSchoolsData(page: number, searchQuery: string = '') {
  const skip = (page - 1) * ITEMS_PER_PAGE;

  const whereClause = searchQuery
    ? {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' as const } },
          { address: { contains: searchQuery, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [schools, totalSchools] = await Promise.all([
    prisma.school.findMany({
      where: whereClause,
      skip,
      take: ITEMS_PER_PAGE,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            students: true,
          },
        },
      },
    }),
    prisma.school.count({ where: whereClause }),
  ]);

  const totalPages = Math.ceil(totalSchools / ITEMS_PER_PAGE);

  return {
    schools,
    totalSchools,
    totalPages,
    currentPage: page,
  };
}

export default async function SchoolsListPage({
  searchParams,
}: SchoolsPageProps) {
  // Verify SUPERADMIN access
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect('/sign-in');
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true },
  });

  if (!user || user.role !== Role.SUPER_ADMIN) {
    redirect('/dashboard/admin');
  }

  // Parse query params
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const searchQuery = params.search || '';

  // Fetch schools data
  const { schools, totalSchools, totalPages } = await getSchoolsData(
    currentPage,
    searchQuery
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schools</h1>
          <p className="text-gray-500 mt-1">
            Manage all schools in the system
          </p>
        </div>
        <Link
          href="/dashboard/superadmin/schools/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Create School
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <form className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            name="search"
            defaultValue={searchQuery}
            placeholder="Search schools by name or address..."
            className="w-full pl-12 pr-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Schools Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  School
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Contact
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                  Users
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                  Students
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schools.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No schools found</p>
                    <p className="text-sm mt-1">
                      {searchQuery
                        ? 'Try adjusting your search terms'
                        : 'Create your first school to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                schools.map((school) => {
                  const isActive = school._count.users > 0;

                  return (
                    <tr key={school.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {school.name}
                            </p>
                            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                              {school.address || 'No address provided'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Created{' '}
                              {new Date(
                                school.createdAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900">
                            {school.email || 'No email'}
                          </p>
                          <p className="text-gray-500 mt-0.5">
                            {school.phone || 'No phone'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                          <Users className="w-4 h-4" />
                          <span className="font-medium">
                            {school._count.users}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                          <GraduationCap className="w-4 h-4" />
                          <span className="font-medium">
                            {school._count.students}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                            isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isActive ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          />
                          {isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link
                          href={`/dashboard/superadmin/schools/${school.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing{' '}
              <span className="font-medium">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>{' '}
              -{' '}
              <span className="font-medium">
                {Math.min(
                  currentPage * ITEMS_PER_PAGE,
                  totalSchools
                )}
              </span>{' '}
              of <span className="font-medium">{totalSchools}</span> schools
            </p>
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/dashboard/superadmin/schools?page=${
                    currentPage - 1
                  }${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/dashboard/superadmin/schools?page=${
                    currentPage + 1
                  }${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
