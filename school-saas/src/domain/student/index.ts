/**
 * Student Domain Types
 *
 * This file defines the core domain types for the Student module in the
 * school management system. All types support multi-tenancy via schoolId
 * and enforce soft delete patterns.
 */

import { Gender, EnrollmentStatus as PrismaEnrollmentStatus } from '@prisma/client';

// ============================================
// ENUMS
// ============================================

/**
 * Student lifecycle status
 */
export enum StudentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  GRADUATED = 'GRADUATED',
  TRANSFERRED = 'TRANSFERRED',
}

/**
 * Enrollment status - tracks student enrollment lifecycle
 */
export enum EnrollmentStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  TRANSFERRED = 'TRANSFERRED',
  DROPPED = 'DROPPED',
  SUSPENDED = 'SUSPENDED',
}

// ============================================
// DOMAIN ENTITIES
// ============================================

/**
 * Core Student entity
 * Represents a student in the school system
 */
export interface Student {
  id: string;
  schoolId: string;

  // Personal Information
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender?: Gender;
  email?: string;
  phone?: string;
  address?: string;

  // School-specific identifiers
  admissionNumber?: string;  // Unique within school
  rollNumber?: string;       // Class-specific roll number

  // Status tracking
  status: StudentStatus;

  // Audit fields
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;  // Soft delete timestamp

  // Relations
  userId?: string;           // Optional link to User account
  guardians: Guardian[];
  enrollments: Enrollment[];
}

/**
 * Guardian entity
 * Represents a parent or guardian of a student
 */
export interface Guardian {
  id: string;
  schoolId: string;

  // Personal Information
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  relationship: GuardianRelationship;

  // Emergency contact priority
  isPrimaryContact: boolean;
  isEmergencyContact: boolean;

  // Audit fields
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  // Relations
  userId?: string;           // Optional link to User account
  students: Student[];       // Can be guardian to multiple students
}

/**
 * Guardian relationship types
 */
export enum GuardianRelationship {
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  GUARDIAN = 'GUARDIAN',
  STEPFATHER = 'STEPFATHER',
  STEPMOTHER = 'STEPMOTHER',
  GRANDPARENT = 'GRANDPARENT',
  SIBLING = 'SIBLING',
  OTHER = 'OTHER',
}

/**
 * Enrollment entity
 * Tracks a student's enrollment in an academic year and class
 */
export interface Enrollment {
  id: string;
  schoolId: string;

  // Core references
  studentId: string;
  academicYearId: string;
  classId: string;

  // Enrollment details
  enrollmentDate: Date;
  status: EnrollmentStatus;

  // Transfer tracking
  previousSchool?: string;
  transferCertificateNo?: string;

  // Completion tracking
  completionDate?: Date;
  promotedToClassId?: string;

  // Audit fields
  createdAt: Date;
  updatedAt: Date;

  // Relations
  student: Student;
  academicYear: AcademicYearSummary;
  class: ClassSummary;
}

// ============================================
// SUMMARY TYPES (For relations)
// ============================================

export interface AcademicYearSummary {
  id: string;
  name: string;
  isCurrent: boolean;
}

export interface ClassSummary {
  id: string;
  name: string;
  grade: string;
}

// ============================================
// INPUT TYPES
// ============================================

/**
 * Input for creating a new student
 */
export interface CreateStudentInput {
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender?: Gender;
  email?: string;
  phone?: string;
  address?: string;
  admissionNumber?: string;

  // Initial enrollment data
  classId: string;
  academicYearId: string;
  enrollmentDate?: Date;

  // Guardian information
  guardians?: CreateGuardianInput[];
}

/**
 * Input for creating a guardian
 */
export interface CreateGuardianInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  relationship: GuardianRelationship;
  isPrimaryContact?: boolean;
  isEmergencyContact?: boolean;
}

/**
 * Input for updating a student
 */
export interface UpdateStudentInput {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  email?: string;
  phone?: string;
  address?: string;
  status?: StudentStatus;
}

/**
 * Input for creating an enrollment
 */
export interface CreateEnrollmentInput {
  studentId: string;
  classId: string;
  academicYearId: string;
  enrollmentDate?: Date;
  previousSchool?: string;
  transferCertificateNo?: string;
}

// ============================================
// FILTER TYPES
// ============================================

/**
 * Filters for listing students
 */
export interface StudentFilters {
  search?: string;
  gender?: Gender;
  status?: StudentStatus;
  classId?: string;
  academicYearId?: string;
  hasGuardian?: boolean;
  page?: number;
  limit?: number;
}

// ============================================
// SERVICE CONTEXT
// ============================================

/**
 * Context passed to all student domain services
 * Enforces multi-tenancy and authorization
 */
export interface StudentServiceContext {
  schoolId: string;
  userId: string;
  role: string;
}
