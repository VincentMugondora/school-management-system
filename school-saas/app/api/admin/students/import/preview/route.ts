/**
 * @fileoverview Student Import Preview API Route
 *
 * POST /api/admin/students/import/preview
 *
 * Accepts CSV file upload, parses and validates rows, returns preview.
 * No database writes - pure preview functionality.
 *
 * @module api/admin/students/import/preview
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';
import { parseStudentCsv } from '@/lib/import/parseStudentCsv';
import { validateStudentRows } from '@/services/studentImport/validateStudentRows';

/**
 * Maximum file size for CSV uploads (5MB).
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Maximum number of rows to process for preview.
 */
const MAX_PREVIEW_ROWS = 1000;

/**
 * POST handler for student import preview.
 *
 * @param req - Next.js request with CSV file
 * @returns Preview result with parsed rows, validation errors, and sample data
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

    if (!file) {
      return NextResponse.json(
        { error: 'Missing file', message: 'No CSV file provided' },
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

    // Step 4: Read and parse CSV
    const csvContent = await file.text();
    const parseResult = parseStudentCsv(csvContent, { skipHeader: true });

    if (parseResult.errors.length > 0 && parseResult.rows.length === 0) {
      // CSV parsing completely failed
      return NextResponse.json(
        {
          success: false,
          error: 'CSV parsing failed',
          parseErrors: parseResult.errors,
          totalRows: 0,
          validRows: 0,
          invalidRows: 0,
          preview: [],
          validationErrors: [],
        },
        { status: 400 }
      );
    }

    // Limit rows for preview
    const rowsToProcess = parseResult.rows.slice(0, MAX_PREVIEW_ROWS);

    // Step 5: Fetch school context for validation (READ ONLY)
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

    // Step 6: Validate rows
    const validationResult = validateStudentRows(rowsToProcess, {
      existingClassNames,
      academicYear: '', // Not needed for preview
      existingAdmissionNumbers,
    });

    // Step 7: Build preview response
    const previewRows = validationResult.validRows.slice(0, 10).map((row) => ({
      studentId: row.studentId,
      firstName: row.firstName,
      lastName: row.lastName,
      gender: row.gender,
      dateOfBirth: row.dateOfBirth,
      className: row.className,
      grade: row.grade,
      parentEmail: row.parentEmail,
      parentName: row.parentName,
    }));

    // Convert errors map to array
    const validationErrors: Array<{
      rowNumber: number;
      field: string;
      message: string;
      severity: string;
    }> = [];
    validationResult.errorsByRow.forEach((errors, rowNumber) => {
      errors.forEach((error) => {
        validationErrors.push({
          rowNumber,
          field: error.field,
          message: error.message,
          severity: error.severity,
        });
      });
    });

    // Step 8: Return preview response
    return NextResponse.json({
      success: true,
      summary: {
        totalRows: parseResult.totalRows,
        processedRows: rowsToProcess.length,
        validRows: validationResult.validCount,
        invalidRows: validationResult.invalidCount,
        limited: parseResult.rows.length > MAX_PREVIEW_ROWS,
      },
      preview: previewRows,
      validationErrors,
      parseErrors:
        parseResult.errors.length > 0 ? parseResult.errors : undefined,
      canImport: validationResult.validCount > 0 && validationResult.invalidCount === 0,
    });
  } catch (error) {
    console.error('Student import preview error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Preview failed',
        message:
          error instanceof Error ? error.message : 'An unexpected error occurred',
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
    route: '/api/admin/students/import/preview',
    methods: ['POST'],
    description: 'Preview student CSV import without database writes',
    requirements: {
      authentication: 'Required (Admin only)',
      contentType: 'multipart/form-data',
      maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
      fileType: 'CSV only',
    },
  });
}
