import { z } from 'zod';
import { SchoolStatus, AcademicYearStatus, TermStatus, Gender, EnrollmentStatus, Role, InvoiceStatus } from '@prisma/client';

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
// ACADEMIC YEAR VALIDATION SCHEMAS
// ============================================

export const createAcademicYearSchema = z.object({
  name: z
    .string()
    .min(2, 'Academic year name must be at least 2 characters')
    .max(100, 'Academic year name must not exceed 100 characters')
    .transform(val => val.trim()),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().optional().default(false),
});

export const updateAcademicYearSchema = z.object({
  name: z
    .string()
    .min(2, 'Academic year name must be at least 2 characters')
    .max(100, 'Academic year name must not exceed 100 characters')
    .optional()
    .transform(val => val?.trim()),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isCurrent: z.boolean().optional(),
  status: z.nativeEnum(AcademicYearStatus).optional(),
});

export const academicYearIdSchema = z.string().uuid('Invalid academic year ID');

// ============================================
// TERM VALIDATION SCHEMAS
// ============================================

export const createTermSchema = z.object({
  academicYearId: z.string().uuid('Invalid academic year ID'),
  name: z
    .string()
    .min(1, 'Term name is required')
    .max(50, 'Term name must not exceed 50 characters')
    .transform(val => val.trim()),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isLocked: z.boolean().optional().default(false),
});

export const updateTermSchema = z.object({
  name: z
    .string()
    .min(1, 'Term name is required')
    .max(50, 'Term name must not exceed 50 characters')
    .optional()
    .transform(val => val?.trim()),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.nativeEnum(TermStatus).optional(),
});

export const termIdSchema = z.string().uuid('Invalid term ID');

// ============================================
// STUDENT VALIDATION SCHEMAS
// ============================================

export const createStudentSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must not exceed 50 characters')
    .transform(val => val.trim()),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must not exceed 50 characters')
    .transform(val => val.trim()),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.nativeEnum(Gender).optional(),
  address: z
    .string()
    .max(255, 'Address must not exceed 255 characters')
    .optional()
    .transform(val => val?.trim()),
  phone: z
    .string()
    .max(20, 'Phone must not exceed 20 characters')
    .optional()
    .transform(val => val?.trim()),
  email: z
    .string()
    .email('Invalid email address')
    .max(100, 'Email must not exceed 100 characters')
    .optional()
    .transform(val => val?.toLowerCase().trim()),
  studentId: z
    .string()
    .max(50, 'Student ID must not exceed 50 characters')
    .optional()
    .transform(val => val?.trim()),
  parentId: z.string().uuid('Invalid parent ID').optional(),
});

export const updateStudentSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must not exceed 50 characters')
    .optional()
    .transform(val => val?.trim()),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must not exceed 50 characters')
    .optional()
    .transform(val => val?.trim()),
  dateOfBirth: z.coerce.date().optional().nullable(),
  gender: z.nativeEnum(Gender).optional().nullable(),
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
  studentId: z
    .string()
    .max(50, 'Student ID must not exceed 50 characters')
    .optional()
    .nullable()
    .transform(val => (val === '' ? null : val?.trim())),
  parentId: z.string().uuid('Invalid parent ID').optional().nullable(),
});

export const studentFilterSchema = z.object({
  search: z.string().optional(),
  gender: z.nativeEnum(Gender).optional(),
  hasParent: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const studentIdSchema = z.string().uuid('Invalid student ID');

// ============================================
// ENROLLMENT VALIDATION SCHEMAS
// ============================================

export const createEnrollmentSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  academicYearId: z.string().uuid('Invalid academic year ID'),
  classId: z.string().uuid('Invalid class ID'),
  status: z.nativeEnum(EnrollmentStatus).optional(),
});

export const updateEnrollmentSchema = z.object({
  classId: z.string().uuid('Invalid class ID').optional(),
  status: z.nativeEnum(EnrollmentStatus).optional(),
});

export const enrollmentIdSchema = z.string().uuid('Invalid enrollment ID');

// ============================================
// USER VALIDATION SCHEMAS
// ============================================

export const createUserSchema = z.object({
  clerkId: z
    .string()
    .min(1, 'Clerk ID is required')
    .transform(val => val.trim()),
  email: z
    .string()
    .email('Invalid email address')
    .transform(val => val.toLowerCase().trim()),
  firstName: z
    .string()
    .max(50, 'First name must not exceed 50 characters')
    .optional()
    .transform(val => val?.trim()),
  lastName: z
    .string()
    .max(50, 'Last name must not exceed 50 characters')
    .optional()
    .transform(val => val?.trim()),
  role: z.nativeEnum(Role),
  schoolId: z.string().uuid('Invalid school ID').optional(),
});

export const updateUserSchema = z.object({
  firstName: z
    .string()
    .max(50, 'First name must not exceed 50 characters')
    .optional()
    .transform(val => val?.trim()),
  lastName: z
    .string()
    .max(50, 'Last name must not exceed 50 characters')
    .optional()
    .transform(val => val?.trim()),
  role: z.nativeEnum(Role).optional(),
  schoolId: z.string().uuid('Invalid school ID').optional().nullable(),
  isActive: z.boolean().optional(),
});

export const userFilterSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  schoolId: z.string().uuid('Invalid school ID').optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const userIdSchema = z.string().uuid('Invalid user ID');

// ============================================
// TEACHER VALIDATION SCHEMAS
// ============================================

export const createTeacherSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  employeeId: z
    .string()
    .max(50, 'Employee ID must not exceed 50 characters')
    .optional()
    .transform(val => val?.trim()),
});

export const updateTeacherSchema = z.object({
  employeeId: z
    .string()
    .max(50, 'Employee ID must not exceed 50 characters')
    .optional()
    .nullable()
    .transform(val => (val === '' ? null : val?.trim())),
});

export const teacherIdSchema = z.string().uuid('Invalid teacher ID');

export const assignTeacherToClassSchema = z.object({
  teacherId: z.string().uuid('Invalid teacher ID'),
  classId: z.string().uuid('Invalid class ID'),
});

export const assignTeacherToSubjectSchema = z.object({
  teacherId: z.string().uuid('Invalid teacher ID'),
  subjectId: z.string().uuid('Invalid subject ID'),
});

// ============================================
// CLASS VALIDATION SCHEMAS
// ============================================

export const createClassSchema = z.object({
  name: z
    .string()
    .min(1, 'Class name is required')
    .max(50, 'Class name must not exceed 50 characters')
    .transform(val => val.trim()),
  grade: z
    .string()
    .min(1, 'Grade is required')
    .max(20, 'Grade must not exceed 20 characters')
    .transform(val => val.trim()),
  stream: z
    .string()
    .max(20, 'Stream must not exceed 20 characters')
    .optional()
    .transform(val => val?.trim()),
  academicYearId: z.string().uuid('Invalid academic year ID'),
  classTeacherId: z.string().uuid('Invalid teacher ID').optional(),
});

export const updateClassSchema = z.object({
  name: z
    .string()
    .min(1, 'Class name is required')
    .max(50, 'Class name must not exceed 50 characters')
    .optional()
    .transform(val => val?.trim()),
  grade: z
    .string()
    .min(1, 'Grade is required')
    .max(20, 'Grade must not exceed 20 characters')
    .optional()
    .transform(val => val?.trim()),
  stream: z
    .string()
    .max(20, 'Stream must not exceed 20 characters')
    .optional()
    .nullable()
    .transform(val => (val === '' ? null : val?.trim())),
  classTeacherId: z.string().uuid('Invalid teacher ID').optional().nullable(),
});

export const classIdSchema = z.string().uuid('Invalid class ID');

export const assignSubjectToClassSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  subjectId: z.string().uuid('Invalid subject ID'),
  teacherId: z.string().uuid('Invalid teacher ID').optional(),
});

// ============================================
// SUBJECT VALIDATION SCHEMAS
// ============================================

export const createSubjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Subject name is required')
    .max(100, 'Subject name must not exceed 100 characters')
    .transform(val => val.trim()),
  code: z
    .string()
    .max(20, 'Subject code must not exceed 20 characters')
    .optional()
    .transform(val => val?.trim()),
});

export const updateSubjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Subject name is required')
    .max(100, 'Subject name must not exceed 100 characters')
    .optional()
    .transform(val => val?.trim()),
  code: z
    .string()
    .max(20, 'Subject code must not exceed 20 characters')
    .optional()
    .nullable()
    .transform(val => (val === '' ? null : val?.trim())),
});

export const subjectIdSchema = z.string().uuid('Invalid subject ID');

// ============================================
// EXAM VALIDATION SCHEMAS
// ============================================

export const createExamSchema = z.object({
  name: z
    .string()
    .min(1, 'Exam name is required')
    .max(100, 'Exam name must not exceed 100 characters')
    .transform(val => val.trim()),
  maxMarks: z.number().int().positive('Maximum marks must be greater than 0'),
  examDate: z.coerce.date(),
  academicYearId: z.string().uuid('Invalid academic year ID'),
  termId: z.string().uuid('Invalid term ID'),
  classId: z.string().uuid('Invalid class ID'),
  subjectId: z.string().uuid('Invalid subject ID'),
});

export const updateExamSchema = z.object({
  name: z
    .string()
    .min(1, 'Exam name is required')
    .max(100, 'Exam name must not exceed 100 characters')
    .optional()
    .transform(val => val?.trim()),
  maxMarks: z.number().int().positive('Maximum marks must be greater than 0').optional(),
  examDate: z.coerce.date().optional(),
});

export const examIdSchema = z.string().uuid('Invalid exam ID');

// ============================================
// RESULT VALIDATION SCHEMAS
// ============================================

export const createResultSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
  examId: z.string().uuid('Invalid exam ID'),
  marks: z.number().min(0, 'Marks cannot be negative'),
  grade: z.string().max(5).optional(),
  remarks: z.string().max(255).optional(),
});

export const updateResultSchema = z.object({
  marks: z.number().min(0, 'Marks cannot be negative').optional(),
  grade: z.string().max(5).optional(),
  remarks: z.string().max(255).optional(),
});

export const resultIdSchema = z.string().uuid('Invalid result ID');

export const bulkEnterResultsSchema = z.object({
  examId: z.string().uuid('Invalid exam ID'),
  results: z.array(
    z.object({
      enrollmentId: z.string().uuid('Invalid enrollment ID'),
      marks: z.number().min(0, 'Marks cannot be negative'),
      remarks: z.string().max(255).optional(),
    })
  ).min(1, 'At least one result is required'),
});

// ============================================
// ATTENDANCE VALIDATION SCHEMAS
// ============================================

export const markAttendanceSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
  termId: z.string().uuid('Invalid term ID'),
  date: z.coerce.date(),
  isPresent: z.boolean(),
  remarks: z.string().max(255).optional(),
});

export const bulkUpdateAttendanceSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  termId: z.string().uuid('Invalid term ID'),
  date: z.coerce.date(),
  attendances: z.array(
    z.object({
      enrollmentId: z.string().uuid('Invalid enrollment ID'),
      isPresent: z.boolean(),
      remarks: z.string().max(255).optional(),
    })
  ).min(1, 'At least one attendance record is required'),
});

export const attendanceIdSchema = z.string().uuid('Invalid attendance ID');

// ============================================
// INVOICE VALIDATION SCHEMAS
// ============================================

export const generateInvoicesSchema = z.object({
  enrollmentIds: z.array(z.string().uuid('Invalid enrollment ID')).min(1, 'At least one enrollment is required'),
  termId: z.string().uuid('Invalid term ID'),
  amount: z.number().positive('Amount must be greater than 0'),
  dueDate: z.coerce.date().optional(),
});

export const createInvoiceSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
  termId: z.string().uuid('Invalid term ID'),
  amount: z.number().positive('Amount must be greater than 0'),
  dueDate: z.coerce.date().optional(),
});

export const updateInvoiceSchema = z.object({
  status: z.nativeEnum(InvoiceStatus).optional(),
  dueDate: z.coerce.date().optional().nullable(),
});

export const invoiceIdSchema = z.string().uuid('Invalid invoice ID');

// ============================================
// PAYMENT VALIDATION SCHEMAS
// ============================================

export const applyPaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  amount: z.number().positive('Payment amount must be greater than 0'),
  method: z.string().max(50).optional(),
  reference: z.string().max(100).optional(),
  notes: z.string().max(255).optional(),
  paymentDate: z.coerce.date().optional(),
});

export const paymentIdSchema = z.string().uuid('Invalid payment ID');

// ============================================
// TYPE INFERENCE
// ============================================

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;
export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;
export type SchoolFilterInput = z.infer<typeof schoolFilterSchema>;

export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;

export type CreateTermInput = z.infer<typeof createTermSchema>;
export type UpdateTermInput = z.infer<typeof updateTermSchema>;

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type StudentFilterInput = z.infer<typeof studentFilterSchema>;

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserFilterInput = z.infer<typeof userFilterSchema>;

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
