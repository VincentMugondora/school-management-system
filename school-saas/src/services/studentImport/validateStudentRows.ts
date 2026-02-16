/**
 * @fileoverview Student Import Row Validation Service
 *
 * Validates student import rows according to business rules.
 * Collects all errors without failing fast.
 * No database writes - only reads for class existence validation.
 *
 * @module services/studentImport/validateStudentRows
 */

import { StudentImportRow, ImportError } from '@/domain/student/import';

/**
 * Zimbabwe school grade levels.
 */
export enum Grade {
  ECD_A = 'ECD_A',
  ECD_B = 'ECD_B',
  GRADE_1 = 'GRADE_1',
  GRADE_2 = 'GRADE_2',
  GRADE_3 = 'GRADE_3',
  GRADE_4 = 'GRADE_4',
  GRADE_5 = 'GRADE_5',
  GRADE_6 = 'GRADE_6',
  GRADE_7 = 'GRADE_7',
  FORM_1 = 'FORM_1',
  FORM_2 = 'FORM_2',
  FORM_3 = 'FORM_3',
  FORM_4 = 'FORM_4',
  FORM_5 = 'FORM_5',
  FORM_6 = 'FORM_6',
}

/**
 * Valid gender values for import.
 */
export type ValidGender = 'M' | 'F';

/**
 * Result of validating a batch of student import rows.
 */
export interface ValidationResult {
  /** Rows that passed all validation */
  validRows: ValidatedStudentRow[];

  /** Errors grouped by row number */
  errorsByRow: Map<number, ImportError[]>;

  /** Total rows processed */
  totalRows: number;

  /** Count of valid rows */
  validCount: number;

  /** Count of invalid rows */
  invalidCount: number;
}

/**
 * A student import row that has passed validation.
 */
export interface ValidatedStudentRow extends StudentImportRow {
  /** Normalized grade value */
  grade: Grade;

  /** Normalized gender value */
  gender: ValidGender;

  /** Original row number from import source */
  _rowNumber: number;
}

/**
 * Context for validation - contains school-specific data needed for validation.
 * This is read from the database but no writes occur.
 */
export interface ValidationContext {
  /** Set of valid class names in the school */
  existingClassNames: Set<string>;

  /** School's academic year */
  academicYear: string;

  /** Set of existing admission numbers to check for duplicates */
  existingAdmissionNumbers?: Set<string>;
}

/**
 * Validates a date of birth is realistic (not in future, not too old).
 *
 * @param dob - Date of birth string (ISO format)
 * @returns True if valid and realistic
 */
function isValidDateOfBirth(dob: string): boolean {
  const date = new Date(dob);
  if (isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();

  // Check not in future
  if (date > now) {
    return false;
  }

  // Check not older than 25 years (reasonable for school student)
  const maxAge = 25;
  const minDate = new Date(now.getFullYear() - maxAge, now.getMonth(), now.getDate());
  if (date < minDate) {
    return false;
  }

  // Check not younger than 2 years (ECD age)
  const minAge = 2;
  const maxDate = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate());
  if (date > maxDate) {
    return false;
  }

  return true;
}

/**
 * Normalizes a grade string to Grade enum value.
 *
 * @param grade - Raw grade string
 * @returns Normalized Grade or null if invalid
 */
function normalizeGrade(grade: string): Grade | null {
  const normalized = grade.toUpperCase().trim().replace(/\s+/g, '_').replace(/-/g, '_');

  // Handle common variations
  const mappings: Record<string, Grade> = {
    'ECD_A': Grade.ECD_A,
    'ECD_B': Grade.ECD_B,
    'ECDA': Grade.ECD_A,
    'ECDB': Grade.ECD_B,
    'ECD A': Grade.ECD_A,
    'ECD B': Grade.ECD_B,
    'GRADE_1': Grade.GRADE_1,
    'GRADE_2': Grade.GRADE_2,
    'GRADE_3': Grade.GRADE_3,
    'GRADE_4': Grade.GRADE_4,
    'GRADE_5': Grade.GRADE_5,
    'GRADE_6': Grade.GRADE_6,
    'GRADE_7': Grade.GRADE_7,
    'GRADE1': Grade.GRADE_1,
    'GRADE2': Grade.GRADE_2,
    'GRADE3': Grade.GRADE_3,
    'GRADE4': Grade.GRADE_4,
    'GRADE5': Grade.GRADE_5,
    'GRADE6': Grade.GRADE_6,
    'GRADE7': Grade.GRADE_7,
    '1': Grade.GRADE_1,
    '2': Grade.GRADE_2,
    '3': Grade.GRADE_3,
    '4': Grade.GRADE_4,
    '5': Grade.GRADE_5,
    '6': Grade.GRADE_6,
    '7': Grade.GRADE_7,
    'FORM_1': Grade.FORM_1,
    'FORM_2': Grade.FORM_2,
    'FORM_3': Grade.FORM_3,
    'FORM_4': Grade.FORM_4,
    'FORM_5': Grade.FORM_5,
    'FORM_6': Grade.FORM_6,
    'FORM1': Grade.FORM_1,
    'FORM2': Grade.FORM_2,
    'FORM3': Grade.FORM_3,
    'FORM4': Grade.FORM_4,
    'FORM5': Grade.FORM_5,
    'FORM6': Grade.FORM_6,
  };

  return mappings[normalized] || null;
}

/**
 * Normalizes gender to M or F.
 *
 * @param gender - Raw gender string
 * @returns Normalized gender or null
 */
function normalizeGender(gender: string): ValidGender | null {
  const normalized = gender.toUpperCase().trim();

  if (normalized === 'M' || normalized === 'MALE' || normalized === 'BOY') {
    return 'M';
  }
  if (normalized === 'F' || normalized === 'FEMALE' || normalized === 'GIRL') {
    return 'F';
  }

  return null;
}

/**
 * Validates a single student import row.
 * Collects all errors without failing fast.
 *
 * @param row - The row to validate
 * @param rowNumber - 1-based row number for error reporting
 * @param context - Validation context with school data
 * @returns Array of validation errors (empty if valid)
 */
function validateRow(
  row: StudentImportRow,
  rowNumber: number,
  context: ValidationContext
): ImportError[] {
  const errors: ImportError[] = [];

  // Required: firstName
  if (!row.firstName || row.firstName.trim() === '') {
    errors.push({
      rowNumber,
      field: 'firstName',
      message: 'First name is required',
      severity: 'ERROR',
    });
  } else if (row.firstName.trim().length < 2) {
    errors.push({
      rowNumber,
      field: 'firstName',
      message: 'First name must be at least 2 characters',
      severity: 'ERROR',
    });
  }

  // Required: lastName
  if (!row.lastName || row.lastName.trim() === '') {
    errors.push({
      rowNumber,
      field: 'lastName',
      message: 'Last name is required',
      severity: 'ERROR',
    });
  } else if (row.lastName.trim().length < 2) {
    errors.push({
      rowNumber,
      field: 'lastName',
      message: 'Last name must be at least 2 characters',
      severity: 'ERROR',
    });
  }

  // Required: gender (must be M or F)
  if (!row.gender || row.gender.trim() === '') {
    errors.push({
      rowNumber,
      field: 'gender',
      message: 'Gender is required',
      severity: 'ERROR',
    });
  } else {
    const normalizedGender = normalizeGender(row.gender);
    if (!normalizedGender) {
      errors.push({
        rowNumber,
        field: 'gender',
        message: 'Gender must be M or F (or Male/Female, Boy/Girl)',
        severity: 'ERROR',
      });
    }
  }

  // Required: dateOfBirth
  if (!row.dateOfBirth || row.dateOfBirth.trim() === '') {
    errors.push({
      rowNumber,
      field: 'dateOfBirth',
      message: 'Date of birth is required',
      severity: 'ERROR',
    });
  } else if (!isValidDateOfBirth(row.dateOfBirth)) {
    errors.push({
      rowNumber,
      field: 'dateOfBirth',
      message: 'Date of birth must be valid and realistic (age 2-25)',
      severity: 'ERROR',
    });
  }

  // Required: grade
  // Note: The row may have 'grade' or we derive it from 'className'
  // For this validation, we check if className contains grade info
  const gradeFromClass = extractGradeFromClassName(row.className);
  const gradeValue = gradeFromClass || row.className;

  if (!gradeValue || gradeValue.trim() === '') {
    errors.push({
      rowNumber,
      field: 'grade',
      message: 'Grade is required (should be in className or grade field)',
      severity: 'ERROR',
    });
  } else {
    const normalizedGrade = normalizeGrade(gradeValue);
    if (!normalizedGrade) {
      errors.push({
        rowNumber,
        field: 'grade',
        message: `Invalid grade: "${gradeValue}". Must be one of: ECD A, ECD B, Grade 1-7, Form 1-6`,
        severity: 'ERROR',
      });
    }
  }

  // Required: className
  if (!row.className || row.className.trim() === '') {
    errors.push({
      rowNumber,
      field: 'className',
      message: 'Class name is required',
      severity: 'ERROR',
    });
  } else {
    // Validate class exists in school
    const normalizedClassName = row.className.trim();
    if (!context.existingClassNames.has(normalizedClassName)) {
      errors.push({
        rowNumber,
        field: 'className',
        message: `Class "${normalizedClassName}" does not exist in this school`,
        severity: 'ERROR',
      });
    }
  }

  // Required: admissionNumber (mapped from studentId)
  if (!row.studentId || row.studentId.trim() === '') {
    errors.push({
      rowNumber,
      field: 'admissionNumber',
      message: 'Admission number (studentId) is required',
      severity: 'ERROR',
    });
  } else {
    const trimmedId = row.studentId.trim();
    if (trimmedId.length < 3) {
      errors.push({
        rowNumber,
        field: 'admissionNumber',
        message: 'Admission number must be at least 3 characters',
        severity: 'ERROR',
      });
    }

    // Check for duplicate admission number in existing students
    if (context.existingAdmissionNumbers?.has(trimmedId)) {
      errors.push({
        rowNumber,
        field: 'admissionNumber',
        message: `Admission number "${trimmedId}" already exists in this school`,
        severity: 'ERROR',
      });
    }
  }

  // Optional: parentEmail - validate format if provided
  if (row.parentEmail && row.parentEmail.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.parentEmail.trim())) {
      errors.push({
        rowNumber,
        field: 'parentEmail',
        message: `Invalid email format: "${row.parentEmail}"`,
        severity: 'WARNING',
      });
    }
  }

  // Optional: parentPhone - validate format if provided
  if (row.parentPhone && row.parentPhone.trim() !== '') {
    // Basic phone validation - allow digits, spaces, +, -, (, )
    const phoneRegex = /^[\d\s+\-()]+$/;
    if (!phoneRegex.test(row.parentPhone.trim())) {
      errors.push({
        rowNumber,
        field: 'parentPhone',
        message: `Invalid phone format: "${row.parentPhone}"`,
        severity: 'WARNING',
      });
    }
  }

  return errors;
}

/**
 * Attempts to extract a grade value from a class name.
 *
 * @param className - Class name like "Grade 5A" or "Form 3 Science"
 * @returns Extracted grade or null
 */
function extractGradeFromClassName(className: string): string | null {
  if (!className) return null;

  const normalized = className.toUpperCase();

  // Match patterns like "Grade 5", "Grade5", "Form 3", "Form3"
  const gradeMatch = normalized.match(/GRADE\s*(\d)/);
  if (gradeMatch) {
    return `GRADE_${gradeMatch[1]}`;
  }

  const formMatch = normalized.match(/FORM\s*(\d)/);
  if (formMatch) {
    return `FORM_${formMatch[1]}`;
  }

  const ecdMatch = normalized.match(/ECD\s*([AB])/);
  if (ecdMatch) {
    return `ECD_${ecdMatch[1]}`;
  }

  return null;
}

/**
 * Validates a batch of student import rows.
 * Collects all errors without failing fast.
 *
 * @param rows - Array of student import rows to validate
 * @param context - Validation context with school data
 * @returns Validation result with valid rows and grouped errors
 *
 * @example
 * const result = validateStudentRows(
 *   parsedRows,
 *   {
 *     existingClassNames: new Set(['Grade 5A', 'Grade 5B']),
 *     academicYear: '2024-2025',
 *     existingAdmissionNumbers: new Set(['2023-001']),
 *   }
 * );
 */
export function validateStudentRows(
  rows: StudentImportRow[],
  context: ValidationContext
): ValidationResult {
  const validRows: ValidatedStudentRow[] = [];
  const errorsByRow = new Map<number, ImportError[]>();
  const seenAdmissionNumbers = new Set<string>();

  let validCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1; // 1-based row number

    // Validate the row
    const errors = validateRow(row, rowNumber, context);

    // Check for duplicate admission numbers within the import batch
    if (row.studentId) {
      const trimmedId = row.studentId.trim();
      if (seenAdmissionNumbers.has(trimmedId)) {
        errors.push({
          rowNumber,
          field: 'admissionNumber',
          message: `Duplicate admission number "${trimmedId}" in import batch`,
          severity: 'ERROR',
        });
      } else {
        seenAdmissionNumbers.add(trimmedId);
      }
    }

    if (errors.length > 0) {
      errorsByRow.set(rowNumber, errors);
      invalidCount++;
    } else {
      // Row is valid - create validated row with normalized values
      const gradeFromClass = extractGradeFromClassName(row.className);
      const gradeValue = normalizeGrade(gradeFromClass || row.className)!;
      const normalizedGender = normalizeGender(row.gender!)!;

      const validatedRow: ValidatedStudentRow = {
        ...row,
        firstName: row.firstName.trim(),
        lastName: row.lastName.trim(),
        studentId: row.studentId.trim(),
        className: row.className.trim(),
        gender: normalizedGender,
        grade: gradeValue,
        _rowNumber: rowNumber,
      };

      validRows.push(validatedRow);
      validCount++;
    }
  }

  return {
    validRows,
    errorsByRow,
    totalRows: rows.length,
    validCount,
    invalidCount,
  };
}
