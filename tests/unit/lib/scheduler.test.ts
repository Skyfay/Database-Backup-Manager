
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BackupScheduler } from '@/lib/scheduler';
import prisma from '@/lib/prisma';
import cron from 'node-cron';
import { runJob } from '@/lib/runner';
import { systemTaskService, SYSTEM_TASKS } from '@/services/system-task-service';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    default: {
        job: {
            findMany: vi.fn(),
        },
    },
}));

vi.mock('@/lib/runner', () => ({
    runJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/system-task-service', () => ({
    systemTaskService: {
        getTaskConfig: vi.fn(),
        runTask: vi.fn().mockResolvedValue(undefined),
    },
    SYSTEM_TASKS: {
        CLEANUP: 'cleanup',
    }
}));

// Mock node-cron
vi.mock('node-cron', () => ({
    default: {
        validate: vi.fn(),
        schedule: vi.fn(),
    },
}));

describe('BackupScheduler', () => {
    let scheduler: BackupScheduler;

    beforeEach(() => {
        vi.clearAllMocks();
        scheduler = new BackupScheduler();

        // Default mocks
        // @ts-ignore
        cron.validate.mockReturnValue(true);
        // @ts-ignore
        cron.schedule.mockReturnValue({ stop: vi.fn() });
        // @ts-ignore
        prisma.job.findMany.mockResolvedValue([]);
        // @ts-ignore
        systemTaskService.getTaskConfig.mockResolvedValue(null);
    });

    it('should initialize and refresh jobs', async () => {
        await scheduler.init();
        expect(prisma.job.findMany).toHaveBeenCalledWith({ where: { enabled: true } });
        // @ts-ignore
        expect(systemTaskService.getTaskConfig).toHaveBeenCalled();
    });

    it('should schedule enabled jobs with valid cron expressions', async () => {
        const jobs = [
            { id: 'job1', name: 'Job 1', schedule: '0 0 * * *', enabled: true },
            { id: 'job2', name: 'Job 2', schedule: '*/5 * * * *', enabled: true },
        ];
        // @ts-ignore
        prisma.job.findMany.mockResolvedValue(jobs);

        await scheduler.refresh();

        expect(cron.validate).toHaveBeenCalledWith('0 0 * * *');
        expect(cron.validate).toHaveBeenCalledWith('*/5 * * * *');
        expect(cron.schedule).toHaveBeenCalledTimes(2);
        expect(cron.schedule).toHaveBeenCalledWith('0 0 * * *', expect.any(Function));

        // Verify scheduled callback calls runJob
        // Get the callback passed to schedule for the first job
        // @ts-ignore
        const callback = cron.schedule.mock.calls[0][1];
        callback();
        expect(runJob).toHaveBeenCalledWith('job1');
    });

    it('should not schedule job if cron expression is invalid', async () => {
        const jobs = [
            { id: 'job1', name: 'Job 1', schedule: 'invalid-cron', enabled: true },
        ];
        // @ts-ignore
        prisma.job.findMany.mockResolvedValue(jobs);
        // @ts-ignore
        cron.validate.mockImplementation((s: string) => s !== 'invalid-cron');

        await scheduler.refresh();

        expect(cron.schedule).not.toHaveBeenCalled();
    });

    it('should stop existing tasks before refreshing', async () => {
        const jobs = [
            { id: 'job1', name: 'Job 1', schedule: '0 0 * * *', enabled: true },
        ];
        // @ts-ignore
        prisma.job.findMany.mockResolvedValue(jobs);

        const stopMock = vi.fn();
        // @ts-ignore
        cron.schedule.mockReturnValue({ stop: stopMock });

        // First load
        await scheduler.refresh();
        expect(cron.schedule).toHaveBeenCalledTimes(1);

        // Second load
        await scheduler.refresh();

        // Should have stopped the previous task
        expect(stopMock).toHaveBeenCalled();
        // Should have scheduled again
        expect(cron.schedule).toHaveBeenCalledTimes(2);
    });

    it('should schedule system tasks if configured', async () => {
        // @ts-ignore
        systemTaskService.getTaskConfig.mockResolvedValue('0 2 * * *'); // Daily at 2am

        await scheduler.refresh();

        expect(cron.schedule).toHaveBeenCalledWith('0 2 * * *', expect.any(Function));

        // Verify callback executes system task
        // @ts-ignore
        const callback = cron.schedule.mock.lastCall[1];
        callback();
        expect(systemTaskService.runTask).toHaveBeenCalledWith(SYSTEM_TASKS.CLEANUP);
    });

    it('should not update schedule if loading from DB fails', async () => {
        // @ts-ignore
        prisma.job.findMany.mockRejectedValue(new Error('DB connection failed'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await scheduler.refresh();

        expect(cron.schedule).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load jobs'), expect.any(Error));
    });
});
