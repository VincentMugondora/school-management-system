# School Onboarding Technical Specification

## 1. Overview

### 1.1 Goals
- Enable new administrators to create their school during onboarding
- Enforce one-school-per-admin business rule
- Prevent access to admin features until school creation is complete
- Provide a seamless, secure onboarding experience

### 1.2 Target Users
- **Primary**: New `ADMIN` and `SUPER_ADMIN` users without an associated school
- **Secondary**: System administrators managing multiple schools (SUPER_ADMIN only)

### 1.3 Success Criteria
- Admin can create a school with minimal required information (name only)
- School creation links the admin user to the school atomically
- Attempts to access `/dashboard/admin/*` without a school redirect to onboarding
- Clear error messages for validation and authorization failures

---

## 2. Architecture

### 2.1 System Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User Signs    │────▶│   Proxy.ts       │────▶│   Check User    │
│     In          │     │   (Middleware)   │     │   School ID     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                            │
                              ┌──────────────────┐         │
                              │   Has School?    │─────────┤
                              └──────────────────┘         │
                                    │ No                   │ Yes
                                    ▼                      ▼
                         ┌──────────────────┐    ┌─────────────────┐
                         │   Redirect to    │    │   Allow Access  │
                         │   /onboarding/   │    │   to Dashboard  │
                         │   school         │    │                 │
                         └──────────────────┘    └─────────────────┘
                                    │
                                    ▼
                         ┌──────────────────┐
                         │   React Form     │
                         │   (RHF + Zod)    │
                         └──────────────────┘
                                    │
                                    ▼
                         ┌──────────────────┐
                         │   POST /api/     │
                         │   onboarding/    │
                         │   school         │
                         └──────────────────┘
                                    │
                                    ▼
                         ┌──────────────────┐
                         │   SchoolService  │
                         │   .createSchool  │
                         └──────────────────┘
                                    │
                                    ▼
                         ┌──────────────────┐
                         │   Prisma         │
                         │   Transaction    │
                         │   (Atomic)       │
                         └──────────────────┘
```

### 2.2 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| One school per admin | Simplifies ownership model, prevents abuse |
| Slug auto-generation | Ensures URL-safe, unique identifiers |
| Transactional creation | Guarantees atomic school+user linking |
| Middleware-based guard | Centralized, reusable access control |
| Minimal required fields | Lowers barrier to entry, improves UX |

---

## 3. Database Schema (Prisma)

### 3.1 School Model

```prisma
model School {
  id          String       @id @default(uuid())
  name        String
  slug        String       @unique
  address     String?
  phone       String?
  email       String?
  status      SchoolStatus @default(ACTIVE)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  // Relations
  users         User[]
  students      Student[]
  teachers      Teacher[]
  academicYears AcademicYear[]
  classes       Class[]
  // ... other relations

  @@index([slug])
}
```

### 3.2 User Model (Relevant Fields)

```prisma
model User {
  id        String   @id @default(uuid())
  clerkId   String   @unique
  email     String   @unique
  role      Role     // ADMIN, SUPER_ADMIN, TEACHER, STUDENT
  schoolId  String?  // NULL until school created

  // Relations
  school   School?   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
}
```

### 3.3 Key Constraints

| Constraint | Implementation |
|------------|---------------|
| Unique slug | `@unique` on `School.slug` |
| One school per admin | Application-level check in `SchoolService` |
| School ownership | `User.schoolId` foreign key |
| Cascading delete | `onDelete: Cascade` on User-School relation |

---

## 4. API Routes

### 4.1 POST `/api/onboarding/school`

**Purpose**: Create a new school for the authenticated admin user.

#### Request

```typescript
interface CreateSchoolRequest {
  name: string;          // Required, 2-100 chars
  slug?: string;         // Optional, auto-generated if omitted
  email?: string;        // Optional, valid email format
  phone?: string;        // Optional, 5-20 chars
  address?: string;      // Optional, 5-200 chars
}
```

#### Response - Success (201)

```typescript
interface CreateSchoolSuccessResponse {
  success: true;
  school: {
    id: string;
    name: string;
    slug: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    status: 'ACTIVE';
    createdAt: Date;
    updatedAt: Date;
  };
  message: 'School created successfully';
}
```

#### Response - Error (400/401/403/409/500)

```typescript
interface CreateSchoolErrorResponse {
  success: false;
  error: string;
  code: 
    | 'UNAUTHENTICATED' 
    | 'USER_NOT_FOUND' 
    | 'FORBIDDEN' 
    | 'SCHOOL_ALREADY_EXISTS'
    | 'VALIDATION_ERROR'
    | 'CONFLICT'
    | 'INTERNAL_ERROR';
  redirectUrl?: string;      // Present for USER_NOT_FOUND
  existingSchoolId?: string; // Present for SCHOOL_ALREADY_EXISTS
  details?: Record<string, string[]>; // Present for VALIDATION_ERROR
}
```

#### Authorization Requirements

| Check | Status Code | Error Code |
|-------|-------------|------------|
| Authenticated | 401 | `UNAUTHENTICATED` |
| User exists in DB | 404 | `USER_NOT_FOUND` |
| Role is ADMIN/SUPER_ADMIN | 403 | `FORBIDDEN` |
| No existing school | 409 | `SCHOOL_ALREADY_EXISTS` |

### 4.2 GET `/api/user/profile`

**Purpose**: Check current user's school association status.

#### Response

```typescript
interface UserProfileResponse {
  success: true;
  user: {
    id: string;
    role: Role;
    schoolId: string | null;
    email: string;
  };
}
```

---

## 5. Service Layer

### 5.1 SchoolService

**Location**: `/src/services/school.service.ts`

#### Interface

```typescript
export const SchoolService = {
  /**
   * Create a new school and assign the admin user.
   * Uses Prisma transaction for atomicity.
   */
  async createSchool(
    adminUserId: string,
    schoolData: CreateSchoolInput
  ): Promise<School>;

  /**
   * Get school by unique slug.
   */
  async getSchoolBySlug(slug: string): Promise<School>;

  /**
   * Get school by ID.
   */
  async getSchoolById(schoolId: string): Promise<School>;

  /**
   * Check if admin already has a school.
   */
  async adminHasSchool(adminUserId: string): Promise<boolean>;

  /**
   * Generate URL-safe slug from name.
   */
  generateSlug(name: string): string;

  /**
   * Validate and normalize slug.
   */
  validateAndNormalizeSlug(slug: string): string;
};
```

#### CreateSchool Flow

```typescript
async function createSchool(adminUserId, schoolData) {
  // 1. Fetch admin user
  const user = await prisma.user.findUnique({ 
    where: { id: adminUserId } 
  });

  // 2. Validate admin privileges
  if (!isAdmin(user.role)) throw ForbiddenError;
  if (user.schoolId) throw ConflictError('Admin already has school');

  // 3. Generate/validate slug
  const slug = schoolData.slug 
    ? validateAndNormalizeSlug(schoolData.slug)
    : generateSlug(schoolData.name);

  // 4. Ensure slug uniqueness
  const existing = await prisma.school.findUnique({ where: { slug } });
  if (existing) throw ConflictError('Slug already exists');

  // 5. Atomic transaction
  return await prisma.$transaction(async (tx) => {
    // Create school
    const school = await tx.school.create({ data: { ... } });
    
    // Link admin to school
    await tx.user.update({
      where: { id: adminUserId },
      data: { schoolId: school.id }
    });

    return school;
  });
}
```

### 5.2 Domain Types

**Location**: `/src/domain/school/school.types.ts`

```typescript
interface School {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  status: SchoolStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateSchoolInput {
  name: string;
  slug?: string;
  email?: string;
  phone?: string;
  address?: string;
}
```

---

## 6. Middleware / Guard Logic

### 6.1 OnboardingGuard

**Location**: `/src/lib/auth/onboardingGuard.ts`

#### Core Functions

```typescript
/**
 * Check if user needs to complete school onboarding.
 */
async function checkOnboardingStatus(
  userId: string
): Promise<OnboardingCheckResult>;

/**
 * Middleware guard - returns redirect response if onboarding needed.
 */
async function onboardingGuard(
  request: NextRequest,
  userId: string
): Promise<NextResponse | null>;

/**
 * Check if path requires school onboarding.
 */
function pathRequiresOnboarding(pathname: string): boolean;

/**
 * Check if path is part of onboarding (prevent redirect loops).
 */
function isOnboardingPath(pathname: string): boolean;
```

#### Protected Paths

```typescript
const protectedPaths = [
  '/dashboard/admin/classes',
  '/dashboard/admin/students',
  '/dashboard/admin/teachers',
  '/dashboard/admin/academic-years',
  '/dashboard/admin/exams',
  '/dashboard/admin/subjects',
  '/dashboard/admin/settings',
  '/api/admin/classes',
  '/api/admin/students',
  '/api/admin/teachers',
  '/api/admin/academic-years',
];
```

#### Onboarding Paths

```typescript
const onboardingPaths = [
  '/setup',
  '/onboarding/school',
  '/api/onboarding/school',
  '/dashboard/admin/school/new',
];
```

### 6.2 Integration with Proxy (Middleware)

**Location**: `/proxy.ts`

```typescript
export default clerkMiddleware(async (auth, req) => {
  // ... auth checks ...

  // Onboarding guard for admin routes
  if (userId && 
      pathRequiresOnboarding(req.nextUrl.pathname) && 
      !isOnboardingPath(req.nextUrl.pathname)) {
    const redirect = await onboardingGuard(req, userId);
    if (redirect) return redirect;
  }
});
```

### 6.3 Implementation Examples

#### checkOnboardingStatus()

```typescript
export async function checkOnboardingStatus(
  userId: string
): Promise<OnboardingCheckResult> {
  // Fetch user from database to check role and school association
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, role: true, schoolId: true },
  });

  // User not found in database - they need to complete profile setup first
  if (!user) {
    return {
      needsOnboarding: true,
      redirectUrl: '/setup',
      schoolId: null,
    };
  }

  // Only admins need school onboarding
  const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;

  if (!isAdmin) {
    // Non-admin users don't need school onboarding
    return {
      needsOnboarding: false,
      schoolId: user.schoolId,
      role: user.role,
    };
  }

  // Admin without school needs to create one
  if (!user.schoolId) {
    return {
      needsOnboarding: true,
      redirectUrl: '/dashboard/admin/school/new',
      schoolId: null,
      role: user.role,
    };
  }

  // Admin with school - onboarding complete
  return {
    needsOnboarding: false,
    schoolId: user.schoolId,
    role: user.role,
  };
}
```

#### onboardingGuard()

```typescript
export async function onboardingGuard(
  request: NextRequest,
  userId: string
): Promise<NextResponse | null> {
  const check = await checkOnboardingStatus(userId);

  if (check.needsOnboarding && check.redirectUrl) {
    // Prevent redirect loops - don't redirect if already on target page
    const currentPath = request.nextUrl.pathname;
    const targetPath = check.redirectUrl;

    if (currentPath === targetPath || currentPath.startsWith(targetPath)) {
      return null;
    }

    // Create redirect response
    const redirectUrl = new URL(check.redirectUrl, request.url);
    // Preserve original destination for post-onboarding redirect
    if (currentPath !== '/dashboard/admin') {
      redirectUrl.searchParams.set('redirectTo', currentPath);
    }

    return NextResponse.redirect(redirectUrl);
  }

  return null;
}
```

#### pathRequiresOnboarding()

```typescript
export function pathRequiresOnboarding(pathname: string): boolean {
  // These paths require school onboarding for admins
  const protectedPaths = [
    '/dashboard/admin/classes',
    '/dashboard/admin/students',
    '/dashboard/admin/teachers',
    '/dashboard/admin/academic-years',
    '/dashboard/admin/exams',
    '/dashboard/admin/subjects',
    '/dashboard/admin/settings',
    '/api/admin/classes',
    '/api/admin/students',
    '/api/admin/teachers',
    '/api/admin/academic-years',
  ];

  // Check if path matches any protected pattern
  return protectedPaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  );
}
```

#### isOnboardingPath()

```typescript
export function isOnboardingPath(pathname: string): boolean {
  const onboardingPaths = [
    '/setup',
    '/dashboard/admin/school/new',
    '/api/admin/school',
  ];

  return onboardingPaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  );
}
```

---

## 7. Frontend

### 7.1 Onboarding Page

**Location**: `/src/app/onboarding/school/page.tsx`

#### Features

| Feature | Implementation |
|---------|---------------|
| Form handling | React Hook Form |
| Validation | Zod schema |
| Status check | `useEffect` fetching `/api/user/profile` |
| Loading states | `isLoading` flag, spinner UI |
| Error display | Alert banner with error message |
| Auto-redirect | `router.push('/dashboard/admin')` on success |

#### Form Schema

```typescript
const schoolFormSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(5).max(20).optional().or(z.literal('')),
});
```

#### Component Structure

```
SchoolOnboardingPage
├── Loading State (checking profile)
├── Error Alert (if API error)
├── Form (react-hook-form)
│   ├── School Name (required)
│   ├── Email (optional)
│   ├── Phone (optional)
│   └── Submit Button (with loading spinner)
└── Footer Note (one school per account)
```

### 7.2 Styling

- **Framework**: Tailwind CSS
- **Color Scheme**: Purple primary (`#7C3AED`)
- **Layout**: Centered card on light background (`#F8F7FC`)
- **Responsive**: Mobile-first, max-width `md` (448px)

---

## 8. Security Considerations

### 8.1 Authentication & Authorization

| Layer | Protection |
|-------|-----------|
| Middleware | Clerk session validation |
| API Route | Role-based access control (ADMIN/SUPER_ADMIN) |
| Service Layer | User existence and school ownership verification |
| Database | Foreign key constraints and unique indexes |

### 8.2 Input Validation

| Field | Validation |
|-------|-----------|
| `name` | Required, 2-100 chars, trimmed |
| `slug` | Optional, 3-50 chars, regex `[a-z0-9-]+` |
| `email` | Optional, email format |
| `phone` | Optional, 5-20 chars |

### 8.3 Business Rule Enforcement

| Rule | Enforcement Point |
|------|-------------------|
| One school per admin | `SchoolService.createSchool()` check |
| Unique slug | Prisma `@unique` + pre-check |
| URL-safe slugs | `generateSlug()` + `validateAndNormalizeSlug()` |
| Atomic creation | Prisma `$transaction()` |

### 8.4 Error Handling

- No sensitive information in error messages
- Consistent error response format
- Proper HTTP status codes
- Server errors logged, user sees generic message

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Location**: `/__tests__/api/onboarding/school.route.test.ts`

| Test Case | Expected Result |
|-----------|-----------------|
| Happy path - valid data | 201 Created, school returned |
| Happy path - minimal data (name only) | 201 Created |
| Missing authentication | 401 Unauthorized |
| User not in database | 404 Not Found |
| Non-admin role | 403 Forbidden |
| Admin already has school | 409 Conflict |
| Invalid email format | 400 Bad Request |
| Missing required name | 400 Bad Request |
| Invalid slug format | 400 Bad Request |
| Service error handling | 500 Internal Error |

### 9.2 Integration Tests

- End-to-end flow: signup → onboarding → dashboard access
- Database transaction rollback on error
- Middleware redirect behavior

---

## 10. Future Enhancements

| Enhancement | Priority | Notes |
|-------------|----------|-------|
| School logo upload | Medium | S3 integration |
| Multi-school support for SUPER_ADMIN | Low | Business model decision |
| School invite system | Medium | Email invitations |
| School branding customization | Low | Colors, logo, etc. |
| School onboarding wizard | Low | Step-by-step guide |

---

## 11. Related Files Reference

### Core Implementation

| File | Purpose |
|------|---------|
| `/src/app/onboarding/school/page.tsx` | Onboarding UI |
| `/src/app/api/onboarding/school/route.ts` | API endpoint |
| `/src/services/school.service.ts` | Business logic |
| `/src/domain/school/school.types.ts` | Domain types |
| `/src/lib/auth/onboardingGuard.ts` | Middleware guard |
| `/proxy.ts` | Middleware integration |

### Database

| File | Purpose |
|------|---------|
| `/prisma/schema.prisma` | School and User models |

### Tests

| File | Purpose |
|------|---------|
| `/__tests__/api/onboarding/school.route.test.ts` | API route tests |

---

## 12. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-16 | Initial specification |
