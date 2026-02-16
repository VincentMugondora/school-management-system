/**
 * @fileoverview School Domain Types
 * @description Core domain types and interfaces for the School aggregate in the multi-tenant
 * school management system. These types define the contractual interfaces for school-related
 * operations and ensure type safety across the application.
 *
 * @module @/domain/school/school.types
 */

import { SchoolStatus } from '@prisma/client';

/**
 * Core School entity interface representing the aggregate root
 * @interface School
 * @description The School is the central aggregate root in our multi-tenant architecture.
 * All other entities (users, students, classes, etc.) belong to exactly one school.
 */
export interface School {
  /** Unique identifier - UUID v4 */
  id: string;

  /** Display name of the school */
  name: string;

  /**
   * URL-safe unique identifier for the school
   * @pattern ^[a-z0-9]+(?:-[a-z0-9]+)*$
   * @example "harare-high-school", "primary-school-01"
   */
  slug: string;

  /** Contact email address (optional) */
  email?: string;

  /** Contact phone number (optional) */
  phone?: string;

  /** Physical address of the school (optional) */
  address?: string;

  /** Current operational status of the school */
  status: SchoolStatus;

  /** Timestamp when the school was created */
  createdAt: Date;

  /** Timestamp of last update */
  updatedAt: Date;
}

/**
 * Data Transfer Object for creating a new School
 * @interface CreateSchoolInput
 * @description Input data required to create a new school. The slug is auto-generated
 * from the name if not provided.
 */
export interface CreateSchoolInput {
  /** Display name of the school (required) */
  name: string;

  /**
   * URL-safe slug (optional - auto-generated from name if omitted)
   * Must be unique across all schools
   */
  slug?: string;

  /** Contact email (optional) */
  email?: string;

  /** Contact phone (optional) */
  phone?: string;

  /** Physical address (optional) */
  address?: string;
}

/**
 * Data Transfer Object for updating an existing School
 * @interface UpdateSchoolInput
 * @description Partial update data for a school. Only provided fields will be updated.
 */
export interface UpdateSchoolInput {
  /** Updated display name */
  name?: string;

  /** Updated contact email */
  email?: string;

  /** Updated contact phone */
  phone?: string;

  /** Updated physical address */
  address?: string;

  /** Updated operational status */
  status?: SchoolStatus;
}

/**
 * School with admin user information
 * @interface SchoolWithAdmin
 * @description Extended school interface including the admin user who created/owns the school.
 * Used in admin dashboard and school management contexts.
 */
export interface SchoolWithAdmin extends School {
  /** The admin user who owns this school */
  admin: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

/**
 * School statistics aggregate
 * @interface SchoolStats
 * @description Statistical summary of a school's data. Used for dashboards and reporting.
 */
export interface SchoolStats {
  /** Total number of enrolled students */
  totalStudents: number;

  /** Total number of teaching staff */
  totalTeachers: number;

  /** Total number of classes */
  totalClasses: number;

  /** Total number of active academic years */
  totalAcademicYears: number;

  /** Current active academic year name (if any) */
  currentAcademicYear?: string;
}

/**
 * School with full statistics
 * @interface SchoolWithStats
 */
export interface SchoolWithStats extends School {
  /** Statistical summary */
  stats: SchoolStats;
}

/**
 * Query filters for listing schools
 * @interface SchoolFilters
 */
export interface SchoolFilters {
  /** Filter by status */
  status?: SchoolStatus;

  /** Search by name (case-insensitive partial match) */
  searchQuery?: string;

  /** Pagination: number of items to skip */
  skip?: number;

  /** Pagination: number of items to return */
  take?: number;
}

/**
 * Result type for school creation
 * @type CreateSchoolResult
 */
export type CreateSchoolResult =
  | { success: true; school: School }
  | { success: false; error: string; code: string };

/**
 * Result type for school queries
 * @type SchoolQueryResult
 */
export type SchoolQueryResult =
  | { success: true; school: School }
  | { success: false; error: string; code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'ERROR' };

/**
 * Slug generation options
 * @interface SlugOptions
 */
export interface SlugOptions {
  /** Maximum length of the generated slug */
  maxLength?: number;

  /** Whether to append a random suffix for uniqueness */
  ensureUnique?: boolean;
}
