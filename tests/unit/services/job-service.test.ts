import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/lib/testing/prisma-mock';
import { JobService, CreateJobInput } from '@/services/job-service';
import { scheduler } from '@/lib/scheduler';

// Mock the global scheduler singleton to avoid side effects (like starting cron timers)
vi.mock('@/lib/scheduler', () => ({
    scheduler: {
        refresh: vi.fn()
    }
}));

describe('JobService', () => {
    let service: JobService;

    beforeEach(() => {
        service = new JobService();
        vi.clearAllMocks();
    });

    describe('createJob', () => {
        it('should create a job and refresh the scheduler', async () => {
            // Arrange
            const input: CreateJobInput = {
                name: 'Test Job',
                schedule: '0 0 * * *',
                sourceId: 'source-1',
                destinationId: 'dest-1',
                notificationIds: ['notif-1'],
                enabled: true
            };

            const expectedJob = {
                id: 'new-job-id',
                ...input,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Setup Prisma Mock return value
            // prisma.job.create takes { data: ... }
            prismaMock.job.create.mockResolvedValue(expectedJob as any);

            // Act
            const result = await service.createJob(input);

            // Assert
            // 1. Check if Prisma was called with correct data
            expect(prismaMock.job.create).toHaveBeenCalledWith({
                data: {
                    name: input.name,
                    schedule: input.schedule,
                    sourceId: input.sourceId,
                    destinationId: input.destinationId,
                    enabled: input.enabled,
                    encryptionProfileId: null,
                    compression: "NONE",
                    notifications: {
                        connect: [{ id: 'notif-1' }]
                    }
                },
                include: {
                    source: true,
                    destination: true,
                    notifications: true,
                }
            });

            // 2. Check if Scheduler was refreshed
            expect(scheduler.refresh).toHaveBeenCalledTimes(1);

            // 3. Check result
            expect(result).toEqual(expectedJob);
        });
    });

    describe('getJobs', () => {
        it('should return list of jobs ordered by creation date', async () => {
            // Arrange
            const mockJobs = [
                { id: '1', name: 'Job 1' },
                { id: '2', name: 'Job 2' }
            ];
            prismaMock.job.findMany.mockResolvedValue(mockJobs as any);

            // Act
            const result = await service.getJobs();

            // Assert
            expect(prismaMock.job.findMany).toHaveBeenCalledWith({
                include: {
                    source: true,
                    destination: true,
                    notifications: true,
                    encryptionProfile: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                },
                orderBy: { createdAt: 'desc' }
            });
            expect(result).toHaveLength(2);
        });
    });
});
