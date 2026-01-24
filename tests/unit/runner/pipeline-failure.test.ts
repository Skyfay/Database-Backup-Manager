import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as runner from '@/lib/runner';
import prisma from '@/lib/prisma';
// Mock steps
import { stepInitialize } from "@/lib/runner/steps/01-initialize";
import { stepExecuteDump } from "@/lib/runner/steps/02-dump";
import { stepUpload } from "@/lib/runner/steps/03-upload";
import { stepCleanup } from "@/lib/runner/steps/04-completion";

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    default: {
        execution: {
            update: vi.fn(),
            create: vi.fn(),
        }
    }
}));

vi.mock("@/lib/queue-manager", () => ({
    processQueue: vi.fn().mockResolvedValue(undefined)
}));

// Mock steps
vi.mock("@/lib/runner/steps/01-initialize", () => ({ stepInitialize: vi.fn() }));
vi.mock("@/lib/runner/steps/02-dump", () => ({ stepExecuteDump: vi.fn() }));
vi.mock("@/lib/runner/steps/03-upload", () => ({ stepUpload: vi.fn() }));
vi.mock("@/lib/runner/steps/05-retention", () => ({ stepRetention: vi.fn() }));
vi.mock("@/lib/runner/steps/04-completion", () => ({
    stepCleanup: vi.fn(),
    stepFinalize: vi.fn()
}));

describe('Runner Pipeline Resilience', () => {
    const mockExecutionId = 'exec-1';
    const mockJobId = 'job-1';

    beforeEach(() => {
        vi.clearAllMocks();

        // Default prisma mock
        vi.mocked(prisma.execution.update).mockResolvedValue({
            id: mockExecutionId,
            jobId: mockJobId,
            logs: '[]',
            job: { id: mockJobId }
        } as any);

        // Default implementation for initialize to set essential context properties
        vi.mocked(stepInitialize).mockImplementation(async (ctx: any) => {
            ctx.job = { id: mockJobId }; // simulate loading job
            return ctx;
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should execute cleanup even if upload crashes', async () => {
        // Arrange
        const dumpFile = '/tmp/dump-123.sql';

        // 1. Initialize succeeds

        // 2. Dump succeeds and returns context (sets tempFile implicitly or directly modifying object)
        vi.mocked(stepExecuteDump).mockImplementation(async (ctx: any) => {
            ctx.tempFile = dumpFile;
            return ctx;
        });

        // 3. Upload fails
        const uploadError = new Error("S3 Connection Refused");
        vi.mocked(stepUpload).mockRejectedValue(uploadError);

        // Act
        await runner.performExecution(mockExecutionId, mockJobId);

        // Assert
        // 1. Check if DB was updated to Running
        expect(prisma.execution.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: mockExecutionId },
            data: expect.objectContaining({ status: "Running" })
        }));

        // 2. Check if steps were called
        expect(stepInitialize).toHaveBeenCalled();
        expect(stepExecuteDump).toHaveBeenCalled();
        expect(stepUpload).toHaveBeenCalled();

        // 3. CRITICAL: Check if cleanup was called despite error
        expect(stepCleanup).toHaveBeenCalled();

        // 4. Verify context passed to cleanup contained the temp file
        // We capture the arg passed to cleanup
        const cleanupCall = vi.mocked(stepCleanup).mock.calls[0][0];
        expect(cleanupCall).toHaveProperty('tempFile', dumpFile);
        expect(cleanupCall).toHaveProperty('status', 'Failed'); // Should be marked Failed
    });
});
