import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'vitest-mock-extended';
import { vi } from 'vitest';
import filePrisma from '@/lib/prisma';

// Mocks installieren
vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

export const prismaMock = filePrisma as unknown as DeepMockProxy<PrismaClient>;