/**
 * STUDENT DOMAIN - PRISMA SCHEMA DEFINITIONS
 *
 * This document provides the complete Prisma schema definitions for the
 * Student domain in a multi-tenant school management system.
 *
 * Key Design Principles:
 * - All models include schoolId for multi-tenancy
 * - Soft deletes via deletedAt field
 * - Clean separation of concerns
 * - No Clerk metadata - user linking is explicit
 * - All relations scoped by schoolId with proper indexes
 */

// ============================================
// STUDENT DOMAIN ENUMS
// ============================================

/**
 * Student lifecycle status
 */
enum StudentStatus {
  ACTIVE      // Currently enrolled and attending
  INACTIVE    // Not currently enrolled but in system
  SUSPENDED   // Enrollment suspended temporarily
  GRADUATED   // Completed final year
  TRANSFERRED // Transferred to another school
}

/**
 * Enrollment status - tracks a student's enrollment in a specific academic year
 */
enum EnrollmentStatus {
  PENDING     // Application submitted, not yet confirmed
  ACTIVE      // Currently enrolled for this academic year
  COMPLETED   // Successfully completed the academic year
  TRANSFERRED // Transferred to another class during year
  DROPPED     // Dropped out or withdrew
  SUSPENDED   // Temporarily suspended from this enrollment
}

/**
 * Guardian relationship to student
 */
enum GuardianRelationship {
  FATHER
  MOTHER
  GUARDIAN
  STEPFATHER
  STEPMOTHER
  GRANDPARENT
  SIBLING
  OTHER
}

// ============================================
// STUDENT DOMAIN MODELS
// ============================================

/**
 * Student Model
 *
 * Core entity representing a student in the school system.
 * Supports multi-tenancy via schoolId and soft deletes via deletedAt.
 */
model Student {
  id        String   @id @default(uuid())
  schoolId  String

  // Personal Information
  firstName   String
  lastName    String
  dateOfBirth DateTime?
  gender      Gender?
  email       String?  // Student's personal email (optional)
  phone       String?  // Student's phone (for older students)
  address     String?

  // School Identifiers
  admissionNumber String? @unique  // Unique admission number within school
  rollNumber      String?          // Class-specific roll number (changes per enrollment)

  // Status
  status StudentStatus @default(ACTIVE)

  // Audit Fields
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime? // Soft delete timestamp

  // Relations
  school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  // Optional link to User account (for students who can log in)
  userId String? @unique
  user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)

  // Student can have multiple guardians
  guardians Guardian[] @relation("StudentGuardians")

  // Enrollments across academic years
  enrollments Enrollment[]

  // Academic records
  results     Result[]
  attendances Attendance[]

  // Financial records
  invoices Invoice[]

  // Indexes for multi-tenancy and common queries
  @@index([schoolId])
  @@index([schoolId, status])
  @@index([schoolId, deletedAt])
  @@index([admissionNumber])
  @@index([userId])
}

/**
 * Guardian Model
 *
 * Represents a parent or guardian of a student.
 * A guardian can be linked to multiple students (e.g., siblings).
 * Can optionally have a User account for parent portal access.
 */
model Guardian {
  id       String @id @default(uuid())
  schoolId String

  // Personal Information
  firstName   String
  lastName    String
  email       String?
  phone       String?
  address     String?
  occupation  String?

  // Relationship
  relationship GuardianRelationship

  // Contact Priority
  isPrimaryContact   Boolean @default(false)
  isEmergencyContact Boolean @default(false)

  // Audit Fields
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime? // Soft delete timestamp

  // Relations
  school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  // Optional link to User account (for parent portal access)
  userId String? @unique
  user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)

  // Can be guardian to multiple students
  students Student[] @relation("StudentGuardians")

  // Indexes for multi-tenancy
  @@index([schoolId])
  @@index([schoolId, deletedAt])
  @@index([userId])
}

/**
 * Enrollment Model
 *
 * Tracks a student's enrollment in a specific academic year and class.
 * This is the central entity that links a student to their academic journey.
 */
model Enrollment {
  id       String @id @default(uuid())
  schoolId String

  // Core References - all scoped by schoolId
  studentId      String
  academicYearId String
  classId        String

  // Enrollment Details
  enrollmentDate DateTime @default(now())
  status         EnrollmentStatus @default(ACTIVE)

  // Transfer Information (if applicable)
  previousSchool       String?
  transferCertificateNo String?

  // Completion Information
  completionDate    DateTime?
  promotedToClassId String? // Links to next class if promoted

  // Audit Fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations - all scoped by schoolId
  school       School       @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  student      Student      @relation(fields: [studentId], references: [id], onDelete: Cascade)
  academicYear AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  class        Class        @relation(fields: [classId], references: [id], onDelete: Cascade)

  // Academic records linked to this enrollment
  results     Result[]
  attendances Attendance[]
  invoices    Invoice[]

  // Constraints
  // A student can only have one enrollment per academic year
  @@unique([studentId, academicYearId])

  // Indexes for multi-tenancy and common queries
  @@index([schoolId])
  @@index([studentId])
  @@index([academicYearId])
  @@index([classId])
  @@index([schoolId, status])
  @@index([studentId, status])
}

// ============================================
// RELATION UPDATES FOR EXISTING MODELS
// ============================================

/**
 * Updates to existing School model to support Student domain
 */
model School {
  // ... existing fields ...

  // Student Domain Relations
  students    Student[]
  guardians   Guardian[]
  enrollments Enrollment[]
}

/**
 * Updates to existing User model to support Student domain
 */
model User {
  // ... existing fields ...

  // Student Domain Relations (optional)
  student  Student?
  guardian Guardian?
}

/**
 * Updates to existing AcademicYear model
 */
model AcademicYear {
  // ... existing fields ...

  // Student Domain Relations
  enrollments Enrollment[]
}

/**
 * Updates to existing Class model
 */
model Class {
  // ... existing fields ...

  // Student Domain Relations
  enrollments Enrollment[]
}

// ============================================
// INDEX STRATEGY NOTES
// ============================================

/**
 * Multi-tenancy Index Strategy:
 *
 1. Every model has @@index([schoolId]) for tenant isolation
 2. Composite indexes for common query patterns:
    - @@index([schoolId, status]) - filtering by status within school
    - @@index([schoolId, deletedAt]) - soft delete filtering
 3. Foreign key indexes for relation queries
 4. Unique constraints scoped appropriately
 *
 * Query Pattern Examples:
 * - List all active students in school: WHERE schoolId = ? AND status = 'ACTIVE' AND deletedAt IS NULL
 * - Get student enrollments: WHERE studentId = ? ORDER BY enrollmentDate DESC
 * - Find guardian's students: JOIN via StudentGuardians relation
 */
