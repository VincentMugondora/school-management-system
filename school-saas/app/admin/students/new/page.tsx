'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { FormInput } from '@/components/form/FormInput';
import { FormSelect } from '@/components/form/FormSelect';
import { FormTextarea } from '@/components/form/FormTextarea';
import { createStudent } from '@/app/actions/student.actions';

const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  classId: z.string().min(1, 'Class is required'),
  academicYearId: z.string().min(1, 'Academic year is required'),
  parentFirstName: z.string().optional(),
  parentLastName: z.string().optional(),
  parentEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  parentPhone: z.string().optional(),
});

type CreateStudentForm = z.infer<typeof createStudentSchema>;

interface Class {
  id: string;
  name: string;
  grade: string;
}

interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface NewStudentPageProps {
  classes: Class[];
  academicYears: AcademicYear[];
}

export default function NewStudentPage({ classes, academicYears }: NewStudentPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateStudentForm>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      academicYearId: academicYears.find((y) => y.isCurrent)?.id || '',
    },
  });

  const onSubmit = async (data: CreateStudentForm) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createStudent({
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        classId: data.classId,
        academicYearId: data.academicYearId,
      });

      if (result.success) {
        router.push('/admin/students');
      } else {
        setError(result.error || 'Failed to create student');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/students"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Add New Student</h1>
          <p className="text-gray-500 mt-1">Register a new student and create enrollment</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Student Information */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Student Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="First Name"
              {...register('firstName')}
              error={errors.firstName?.message}
              required
            />
            <FormInput
              label="Last Name"
              {...register('lastName')}
              error={errors.lastName?.message}
              required
            />
            <FormInput
              label="Date of Birth"
              type="date"
              {...register('dateOfBirth')}
              error={errors.dateOfBirth?.message}
            />
            <FormSelect
              label="Gender"
              {...register('gender')}
              error={errors.gender?.message}
              options={[
                { value: '', label: 'Select Gender' },
                { value: 'MALE', label: 'Male' },
                { value: 'FEMALE', label: 'Female' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
            <FormInput
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
            />
            <FormInput
              label="Phone"
              {...register('phone')}
              error={errors.phone?.message}
            />
            <FormTextarea
              label="Address"
              {...register('address')}
              error={errors.address?.message}
              className="md:col-span-2"
            />
          </div>
        </div>

        {/* Enrollment Information */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Enrollment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label="Academic Year"
              {...register('academicYearId')}
              error={errors.academicYearId?.message}
              required
              options={[
                { value: '', label: 'Select Academic Year' },
                ...academicYears.map((year) => ({
                  value: year.id,
                  label: year.name + (year.isCurrent ? ' (Current)' : ''),
                })),
              ]}
            />
            <FormSelect
              label="Class"
              {...register('classId')}
              error={errors.classId?.message}
              required
              options={[
                { value: '', label: 'Select Class' },
                ...classes.map((cls) => ({
                  value: cls.id,
                  label: `${cls.name} (Grade ${cls.grade})`,
                })),
              ]}
            />
          </div>
        </div>

        {/* Parent/Guardian Information */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Parent/Guardian Information (Optional)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Parent First Name"
              {...register('parentFirstName')}
              error={errors.parentFirstName?.message}
            />
            <FormInput
              label="Parent Last Name"
              {...register('parentLastName')}
              error={errors.parentLastName?.message}
            />
            <FormInput
              label="Parent Email"
              type="email"
              {...register('parentEmail')}
              error={errors.parentEmail?.message}
            />
            <FormInput
              label="Parent Phone"
              {...register('parentPhone')}
              error={errors.parentPhone?.message}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/admin/students"
            className="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Student
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
