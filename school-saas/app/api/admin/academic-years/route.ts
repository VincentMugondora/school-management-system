import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

// GET /api/admin/academic-years - List all academic years for the school
export async function GET(req: NextRequest) {
  try {
    const { userId } = await getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { schoolId: true, role: true },
    });

    if (!user || !user.schoolId) {
      return NextResponse.json({ 
        error: 'No school associated',
        code: 'NO_SCHOOL',
        message: 'You need to create a school first. Go to /dashboard/admin/school/new'
      }, { status: 403 });
    }

    const years = await prisma.academicYear.findMany({
      where: { schoolId: user.schoolId },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json({ success: true, years });
  } catch (error) {
    console.error('Failed to fetch academic years:', error);
    return NextResponse.json({ error: 'Failed to fetch academic years' }, { status: 500 });
  }
}

// POST /api/admin/academic-years - Create a new academic year
export async function POST(req: NextRequest) {
  try {
    const { userId } = await getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { schoolId: true, role: true },
    });

    if (!user || !user.schoolId) {
      return NextResponse.json({ 
        error: 'No school associated',
        code: 'NO_SCHOOL',
        message: 'You need to create a school first. Go to /dashboard/admin/school/new'
      }, { status: 403 });
    }

    const body = await req.json();
    const { name, startDate, endDate, isCurrent } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!startDate) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 });
    }
    if (!endDate) {
      return NextResponse.json({ error: 'End date is required' }, { status: 400 });
    }

    // If setting as current, unset any existing current year
    if (isCurrent) {
      await prisma.academicYear.updateMany({
        where: { schoolId: user.schoolId, isCurrent: true },
        data: { isCurrent: false },
      });
    }

    const year = await prisma.academicYear.create({
      data: {
        name: name.trim(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: isCurrent || false,
        schoolId: user.schoolId,
      },
    });

    return NextResponse.json({ success: true, year });
  } catch (error) {
    console.error('Failed to create academic year:', error);
    return NextResponse.json({ error: 'Failed to create academic year' }, { status: 500 });
  }
}
