import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

// POST /api/admin/school - Create a school for the current admin
export async function POST(req: NextRequest) {
  try {
    const { userId } = await getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, schoolId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.schoolId) {
      return NextResponse.json({ error: 'User already has a school' }, { status: 400 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'School name is required' }, { status: 400 });
    }

    // Create school
    const school = await prisma.school.create({
      data: {
        name: name.trim(),
        slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        status: 'ACTIVE',
      },
    });

    // Update user with schoolId
    await prisma.user.update({
      where: { id: user.id },
      data: { schoolId: school.id },
    });

    return NextResponse.json({ success: true, school });
  } catch (error) {
    console.error('Failed to create school:', error);
    return NextResponse.json({ error: 'Failed to create school' }, { status: 500 });
  }
}
