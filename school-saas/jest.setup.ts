import '@testing-library/jest-dom';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    $transaction: jest.fn((callback) => callback(prisma)),
    student: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    enrollment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    invoice: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    academicYear: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    class: {
      findFirst: jest.fn(),
    },
    term: {
      findFirst: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    teacher: {
      findFirst: jest.fn(),
    },
  },
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
