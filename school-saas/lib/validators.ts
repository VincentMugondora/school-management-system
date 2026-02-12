import { z } from 'zod';
import { SchoolStatus } from '@prisma/client';

// ============================================
// SCHOOL VALIDATION SCHEMAS
// ============================================

export const createSchoolSchema = z.object({
  name: z
    .string()
    .min(2, 'School name must be at least 2 characters')
    .max(100, 'School name must not exceed 100 characters')
    .transform(val => val.trim()),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must not exceed 50 characters')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must contain only lowercase letters, numbers, and hyphens'
    )
    .transform(val => val.toLowerCase().trim()),
  address: z
    .string()
    .max(255, 'Address must not exceed 255 characters')
    .optional()
    .transform(val => val?.trim() || undefined),
  phone: z
    .string()
    .max(20, 'Phone must not exceed 20 characters')
    .optional()
    .transform(val => val?.trim() || undefined),
  email: z
    .string()
    .email('Invalid email address')
    .max(100, 'Email must not exceed 100 characters')
    .optional()
    .transform(val => val?.toLowerCase().trim() || undefined),
});

export const updateSchoolSchema = z.object({
  name: z
    .string()
    .min(2, 'School name must be at least 2 characters')
    .max(100, 'School name must not exceed 100 characters')
    .optional()
    .transform(val => val?.trim()),
  address: z
    .string()
    .max(255, 'Address must not exceed 255 characters')
    .optional()
    .nullable()
    .transform(val => (val === '' ? null : val?.trim())),
  phone: z
    .string()
    .max(20, 'Phone must not exceed 20 characters')
    .optional()
    .nullable()
    .transform(val => (val === '' ? null : val?.trim())),
  email: z
    .string()
    .email('Invalid email address')
    .max(100, 'Email must not exceed 100 characters')
    .optional()
    .nullable()
    .transform(val => (val === '' ? null : val?.toLowerCase().trim())),
  status: z
    .nativeEnum(SchoolStatus)
    .optional(),
});

export const schoolFilterSchema = z.object({
  status: z.nativeEnum(SchoolStatus).optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const schoolIdSchema = z.string().uuid('Invalid school ID');

// ============================================
// TYPE INFERENCE
// ============================================

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;
export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;
export type SchoolFilterInput = z.infer<typeof schoolFilterSchema>;
