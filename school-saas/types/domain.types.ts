import { SchoolStatus, Role } from '@prisma/client';

// ============================================
// DOMAIN TYPES
// ============================================

export interface School {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: SchoolStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchoolWithCounts extends School {
  _count: {
    users: number;
    students: number;
    classes: number;
    academicYears: number;
  };
}

// ============================================
// DTOs
// ============================================

export interface CreateSchoolInput {
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface UpdateSchoolInput {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: SchoolStatus;
}

export interface SchoolFilterInput {
  status?: SchoolStatus;
  search?: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface SchoolResponse {
  success: boolean;
  data?: School | School[];
  error?: string;
}

export interface SchoolListResponse {
  success: boolean;
  data?: SchoolWithCounts[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: string;
}

// ============================================
// SERVICE CONTEXT
// ============================================

export interface ServiceContext {
  userId: string;
  schoolId?: string | null;
  role: Role;
}

// ============================================
// ERROR TYPES
// ============================================

export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class NotFoundError extends ServiceError {
  constructor(entity: string, id?: string) {
    super(`${entity}${id ? ` with id ${id}` : ''} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends ServiceError {
  constructor(message: string = 'Access denied') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends ServiceError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}
