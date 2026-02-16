/**
 * @fileoverview Bulk Student Import Domain Types
 *
 * Domain model for bulk importing students from external data sources.
 * These types define the contract between the import service and consuming layers.
 * No CSV parsing, UI, or database dependencies.
 *
 * @module domain/student/import
 */

/**
 * Represents a single student record to be imported.
 * This is the raw data structure before validation and persistence.
 *
 * @example
 * {
 *   studentId: '2024-001',
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   dateOfBirth: '2010-05-15',
 *   gender: 'MALE',
 *   className: 'Grade 5A',
 *   parentEmail: 'parent@example.com'
 * }
 */
export interface StudentImportRow {
  /** Unique student identifier (e.g., admission number, student ID) */
  studentId: string;

  /** Student's first name */
  firstName: string;

  /** Student's last name */
  lastName: string;

  /** Date of birth in ISO 8601 format (YYYY-MM-DD) */
  dateOfBirth?: string;

  /** Student gender */
  gender?: 'MALE' | 'FEMALE' | 'OTHER';

  /** Class/grade name the student should be enrolled in */
  className: string;

  /** Parent or guardian email address */
  parentEmail?: string;

  /** Parent or guardian phone number */
  parentPhone?: string;

  /** Parent or guardian full name */
  parentName?: string;

  /** Physical address */
  address?: string;

  /** Academic year for enrollment (e.g., "2024-2025") */
  academicYear?: string;
}

/**
 * Describes a validation or processing error for a specific import row.
 *
 * @example
 * {
 *   rowNumber: 42,
 *   field: 'parentEmail',
 *   message: 'Invalid email format: example.com'
 * }
 */
export interface ImportError {
  /** 1-based row number in the import data (excluding header) */
  rowNumber: number;

  /** Field name that caused the error (e.g., 'email', 'studentId') */
  field: string;

  /** Human-readable error message */
  message: string;

  /** Error severity level */
  severity: 'ERROR' | 'WARNING';
}

/**
 * Result of a bulk student import operation.
 * Contains counts and detailed error information per row.
 *
 * @example
 * {
 *   successCount: 48,
 *   failureCount: 2,
 *   errors: [
 *     { rowNumber: 15, field: 'studentId', message: 'Duplicate ID', severity: 'ERROR' },
 *     { rowNumber: 23, field: 'email', message: 'Invalid format', severity: 'ERROR' }
 *   ]
 * }
 */
export interface StudentImportResult {
  /** Number of students successfully imported and enrolled */
  successCount: number;

  /** Number of rows that failed validation or processing */
  failureCount: number;

  /** Total number of rows processed (success + failure) */
  totalCount: number;

  /**
   * Errors grouped by row number.
   * Each row can have multiple errors (different fields).
   */
  errors: ImportError[];

  /** Row numbers that were successfully processed */
  successfulRowNumbers: number[];

  /** Row numbers that failed processing */
  failedRowNumbers: number[];

  /** Timestamp when the import completed */
  completedAt: Date;

  /** Duration of the import operation in milliseconds */
  durationMs: number;
}

/**
 * Configuration options for bulk student import.
 *
 * @example
 * {
 *   skipHeader: true,
 *   dryRun: false,
 *   defaultAcademicYear: '2024-2025'
 * }
 */
export interface StudentImportOptions {
  /** Whether to skip the first row (header) */
  skipHeader: boolean;

  /** If true, validate only without persisting */
  dryRun: boolean;

  /** Default academic year to use if not specified in row data */
  defaultAcademicYear?: string;

  /** Automatically create classes if they don't exist */
  autoCreateClasses: boolean;

  /** Send welcome emails to created parent accounts */
  sendWelcomeEmails: boolean;
}

/**
 * Status of a row during the import process.
 */
export enum ImportRowStatus {
  /** Row is pending validation */
  PENDING = 'PENDING',

  /** Row passed validation, ready for processing */
  VALIDATED = 'VALIDATED',

  /** Row failed validation */
  INVALID = 'INVALID',

  /** Row is being processed */
  PROCESSING = 'PROCESSING',

  /** Row was successfully imported */
  SUCCESS = 'SUCCESS',

  /** Row failed during processing (after validation) */
  FAILED = 'FAILED',
}

/**
 * Represents a row in the import process with its current status.
 * Used internally by the import service to track progress.
 */
export interface ImportRow {
  /** 1-based row number */
  rowNumber: number;

  /** Raw data from the import source */
  data: StudentImportRow;

  /** Current processing status */
  status: ImportRowStatus;

  /** Validation/processing errors for this row */
  errors: ImportError[];

  /** Created student ID (if successfully processed) */
  studentId?: string;

  /** Created parent ID (if applicable) */
  parentId?: string;

  /** Enrollment ID (if successfully enrolled) */
  enrollmentId?: string;
}

/**
 * Factory function to create an empty import result.
 *
 * @param startTime - Timestamp when import started
 * @returns Initial StudentImportResult
 */
export function createEmptyImportResult(startTime: Date = new Date()): StudentImportResult {
  return {
    successCount: 0,
    failureCount: 0,
    totalCount: 0,
    errors: [],
    successfulRowNumbers: [],
    failedRowNumbers: [],
    completedAt: startTime,
    durationMs: 0,
  };
}

/**
 * Factory function to create default import options.
 *
 * @returns Default StudentImportOptions
 */
export function createDefaultImportOptions(): StudentImportOptions {
  return {
    skipHeader: true,
    dryRun: false,
    autoCreateClasses: false,
    sendWelcomeEmails: true,
  };
}
