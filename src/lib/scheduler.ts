import cron from "node-cron";
import type { ScheduledTask } from "node-cron";
import prisma from "@/lib/prisma";
import { runJob } from "@/lib/runner";
import { systemTaskService, SYSTEM_TASKS } from "@/services/system-task-service";
import { logger } from "@/lib/logger";
import { wrapError } from "@/lib/errors";

const log = logger.child({ module: "Scheduler" });

export class BackupScheduler {
    private tasks: Map<string, ScheduledTask> = new Map();

    constructor() {
        this.tasks = new Map();
    }

    async init() {
        log.info("Initializing scheduler");
        await this.refresh();
    }

    async refresh() {
        log.info("Refreshing jobs");

        // Stop all existing tasks to avoid duplicates
        this.stopAll();

        try {
            // 1. User Jobs
            const jobs = await prisma.job.findMany({
                where: { enabled: true }
            });

            log.info("Found enabled jobs", { count: jobs.length });

            for (const job of jobs) {
                if (cron.validate(job.schedule)) {
                    log.debug("Scheduling job", { jobName: job.name, jobId: job.id, schedule: job.schedule });

                    const task = cron.schedule(job.schedule, () => {
                        log.debug("Triggering job", { jobName: job.name });
                        runJob(job.id).catch((e) => log.error("Job failed", { jobId: job.id }, wrapError(e)));
                    });

                    this.tasks.set(job.id, task);
                } else {
                    log.error("Invalid cron schedule for job", { jobId: job.id, schedule: job.schedule });
                }
            }

            // 2. System Tasks
            for (const taskId of Object.values(SYSTEM_TASKS)) {
                try {
                    const enabled = await systemTaskService.getTaskEnabled(taskId);
                    if (!enabled) {
                        log.debug("System task disabled", { taskId });
                        continue;
                    }

                    const schedule = await systemTaskService.getTaskConfig(taskId);
                    if (schedule && cron.validate(schedule)) {
                        log.debug("Scheduling system task", { taskId, schedule });
                        const task = cron.schedule(schedule, () => {
                            systemTaskService.runTask(taskId).catch((e) => log.error("System task failed", { taskId }, wrapError(e)));
                        });
                        this.tasks.set(taskId, task);
                    }

                    // Check for Run on Startup
                    const runOnStartup = await systemTaskService.getTaskRunOnStartup(taskId);
                    if (runOnStartup) {
                        log.debug("Scheduling startup run for system task", { taskId, delayMs: 10000 });
                        setTimeout(() => {
                            log.debug("Running startup task", { taskId });
                            systemTaskService.runTask(taskId).catch((e) => log.error("Startup task failed", { taskId }, wrapError(e)));
                        }, 10000);
                    }
                } catch (error) {
                    log.error("Failed to schedule task", { taskId }, wrapError(error));
                }
            }
        } catch (error) {
            log.error("Failed to load jobs from DB", {}, wrapError(error));
        }
    }

    stopAll() {
        this.tasks.forEach(task => task.stop());
        this.tasks.clear();
    }
}

// Singleton pattern to prevent multiple schedulers in dev hot-reload
const globalForScheduler = globalThis as unknown as { scheduler: BackupScheduler };

export const scheduler = globalForScheduler.scheduler || new BackupScheduler();

if (process.env.NODE_ENV !== 'production') globalForScheduler.scheduler = scheduler;
