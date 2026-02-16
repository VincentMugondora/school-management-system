/**
 * @fileoverview Student Import Commit API Route
 *
 * POST /api/admin/students/import/commit
 *
 * Commits student import to database after re-validation.
 * Uses StudentImportService for transactional import.
 * Re-validates data - never trusts preview.
 *
 * @module api/admin/students/import/commit
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';
import { parseStudentCsv } from '@/lib/import/parseStudentCsv';
import { validateStudentRows } from '@/services/studentImport/validateStudentRows';
import { StudentImportService } from '@/services/studentImport/studentImport.service';
import { ImportError } from '@/domain/student/import';

/**
 * Maximum file size for CSV uploads (5MB).
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * POST handler for student import commit.
 *
 * @param req - Next.js request with CSV file and academic year ID
 * @returns Import result with success/failure report
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Step 1: Authenticate
    const { userId } = await getAuth(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in' },
        { status: 401 }
      );
    }

    // Step 2: Verify admin role and school membership
    const admin = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        role: true,
        schoolId: true,
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Not found', message: 'User not found' },
        { status: 404 }
      );
    }

    if (admin.role !== Role.ADMIN && admin.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Only administrators can import students',
        },
        { status: 403 }
      );
    }

    if (!admin.schoolId) {
      return NextResponse.json(
        {
          error: 'No school',
          message: 'Admin is not associated with any school',
        },
        { status: 400 }
      );
    }

    // Step 3: Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const academicYearId = formData.get('academicYearId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Missing file', message: 'No CSV file provided' },
        { status: 400 }
      );
    }

    if (!academicYearId) {
      return NextResponse.json(
        {
          error: 'Missing academicYearId',
          message: 'Academic year ID is required',
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          message: 'Only CSV files are allowed',
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // Step 4: Verify academic year belongs to admin's school
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        schoolId: admin.schoolId,
      },
      select: { id: true, name: true },
    });

    if (!academicYear) {
      return NextResponse.json(
        {
          error: 'Invalid academic year',
          message: 'Academic year not found or does not belong to this school',
        },
        { status: 400 }
      );
    }

    // Step 5: Read and parse CSV
    const csvContent = await file.text();
    const parseResult = parseStudentCsv(csvContent, { skipHeader: true });

    if (parseResult.errors.length > 0 && parseResult.rows.length === 0) {
      // CSV parsing completely failed - block import
      return NextResponse.json(
        {
          success: false,
          imported: false,
          error: 'CSV parsing failed',
          message: 'Fix CSV errors before committing',
          parseErrors: parseResult.errors,
          summary: {
            totalRows: 0,
            successCount: 0,
            failureCount: 0,
          },
        },
        { status: 400 }
      );
    }

    // Step 6: RE-VALIDATE data (never trust preview)
    // Fetch fresh school context for validation
    const classes = await prisma.class.findMany({
      where: { schoolId: admin.schoolId },
      select: { name: true },
    });
    const existingClassNames = new Set(classes.map((c) => c.name));

    const existingStudents = await prisma.student.findMany({
      where: { schoolId: admin.schoolId },
      select: { studentId: true },
    });
    const existingAdmissionNumbers = new Set(
      existingStudents.map((s) => s.studentId).filter(Boolean) as string[]
    );

    const validationResult = validateStudentRows(parseResult.rows, {
      existingClassNames,
      academicYear: academicYear.name,
      existingAdmissionNumbers,
    });

    // Block if any validation errors
    if (validationResult.invalidCount > 0) {
      // Convert errors map to array
      const validationErrors: Array<{
        rowNumber: number;
        field: string;
        message: string;
        severity: string;
      }> = [];
      validationResult.errorsByRow.forEach((errors: ImportError[], rowNumber: number) => {
        errors.forEach((error: ImportError) => {
          validationErrors.push({
            rowNumber,
            field: error.field,
            message: error.message,
            severity: error.severity,
          });
        });
      });

      return NextResponse.json(
        {
          success: false,
          imported: false,
          error: 'Validation failed',
          message: `Found ${validationResult.invalidCount} invalid rows. Fix errors before committing.`,
          summary: {
            totalRows: validationResult.totalRows,
            successCount: 0,
            failureCount: validationResult.invalidCount,
          },
          validationErrors,
        },
        { status: 400 }
      );
    }

    // Step 7: All rows valid - proceed with import
    // Extract valid rows for import
    const rowsToImport = validationResult.validRows.map((row) => ({
      studentId: row.studentId,
      firstName: row.firstName,
      lastName: row.lastName,
      dateOfBirth: row.dateOfBirth,
      gender: row.gender === 'M' ? 'MALE' : 'FEMALE',
      className: row.className,
      parentEmail: row.parentEmail,
      parentPhone: row.parentPhone,
      parentName: row.parentName,
      address: row.address,
      academicYear: row.academicYear,
    }));

    // Step 8: Call StudentImportService
    const importResult = await StudentImportService.importStudents(
      admin.id,
      academicYearId,
      rowsToImport
    );

    // Step 9: Return success/failure report
    return NextResponse.json({
      success: importResult.successCount > 0,
      imported: importResult.successCount > 0,
      summary: {
        totalRows: importResult.totalRows,
        successCount: importResult.successCount,
        failureCount: importResult.failureCount,
        durationMs: importResult.durationMs,
      },
      errors: importResult.errors,
      successfulRowNumbers: importResult.successfulRowNumbers,
      failedRowNumbers: importResult.failedRowNumbers,
      completedAt: importResult.completedAt.toISOString(),
    });
  } catch (error) {
    console.error('Student import commit error:', error);

    return NextResponse.json(
      {
        success: false,
        imported: false,
        error: 'Import failed',
        message:
          error instanceof Error ? error.message : 'An unexpected error occurred',
        summary: {
          totalRows: 0,
          successCount: 0,
          failureCount: 0,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - returns route information.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    route: '/api/admin/students/import/commit',
    methods: ['POST'],
    description: 'Commit student CSV import to database',
    requirements: {
      authentication: 'Required (Admin only)',
      contentType: 'multipart/form-data',
      fields: ['file', 'academicYearId'],
      maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
      fileType: 'CSV only',
      validation: 'Re-validates all data before import',
    },
    workflow: [
      '1. Upload CSV to /api/admin/students/import/preview',
      '2. Fix any validation errors',
      '3. Upload same CSV to this endpoint with academicYearId',
      '4. Data is re-validated and committed atomically',
    ],
  });
}
