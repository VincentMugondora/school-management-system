import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Settings, School, Bell, Shield, Palette } from 'lucide-react';

export default async function SettingsPage() {
  const school = await prisma.school.findFirst();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">System Settings</h1>
          <p className="text-gray-500 mt-1">Configure school and application settings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* School Profile */}
        <Link href="/admin/settings/school" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
            <School className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">School Profile</h3>
          <p className="text-sm text-gray-500 mt-2">School name, address, contact information</p>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600">{school?.name || 'Not configured'}</p>
          </div>
        </Link>

        {/* Branding */}
        <Link href="/admin/settings/branding" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
            <Palette className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Branding</h3>
          <p className="text-sm text-gray-500 mt-2">Logo, colors, custom styling</p>
        </Link>

        {/* Notifications */}
        <Link href="/admin/settings/notifications" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
            <Bell className="w-6 h-6 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
          <p className="text-sm text-gray-500 mt-2">Email, SMS, push notification settings</p>
        </Link>

        {/* Security */}
        <Link href="/admin/settings/security" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Security</h3>
          <p className="text-sm text-gray-500 mt-2">Password policy, session management</p>
        </Link>

        {/* General Settings */}
        <Link href="/admin/settings/general" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
            <Settings className="w-6 h-6 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">General</h3>
          <p className="text-sm text-gray-500 mt-2">Timezone, date format, language</p>
        </Link>
      </div>
    </div>
  );
}
