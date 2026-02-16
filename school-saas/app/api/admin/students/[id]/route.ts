import { NextRequest } from 'next/server';
import { StudentService } from '@/services/student.service';
import { Gender } from '@prisma/client';
import { z } from 'zod';
import { getAdminContext, handleApiError } from '../_lib/auth';

/**
 * GET /api/admin/students/[id]
 * Get a single student by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getAdminContext();
    const { id } = params;

    const student = await StudentService.getStudentById(
      id,
      context
    );

    return Response.json(student);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/admin/students/[id]
 * Update student information
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getAdminContext();
    const { id } = params;
    const body = await request.json();

    // Validate input
    const updateStudentSchema = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      dateOfBirth: z.string().datetime().optional(),
      gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      admissionNumber: z.string().optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'GRADUATED', 'TRANSFERRED']).optional(),
    });

    const validated = updateStudentSchema.safeParse(body);

    if (!validated.success) {
      return Response.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = validated.data;

    // Convert date strings to Date objects
    const result = await StudentService.updateStudent(
      id,
      {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender as Gender | undefined,
        email: data.email,
        phone: data.phone,
        address: data.address,
      },
      context
    );

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/students/[id]
 * Soft delete a student
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getAdminContext();
    const { id } = params;

    await StudentService.deleteStudent(id, context);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
