import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Plus, Users, Shield } from 'lucide-react';

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Users & Roles</h1>
          <p className="text-gray-500 mt-1">Manage system users and permissions</p>
        </div>
        <Link
          href="/admin/users/new"
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New User
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">User</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Role</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-700' :
                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'TEACHER' ? 'bg-blue-100 text-blue-700' :
                    user.role === 'STUDENT' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">No Users</h3>
            <Link
              href="/admin/users/new"
              className="inline-flex items-center gap-2 mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add User
            </Link>
          </div>
        )}
      </div>

      <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-100">
        <h2 className="font-semibold text-gray-800 mb-4">Role Permissions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-lg border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-red-500" />
              <span className="font-medium text-gray-800">Super Admin</span>
            </div>
            <p className="text-sm text-gray-500">Full system access</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-purple-500" />
              <span className="font-medium text-gray-800">Admin</span>
            </div>
            <p className="text-sm text-gray-500">School management access</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-blue-500" />
              <span className="font-medium text-gray-800">Teacher</span>
            </div>
            <p className="text-sm text-gray-500">Class & exam management</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="font-medium text-gray-800">Student</span>
            </div>
            <p className="text-sm text-gray-500">View own records only</p>
          </div>
        </div>
      </div>
    </div>
  );
}
