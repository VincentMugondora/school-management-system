'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  School,
  Calendar,
  FileText,
  DollarSign,
  UserCog,
  Settings,
  ClipboardList,
  BarChart3,
  Shield,
  ChevronDown,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useState } from 'react';
import { User } from '@prisma/client';

interface AdminSidebarProps {
  user: User;
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  {
    name: 'Academics',
    icon: School,
    children: [
      { name: 'Academic Years', href: '/admin/academics/years' },
      { name: 'Classes', href: '/admin/classes' },
      { name: 'Subjects', href: '/admin/subjects' },
    ]
  },
  { name: 'Students', href: '/admin/students', icon: Users },
  { 
    name: 'Enrollments', 
    href: '/admin/enrollments', 
    icon: BookOpen,
    children: [
      { name: 'Current Enrollments', href: '/admin/enrollments/current' },
      { name: 'Promotions', href: '/admin/enrollments/promotions' },
    ]
  },
  { name: 'Staff', href: '/admin/staff', icon: GraduationCap },
  { 
    name: 'Exams & Results', 
    icon: FileText,
    children: [
      { name: 'Exams', href: '/admin/exams' },
      { name: 'Results', href: '/admin/results' },
    ]
  },
  { name: 'Attendance', href: '/admin/attendance', icon: Calendar },
  { name: 'Finance', href: '/admin/finance', icon: DollarSign },
  { name: 'Parents', href: '/admin/parents', icon: UserCog },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { name: 'Users & Roles', href: '/admin/users', icon: Shield },
  { name: 'Audit Logs', href: '/admin/audit', icon: ClipboardList },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>(['Academics', 'Exams & Results']);

  const toggleExpand = (name: string) => {
    setExpanded(prev => 
      prev.includes(name) 
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
            <School className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-800">School Admin</h1>
            <p className="text-xs text-gray-500">Management System</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navigation.map((item) => {
          if (item.children) {
            const isExpanded = expanded.includes(item.name);
            const hasActiveChild = item.children.some(child => isActive(child.href));
            
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleExpand(item.name)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    hasActiveChild 
                      ? 'bg-purple-50 text-purple-700' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon && <item.icon className="w-5 h-5" />}
                    <span>{item.name}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={`block px-4 py-2 rounded-lg text-sm transition-colors ${
                          isActive(child.href)
                            ? 'bg-purple-100 text-purple-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</p>
          </div>
        </div>
        <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
