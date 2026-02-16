'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Gender } from '@prisma/client';
import { Filter, X } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  grade: string;
}

interface StudentFiltersProps {
  classes: Class[];
  initialFilters: {
    gender?: Gender;
    classId?: string;
  };
}

export function StudentFilters({ classes, initialFilters }: StudentFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.push(`/admin/students?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('gender');
    params.delete('classId');
    params.delete('page');
    router.push(`/admin/students?${params.toString()}`);
  };

  const hasActiveFilters = initialFilters.gender || initialFilters.classId;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-500">Filters:</span>
      </div>

      <select
        value={initialFilters.gender || ''}
        onChange={(e) => handleFilterChange('gender', e.target.value)}
        className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        aria-label="Filter by gender"
      >
        <option value="">All Genders</option>
        <option value="MALE">Male</option>
        <option value="FEMALE">Female</option>
        <option value="OTHER">Other</option>
      </select>

      <select
        value={initialFilters.classId || ''}
        onChange={(e) => handleFilterChange('classId', e.target.value)}
        className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        aria-label="Filter by class"
      >
        <option value="">All Classes</option>
        {classes.map((cls) => (
          <option key={cls.id} value={cls.id}>
            {cls.name} (Grade {cls.grade})
          </option>
        ))}
      </select>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800"
        >
          <X className="w-4 h-4" />
          Clear filters
        </button>
      )}
    </div>
  );
}
