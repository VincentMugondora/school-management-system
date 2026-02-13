import '@testing-library/jest-dom';

// Mock Prisma with simple structure
const mockPrisma: any = {};

mockPrisma.$transaction = jest.fn((callback: any) => callback(mockPrisma));
mockPrisma.student = {
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};
mockPrisma.enrollment = {
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
};
mockPrisma.invoice = {
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};
mockPrisma.payment = {
  create: jest.fn(),
  findMany: jest.fn(),
};
mockPrisma.academicYear = {
  findFirst: jest.fn(),
  findMany: jest.fn(),
};
mockPrisma.class = {
  findFirst: jest.fn(),
};
mockPrisma.term = {
  findFirst: jest.fn(),
};
mockPrisma.user = {
  findFirst: jest.fn(),
};
mockPrisma.teacher = {
  findFirst: jest.fn(),
};

jest.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
