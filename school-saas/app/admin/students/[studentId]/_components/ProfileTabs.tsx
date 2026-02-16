'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  User,
  GraduationCap,
  Calendar,
  DollarSign,
  Users,
} from 'lucide-react';

type TabId = 'overview' | 'academic' | 'attendance' | 'fees' | 'guardians';

interface ProfileTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs = [
  { id: 'overview' as TabId, label: 'Overview', icon: User },
  { id: 'academic' as TabId, label: 'Academic History', icon: GraduationCap },
  { id: 'attendance' as TabId, label: 'Attendance', icon: Calendar },
  { id: 'fees' as TabId, label: 'Fees', icon: DollarSign },
  { id: 'guardians' as TabId, label: 'Guardians', icon: Users },
];

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex space-x-1" aria-label="Student Profile Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                isActive
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
              aria-current={isActive ? 'page' : undefined}
              role="tab"
              aria-selected={isActive}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
