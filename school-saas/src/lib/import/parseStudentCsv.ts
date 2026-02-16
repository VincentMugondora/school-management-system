/**
 * @fileoverview CSV Parser for Student Import
 *
 * Parses CSV data into StudentImportRow objects with validation.
 * Handles string trimming, date normalization, and gender mapping.
 * No database dependencies.
 *
 * @module lib/import/parseStudentCsv
 */

import { StudentImportRow, ImportError } from '@/domain/student/import';

/**
 * Result of parsing a CSV file.
 */
export interface CsvParseResult {
  /** Successfully parsed rows */
  rows: StudentImportRow[];

  /** Errors encountered during parsing */
  errors: ImportError[];

  /** Total number of data rows processed (excluding header) */
  totalRows: number;
}

/**
 * Required CSV column headers (case-insensitive).
 */
const REQUIRED_HEADERS = ['studentid', 'firstname', 'lastname', 'classname'] as const;

/**
 * Maps CSV column names to StudentImportRow property names.
 * Case-insensitive matching.
 */
const HEADER_MAPPINGS: Record<string, keyof StudentImportRow> = {
  studentid: 'studentId',
  student_id: 'studentId',
  id: 'studentId',
  admissionnumber: 'studentId',
  admission_number: 'studentId',
  firstname: 'firstName',
  first_name: 'firstName',
  lastname: 'lastName',
  last_name: 'lastName',
  surname: 'lastName',
  dateofbirth: 'dateOfBirth',
  date_of_birth: 'dateOfBirth',
  dob: 'dateOfBirth',
  birthdate: 'dateOfBirth',
  gender: 'gender',
  sex: 'gender',
  classname: 'className',
  class_name: 'className',
  class: 'className',
  grade: 'className',
  parentemail: 'parentEmail',
  parent_email: 'parentEmail',
  email: 'parentEmail',
  parentphone: 'parentPhone',
  parent_phone: 'parentPhone',
  phone: 'parentPhone',
  parentname: 'parentName',
  parent_name: 'parentName',
  guardianname: 'parentName',
  address: 'address',
  homeaddress: 'address',
  home_address: 'address',
  academicyear: 'academicYear',
  academic_year: 'academicYear',
  year: 'academicYear',
};

/**
 * Normalizes gender values to MALE/FEMALE/OTHER.
 *
 * @param value - Raw gender value from CSV
 * @returns Normalized gender or undefined
 */
function normalizeGender(value: string): 'MALE' | 'FEMALE' | 'OTHER' | undefined {
  const normalized = value.toUpperCase().trim();

  if (normalized === 'M' || normalized === 'MALE' || normalized === 'BOY' || normalized === 'M1') {
    return 'MALE';
  }
  if (normalized === 'F' || normalized === 'FEMALE' || normalized === 'GIRL' || normalized === 'F1') {
    return 'FEMALE';
  }
  if (normalized === 'O' || normalized === 'OTHER') {
    return 'OTHER';
  }

  return undefined;
}

/**
 * Parses a date string into ISO 8601 format (YYYY-MM-DD).
 * Supports multiple common date formats.
 *
 * @param value - Raw date string
 * @returns ISO date string or undefined if invalid
 */
function parseDate(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  // Try YYYY-MM-DD (already ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return trimmed;
    }
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10);
    const year = parseInt(ddmmyyyy[3], 10);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime()) && date.getDate() === day) {
      return date.toISOString().split('T')[0];
    }
  }

  // Try MM/DD/YYYY or MM-DD-YYYY
  const mmddyyyy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (mmddyyyy) {
    const month = parseInt(mmddyyyy[1], 10);
    const day = parseInt(mmddyyyy[2], 10);
    const year = parseInt(mmddyyyy[3], 10);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime()) && date.getMonth() === month - 1) {
      return date.toISOString().split('T')[0];
    }
  }

  // Try general Date parsing as fallback
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return undefined;
}

/**
 * Safely trims a string value.
 *
 * @param value - Value to trim
 * @returns Trimmed string or empty string
 */
function safeTrim(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

/**
 * Parses a CSV line into an array of values.
 * Handles quoted values and escaped quotes.
 *
 * @param line - CSV line to parse
 * @returns Array of values
 */
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Don't forget the last value
  values.push(current);

  return values;
}

/**
 * Validates required fields for a row.
 *
 * @param row - Partial row data
 * @param rowNumber - 1-based row number for error reporting
 * @returns Array of validation errors
 */
function validateRequiredFields(
  row: Partial<StudentImportRow>,
  rowNumber: number
): ImportError[] {
  const errors: ImportError[] = [];

  if (!row.studentId || row.studentId.trim() === '') {
    errors.push({
      rowNumber,
      field: 'studentId',
      message: 'Student ID is required',
      severity: 'ERROR',
    });
  }

  if (!row.firstName || row.firstName.trim() === '') {
    errors.push({
      rowNumber,
      field: 'firstName',
      message: 'First name is required',
      severity: 'ERROR',
    });
  }

  if (!row.lastName || row.lastName.trim() === '') {
    errors.push({
      rowNumber,
      field: 'lastName',
      message: 'Last name is required',
      severity: 'ERROR',
    });
  }

  if (!row.className || row.className.trim() === '') {
    errors.push({
      rowNumber,
      field: 'className',
      message: 'Class name is required',
      severity: 'ERROR',
    });
  }

  return errors;
}

/**
 * Parses CSV data into StudentImportRow objects.
 *
 * @param csvData - CSV content as string or Buffer
 * @param options - Parsing options
 * @returns Parsed rows and any errors
 *
 * @example
 * const result = parseStudentCsv(
 *   'studentId,firstName,lastName,className\n2024-001,John,Doe,Grade 5A',
 *   { skipHeader: false }
 * );
 * // result.rows[0] = { studentId: '2024-001', firstName: 'John', ... }
 */
export function parseStudentCsv(
  csvData: string | Buffer,
  options: { skipHeader: boolean } = { skipHeader: true }
): CsvParseResult {
  const content = typeof csvData === 'string' ? csvData : csvData.toString('utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

  const result: CsvParseResult = {
    rows: [],
    errors: [],
    totalRows: 0,
  };

  if (lines.length === 0) {
    result.errors.push({
      rowNumber: 0,
      field: 'file',
      message: 'CSV file is empty',
      severity: 'ERROR',
    });
    return result;
  }

  // Parse header
  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map(h => safeTrim(h).toLowerCase());

  // Validate required headers
  const normalizedHeaders = headers.map(h => h.replace(/\s+/g, ''));
  const missingHeaders = REQUIRED_HEADERS.filter(
    required => !normalizedHeaders.some(h => HEADER_MAPPINGS[h] === HEADER_MAPPINGS[required])
  );

  if (missingHeaders.length > 0) {
    result.errors.push({
      rowNumber: 0,
      field: 'header',
      message: `Missing required columns: ${missingHeaders.join(', ')}`,
      severity: 'ERROR',
    });
    return result;
  }

  // Map header indices to field names
  const headerMapping: (keyof StudentImportRow | undefined)[] = headers.map(header =>
    HEADER_MAPPINGS[header.replace(/\s+/g, '')]
  );

  // Parse data rows
  const startRow = options.skipHeader ? 1 : 0;

  for (let i = startRow; i < lines.length; i++) {
    const lineNumber = i - startRow + 1; // 1-based for user-facing errors
    const line = lines[i];

    try {
      const values = parseCsvLine(line);

      // Check column count mismatch
      if (values.length !== headers.length) {
        result.errors.push({
          rowNumber: lineNumber,
          field: 'row',
          message: `Column count mismatch: expected ${headers.length}, got ${values.length}`,
          severity: 'ERROR',
        });
        result.totalRows++;
        continue;
      }

      // Build row object
      const row: Partial<StudentImportRow> = {};

      values.forEach((value, index) => {
        const fieldName = headerMapping[index];
        if (!fieldName) return; // Skip unmapped columns

        const trimmedValue = safeTrim(value);

        if (fieldName === 'gender') {
          const normalized = normalizeGender(trimmedValue);
          if (normalized) {
            row[fieldName] = normalized;
          }
        } else if (fieldName === 'dateOfBirth') {
          const parsed = parseDate(trimmedValue);
          if (parsed) {
            row[fieldName] = parsed;
          }
        } else {
          row[fieldName] = trimmedValue;
        }
      });

      // Validate required fields
      const validationErrors = validateRequiredFields(row, lineNumber);
      result.errors.push(...validationErrors);

      // Only add row if it has required fields
      if (
        row.studentId &&
        row.firstName &&
        row.lastName &&
        row.className
      ) {
        result.rows.push(row as StudentImportRow);
      }

      result.totalRows++;
    } catch (error) {
      result.errors.push({
        rowNumber: lineNumber,
        field: 'row',
        message: `Failed to parse row: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'ERROR',
      });
      result.totalRows++;
    }
  }

  return result;
}
