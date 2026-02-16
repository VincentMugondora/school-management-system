'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, required, options, className, ...props }, ref) => {
    return (
      <div className={cn('space-y-1', className)}>
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <select
          ref={ref}
          className={cn(
            'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors bg-white',
            error ? 'border-red-300 bg-red-50' : 'border-gray-200'
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';
