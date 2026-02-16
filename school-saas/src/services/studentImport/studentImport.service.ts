/**
 * @fileoverview Student Import Service
 *
 * Handles bulk import of students with full transactional integrity.
 * All-or-nothing semantics: if ANY row fails, entire transaction is rolled back.
 *
 * @module services/studentImport/studentImport.service
 */

import { prisma } from '@/lib/db';
import { Gender, Role, Prisma } from '@prisma/client';
import {
  StudentImportRow,
  StudentImportResult,
  ImportError,
  createEmptyImportResult,
} from '@/domain/student/import';

/**
 * Service context for authorization.
 */
interface ServiceContext {
  userId: string;
  schoolId: string;
  role: Role;
}

/**
 * Extended student row with resolved class ID.
 */
interface ResolvedStudentRow extends StudentImportRow {
  classId: string;
  resolvedGrade: string;
}

/**
 * Custom error for import validation failures.
 */
class ImportValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: ImportError[]
  ) {
    super(message);
    this.name = 'ImportValidationError';
  }
}

/**
 * StudentImportService - Handles bulk student imports with transactional integrity.
 */
export const StudentImportService = {
  /**
   * Import multiple students in a single transaction.
   * If ANY row fails validation or creation, the entire transaction is rolled back.
   *
   * @param adminUserId - ID of the admin performing the import
   * @param academicYearId - Academic year for enrollments
   * @param rows - Student data rows to import
   * @returns Import result with success counts and any errors
   * @throws ImportValidationError if validation fails (before transaction)
   *
   * @example
   * const result = await StudentImportService.importStudents(
   *   'admin-123',
   *   'year-2024',
   *   [
   *     { studentId: '2024-001', firstName: 'John', lastName: 'Doe', className: 'Grade 5A', gender: 'MALE', dateOfBirth: '2012-05-15' }
   *   ]
   * );
   */
  async importStudents(
    adminUserId: string,
    academicYearId: string,
    rows: StudentImportRow[]
  ): Promise<StudentImportResult> {
    const startTime = new Date();
    const result = createEmptyImportResult(startTime);

    if (rows.length === 0) {
      result.errors.push({
        rowNumber: 0,
        field: 'import',
        message: 'No rows to import',
        severity: 'ERROR',
      });
      result.completedAt = new Date();
      result.durationMs = result.completedAt.getTime() - startTime.getTime();
      return result;
    }

    // Step 1: Verify admin and get school context
    const context = await this.verifyAdminAndGetContext(adminUserId, academicYearId);

    // Step 2: Pre-validate all rows and resolve class IDs (outside transaction)
    const { resolvedRows, validationErrors } = await this.preValidateAndResolve(
      rows,
      context
    );

    if (validationErrors.length > 0) {
      // Validation failed - return errors without starting transaction
      result.errors = validationErrors;
      result.failureCount = rows.length;
      result.totalRows = rows.length;
      result.failedRowNumbers = rows.map((_, i) => i + 1);
      result.completedAt = new Date();
      result.durationMs = result.completedAt.getTime() - startTime.getTime();
      return result;
    }

    // Step 3: Execute import in transaction (all-or-nothing)
    try {
      await prisma.$transaction(
        async (tx) => {
          const successfulRows: number[] = [];

          for (let i = 0; i < resolvedRows.length; i++) {
            const row = resolvedRows[i];
            const rowNumber = i + 1;

            try {
              // Check admission number uniqueness within this school (in transaction)
              const existingStudent = await tx.student.findFirst({
                where: {
                  schoolId: context.schoolId,
                  studentId: row.studentId.trim(),
                },
                select: { id: true },
              });

              if (existingStudent) {
                throw new Error(
                  `Admission number "${row.studentId}" already exists in this school`
                );
              }

              // Create student
              const student = await tx.student.create({
                data: {
                  schoolId: context.schoolId,
                  firstName: row.firstName.trim(),
                  lastName: row.lastName.trim(),
                  studentId: row.studentId.trim(),
                  dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
                  gender: this.normalizeGender(row.gender),
                  email: row.parentEmail?.trim() || null,
                  phone: row.parentPhone?.trim() || null,
                  address: row.address?.trim() || null,
                },
              });

              // Create enrollment for academic year
              await tx.enrollment.create({
                data: {
                  schoolId: context.schoolId,
                  studentId: student.id,
                  academicYearId: academicYearId,
                  classId: row.classId,
                  status: 'ACTIVE',
                },
              });

              // Create parent if parent info provided
              if (row.parentName || row.parentEmail || row.parentPhone) {
                await this.createParentAndLink(tx, student.id, row, context.schoolId);
              }

              successfulRows.push(rowNumber);
            } catch (error) {
              // Any error causes entire transaction to rollback
              const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';
              throw new ImportValidationError(
                `Row ${rowNumber} failed: ${errorMessage}`,
                [
                  {
                    rowNumber,
                    field: 'import',
                    message: errorMessage,
                    severity: 'ERROR',
                  },
                ]
              );
            }
          }

          // If we reach here, all rows succeeded
          result.successCount = resolvedRows.length;
          result.successfulRowNumbers = successfulRows;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 30000,
        }
      );

      result.totalRows = rows.length;
      result.failureCount = 0;
      result.failedRowNumbers = [];
    } catch (error) {
      // Transaction rolled back - all rows failed
      if (error instanceof ImportValidationError) {
        result.errors = error.errors;
      } else {
        result.errors.push({
          rowNumber: 0,
          field: 'transaction',
          message:
            error instanceof Error
              ? error.message
              : 'Transaction failed - all changes rolled back',
          severity: 'ERROR',
        });
      }

      result.successCount = 0;
      result.failureCount = rows.length;
      result.successfulRowNumbers = [];
      result.failedRowNumbers = rows.map((_, i) => i + 1);
      result.totalRows = rows.length;
    }

    result.completedAt = new Date();
    result.durationMs = result.completedAt.getTime() - startTime.getTime();

    return result;
  },

  /**
   * Verify admin belongs to school and has permission.
   *
   * @param adminUserId - Admin user ID
   * @param academicYearId - Academic year to verify exists
   * @returns Service context with school ID
   * @throws Error if admin not authorized
   */
  async verifyAdminAndGetContext(
    adminUserId: string,
    academicYearId: string
  ): Promise<ServiceContext> {
    // Get admin user with school
    const admin = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: {
        id: true,
        schoolId: true,
        role: true,
      },
    });

    if (!admin) {
      throw new Error('Admin user not found');
    }

    if (!admin.schoolId) {
      throw new Error('Admin is not associated with any school');
    }

    if (admin.role !== Role.ADMIN && admin.role !== Role.SUPER_ADMIN) {
      throw new Error('User does not have admin privileges');
    }

    // Verify academic year exists and belongs to admin's school
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        schoolId: admin.schoolId,
      },
      select: { id: true },
    });

    if (!academicYear) {
      throw new Error(
        'Academic year not found or does not belong to this school'
      );
    }

    return {
      userId: admin.id,
      schoolId: admin.schoolId,
      role: admin.role,
    };
  },

  /**
   * Pre-validate all rows and resolve class IDs from class names.
   * This runs outside the transaction to fail fast before any DB writes.
   *
   * @param rows - Student import rows
   * @param context - Service context with school ID
   * @returns Resolved rows with class IDs, or validation errors
   */
  async preValidateAndResolve(
    rows: StudentImportRow[],
    context: ServiceContext
  ): Promise<{
    resolvedRows: ResolvedStudentRow[];
    validationErrors: ImportError[];
  }> {
    const validationErrors: ImportError[] = [];
    const resolvedRows: ResolvedStudentRow[] = [];

    // Fetch all classes for this school to resolve class names to IDs
    const classes = await prisma.class.findMany({
      where: { schoolId: context.schoolId },
      select: {
        id: true,
        name: true,
        grade: true,
      },
    });

    // Build lookup maps
    const classByName = new Map(classes.map((c) => [c.name, c]));
    const existingAdmissionNumbers = new Set<string>();

    // Check existing admission numbers in this school
    const existingStudents = await prisma.student.findMany({
      where: { schoolId: context.schoolId },
      select: { studentId: true },
    });
    existingStudents.forEach((s) => existingAdmissionNumbers.add(s.studentId));

    // Track admission numbers within this import batch
    const batchAdmissionNumbers = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;
      const rowErrors: ImportError[] = [];

      // Validate required fields
      if (!row.firstName || row.firstName.trim() === '') {
        rowErrors.push({
          rowNumber,
          field: 'firstName',
          message: 'First name is required',
          severity: 'ERROR',
        });
      }

      if (!row.lastName || row.lastName.trim() === '') {
        rowErrors.push({
          rowNumber,
          field: 'lastName',
          message: 'Last name is required',
          severity: 'ERROR',
        });
      }

      // Validate and normalize admission number
      const admissionNumber = row.studentId?.trim();
      if (!admissionNumber || admissionNumber.length < 3) {
        rowErrors.push({
          rowNumber,
          field: 'studentId',
          message: 'Admission number is required (min 3 characters)',
          severity: 'ERROR',
        });
      } else {
        // Check for duplicates in existing students
        if (existingAdmissionNumbers.has(admissionNumber)) {
          rowErrors.push({
            rowNumber,
            field: 'studentId',
            message: `Admission number "${admissionNumber}" already exists in school`,
            severity: 'ERROR',
          });
        }

        // Check for duplicates within this batch
        if (batchAdmissionNumbers.has(admissionNumber)) {
          rowErrors.push({
            rowNumber,
            field: 'studentId',
            message: `Duplicate admission number "${admissionNumber}" in import batch`,
            severity: 'ERROR',
          });
        } else {
          batchAdmissionNumbers.add(admissionNumber);
        }
      }

      // Resolve class name to ID
      if (!row.className || row.className.trim() === '') {
        rowErrors.push({
          rowNumber,
          field: 'className',
          message: 'Class name is required',
          severity: 'ERROR',
        });
      } else {
        const classInfo = classByName.get(row.className.trim());
        if (!classInfo) {
          rowErrors.push({
            rowNumber,
            field: 'className',
            message: `Class "${row.className}" not found in school`,
            severity: 'ERROR',
          });
        }
      }

      // Validate gender
      const normalizedGender = this.normalizeGender(row.gender);
      if (!normalizedGender) {
        rowErrors.push({
          rowNumber,
          field: 'gender',
          message: 'Gender must be MALE or FEMALE',
          severity: 'ERROR',
        });
      }

      // Validate date of birth if provided
      if (row.dateOfBirth) {
        const dob = new Date(row.dateOfBirth);
        if (isNaN(dob.getTime())) {
          rowErrors.push({
            rowNumber,
            field: 'dateOfBirth',
            message: 'Invalid date of birth format',
            severity: 'ERROR',
          });
        } else {
          const now = new Date();
          const age = now.getFullYear() - dob.getFullYear();
          if (age < 2 || age > 25) {
            rowErrors.push({
              rowNumber,
              field: 'dateOfBirth',
              message: 'Student age must be between 2 and 25 years',
              severity: 'ERROR',
            });
          }
        }
      }

      // If row has errors, add to validation errors
      if (rowErrors.length > 0) {
        validationErrors.push(...rowErrors);
      } else {
        // Row is valid - create resolved row
        const classInfo = classByName.get(row.className.trim())!;
        resolvedRows.push({
          ...row,
          classId: classInfo.id,
          resolvedGrade: classInfo.grade,
          studentId: admissionNumber,
        });
      }
    }

    return { resolvedRows, validationErrors };
  },

  /**
   * Normalize gender string to Prisma Gender enum.
   *
   * @param gender - Raw gender string
   * @returns Normalized Gender or null
   */
  normalizeGender(gender?: string): Gender | null {
    if (!gender) return null;

    const normalized = gender.toUpperCase().trim();

    if (normalized === 'M' || normalized === 'MALE') {
      return Gender.MALE;
    }
    if (normalized === 'F' || normalized === 'FEMALE') {
      return Gender.FEMALE;
    }

    return null;
  },

  /**
   * Create a parent record and link to student.
   *
   * @param tx - Prisma transaction client
   * @param studentId - Student ID to link
   * @param row - Student import row with parent info
   * @param schoolId - School ID
   */
  async createParentAndLink(
    tx: Prisma.TransactionClient,
    studentId: string,
    row: StudentImportRow,
    schoolId: string
  ): Promise<void> {
    // Create parent record
    const parent = await tx.parent.create({
      data: {
        schoolId,
        userId: studentId, // Temporary - should create proper user account
        phone: row.parentPhone?.trim() || null,
        address: row.address?.trim() || null,
      },
    });

    // Link parent to student
    await tx.student.update({
      where: { id: studentId },
      data: {
        parentId: parent.id,
      },
    });
  },
};
