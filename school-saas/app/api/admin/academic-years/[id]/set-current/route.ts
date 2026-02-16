import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

// POST /api/admin/academic-years/[id]/set-current - Set an academic year as current
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verify the academic year belongs to this school
    const year = await prisma.academicYear.findFirst({
      where: { id, schoolId: user.schoolId },
    });

    if (!year) {
      return NextResponse.json({ error: 'Academic year not found' }, { status: 404 });
    }

    // Unset current from all other years
    await prisma.academicYear.updateMany({
      where: { schoolId: user.schoolId, isCurrent: true },
      data: { isCurrent: false },
    });

    // Set this year as current
    await prisma.academicYear.update({
      where: { id },
      data: { isCurrent: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to set current academic year:', error);
    return NextResponse.json({ error: 'Failed to set current academic year' }, { status: 500 });
  }
}
