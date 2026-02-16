import { NextRequest } from 'next/server';
import { StudentService } from '@/services/student.service';
import { Gender } from '@prisma/client';
import { z } from 'zod';
import { getAdminContext, handleApiError } from './_lib/auth';

/**
 * GET /api/admin/students
 * List students with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getAdminContext();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const search = searchParams.get('search') || undefined;
    const gender = searchParams.get('gender') as Gender | undefined;
    const status = searchParams.get('status') || undefined;
    const classId = searchParams.get('classId') || undefined;
    const academicYearId = searchParams.get('academicYearId') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await StudentService.listStudents(
      context,
      {
        search,
        gender,
        page,
        limit,
      }
    );

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/students
 * Create a new student with optional enrollment and guardians
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getAdminContext();
    const body = await request.json();

    // Validate input
    const createStudentSchema = z.object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      dateOfBirth: z.string().datetime().optional(),
      gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      admissionNumber: z.string().optional(),
      classId: z.string().min(1, 'Class is required'),
      academicYearId: z.string().min(1, 'Academic year is required'),
      enrollmentDate: z.string().datetime().optional(),
      guardians: z
        .array(
          z.object({
            firstName: z.string().min(1, 'Guardian first name is required'),
            lastName: z.string().min(1, 'Guardian last name is required'),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            address: z.string().optional(),
            relationship: z.enum([
              'FATHER',
              'MOTHER',
              'GUARDIAN',
              'STEPFATHER',
              'STEPMOTHER',
              'GRANDPARENT',
              'SIBLING',
              'OTHER',
            ]),
            isPrimaryContact: z.boolean().optional(),
            isEmergencyContact: z.boolean().optional(),
          })
        )
        .optional(),
    });

    const validated = createStudentSchema.safeParse(body);

    if (!validated.success) {
      return Response.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = validated.data;

    // Convert date strings to Date objects
    const result = await StudentService.createStudent(
      {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        email: data.email,
        phone: data.phone,
        address: data.address,
        studentId: data.admissionNumber,
      },
      context
    );

    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
