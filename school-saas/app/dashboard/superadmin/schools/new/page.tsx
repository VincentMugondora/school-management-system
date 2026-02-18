'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSchoolWithAdmin, CreateSchoolResult } from './actions';
import {
  Building2,
  ArrowLeft,
  UserPlus,
  School,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

/**
 * Create School Page
 *
 * Form to create a new school with an initial admin user.
 * Includes validation and success redirect.
 *
 * @page app/dashboard/superadmin/schools/new/page.tsx
 */

interface FormData {
  schoolName: string;
  schoolSlug: string;
  schoolEmail: string;
  schoolPhone: string;
  schoolAddress: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminClerkId: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function CreateSchoolPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CreateSchoolResult | null>(null);
  const [formData, setFormData] = useState<FormData>({
    schoolName: '',
    schoolSlug: '',
    schoolEmail: '',
    schoolPhone: '',
    schoolAddress: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
    adminClerkId: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  };

  const handleSchoolNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      schoolName: name,
      schoolSlug: prev.schoolSlug || generateSlug(name),
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);
    setErrors({});

    try {
      const response = await createSchoolWithAdmin(formData);
      setResult(response);

      if (response.success && response.data) {
        // Redirect to schools list after short delay
        setTimeout(() => {
          router.push('/dashboard/superadmin/schools');
          router.refresh();
        }, 1500);
      } else if (response.fieldErrors) {
        setErrors(response.fieldErrors);
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const InputField = ({
    label,
    name,
    type = 'text',
    icon: Icon,
    required = false,
    placeholder = '',
    value,
    onChange,
    error,
  }: {
    label: string;
    name: string;
    type?: string;
    icon: React.ElementType;
    required?: boolean;
    placeholder?: string;
    value: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange || handleChange}
          placeholder={placeholder}
          className={`w-full pl-10 pr-4 py-2.5 bg-white rounded-lg border ${
            error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-100'
          } focus:outline-none focus:ring-2 transition-colors`}
          required={required}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/superadmin/schools"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New School</h1>
          <p className="text-gray-500 mt-1">
            Add a new school with an initial administrator
          </p>
        </div>
      </div>

      {/* Success Message */}
      {result?.success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800">School created successfully!</p>
            <p className="text-sm text-green-600">Redirecting to schools list...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {result?.error && !result.success && !result.fieldErrors && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-medium text-red-800">Error</p>
            <p className="text-sm text-red-600">{result.error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* School Information Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <School className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">School Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <InputField
                label="School Name"
                name="schoolName"
                icon={Building2}
                required
                placeholder="e.g., Lincoln High School"
                value={formData.schoolName}
                onChange={handleSchoolNameChange}
                error={errors.schoolName}
              />
            </div>

            <div>
              <InputField
                label="School Slug"
                name="schoolSlug"
                icon={Building2}
                required
                placeholder="e.g., lincoln-high"
                value={formData.schoolSlug}
                error={errors.schoolSlug}
              />
              <p className="mt-1 text-xs text-gray-500">
                Used in URLs. Only lowercase letters, numbers, and hyphens.
              </p>
            </div>

            <InputField
              label="School Email"
              name="schoolEmail"
              type="email"
              icon={Mail}
              placeholder="contact@school.edu"
              value={formData.schoolEmail}
              error={errors.schoolEmail}
            />

            <InputField
              label="School Phone"
              name="schoolPhone"
              icon={Phone}
              placeholder="+1 (555) 123-4567"
              value={formData.schoolPhone}
              error={errors.schoolPhone}
            />

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                School Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <textarea
                  name="schoolAddress"
                  value={formData.schoolAddress}
                  onChange={handleChange}
                  placeholder="123 Education Street, City, State, ZIP"
                  rows={3}
                  className="w-full pl-10 pr-4 py-2.5 bg-white rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-indigo-100 focus:outline-none focus:ring-2 transition-colors resize-none"
                />
              </div>
              {errors.schoolAddress && (
                <p className="mt-1 text-sm text-red-600">{errors.schoolAddress}</p>
              )}
            </div>
          </div>
        </div>

        {/* Admin Information Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Initial Administrator</h2>
              <p className="text-sm text-gray-500">
                This person will be the first admin of the school
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField
              label="Admin Email"
              name="adminEmail"
              type="email"
              icon={Mail}
              required
              placeholder="admin@school.edu"
              value={formData.adminEmail}
              error={errors.adminEmail}
            />

            <InputField
              label="Clerk User ID"
              name="adminClerkId"
              icon={UserPlus}
              required
              placeholder="user_xxxxx"
              value={formData.adminClerkId}
              error={errors.adminClerkId}
            />
            <p className="md:col-span-2 -mt-4 text-xs text-gray-500">
              The Clerk ID is required for authentication. Get it from your Clerk dashboard after the admin signs up.
            </p>

            <InputField
              label="First Name"
              name="adminFirstName"
              icon={UserPlus}
              required
              placeholder="John"
              value={formData.adminFirstName}
              error={errors.adminFirstName}
            />

            <InputField
              label="Last Name"
              name="adminLastName"
              icon={UserPlus}
              required
              placeholder="Doe"
              value={formData.adminLastName}
              error={errors.adminLastName}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/dashboard/superadmin/schools"
            className="px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Create School
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
