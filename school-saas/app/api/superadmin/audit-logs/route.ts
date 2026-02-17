import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';

/**
 * GET /api/superadmin/audit-logs
 *
 * Query system-wide audit logs with filters and pagination.
 * Only accessible to SUPERADMIN users.
 *
 * Query Parameters:
 * - schoolId: Filter by specific school
 * - action: Filter by action type (CREATE, UPDATE, DELETE, etc.)
 * - startDate: Filter from date (ISO string)
 * - endDate: Filter to date (ISO string)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 */

const ITEMS_PER_PAGE = 20;
const MAX_ITEMS_PER_PAGE = 100;

async function verifySuperAdmin(clerkId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true },
  });
  return user?.role === Role.SUPER_ADMIN;
}

export async function GET(request: NextRequest) {
  try {
    // Step 1: Verify authentication
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Step 2: Verify SUPERADMIN role
    const isSuperAdmin = await verifySuperAdmin(clerkId);

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - SUPERADMIN access required' },
        { status: 403 }
      );
    }

    // Step 3: Parse query parameters
    const { searchParams } = new URL(request.url);
    
    const schoolId = searchParams.get('schoolId') || undefined;
    const action = searchParams.get('action') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
      MAX_ITEMS_PER_PAGE,
      Math.max(1, parseInt(searchParams.get('limit') || String(ITEMS_PER_PAGE), 10))
    );

    // Step 4: Build where clause
    const where: any = {};

    if (schoolId) {
      where.schoolId = schoolId;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Step 5: Fetch audit logs with pagination
    const skip = (page - 1) * limit;

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          school: {
            select: {
              name: true,
              slug: true,
            },
          },
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // Step 6: Return response
    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters: {
          schoolId,
          action,
          startDate,
          endDate,
        },
      },
    });

  } catch (error) {
    console.error('[GET /api/superadmin/audit-logs] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
