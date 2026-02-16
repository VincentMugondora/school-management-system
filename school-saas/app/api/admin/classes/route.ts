import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

// GET /api/admin/classes - List all classes for the school
export async function GET(req: NextRequest) {
  try {
    const { userId } = await getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { adminOf: true },
    });

    if (!user || !user.schoolId) {
      return NextResponse.json({ error: 'No school associated' }, { status: 403 });
    }

    const classes = await prisma.class.findMany({
      where: { schoolId: user.schoolId },
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
    });

    return NextResponse.json({ success: true, classes });
  } catch (error) {
    console.error('Failed to fetch classes:', error);
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}

// POST /api/admin/classes - Create a new class
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
      return NextResponse.json({ error: 'No school associated' }, { status: 403 });
    }

    // Get active academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { schoolId: user.schoolId, isCurrent: true },
      select: { id: true },
    });

    if (!academicYear) {
      return NextResponse.json({ error: 'No active academic year found. Please create an academic year first.' }, { status: 400 });
    }

    const body = await req.json();
    const { name, grade, stream } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Class name is required' }, { status: 400 });
    }
    if (!grade || !grade.trim()) {
      return NextResponse.json({ error: 'Grade/Level is required' }, { status: 400 });
    }

    // Check if class with same name/stream already exists
    const existing = await prisma.class.findFirst({
      where: {
        schoolId: user.schoolId,
        name: name.trim(),
        stream: stream?.trim() || null,
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Class with this name and stream already exists' }, { status: 400 });
    }

    const newClass = await prisma.class.create({
      data: {
        name: name.trim(),
        grade: grade.trim(),
        stream: stream?.trim() || null,
        schoolId: user.schoolId,
        academicYearId: academicYear.id,
      },
    });

    return NextResponse.json({ success: true, class: newClass });
  } catch (error) {
    console.error('Failed to create class:', error);
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
  }
}
