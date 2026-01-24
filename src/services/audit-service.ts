import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface AuditLogFilter {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
}

export class AuditService {
  /**
   * Create a new audit log entry
   */
  async log(
    userId: string | null,
    action: string,
    resource: string,
    details?: Record<string, any>,
    resourceId?: string
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          details: details ? JSON.stringify(details) : undefined,
        },
      });
    } catch (error) {
      // We don't want audit logging to crash the application, but we should log the error
      console.error("Failed to create audit log:", error);
    }
  }

  /**
   * Retrieve paginated audit logs
   */
  async getLogs(filter: AuditLogFilter = {}) {
    const { page = 1, limit = 20, userId, action, resource, startDate, endDate } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resource) where.resource = resource;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // Execute query and count in parallel
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    };
  }

  /**
   * Clean up old audit logs
   */
  async cleanOldLogs(retentionDays: number) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - retentionDays);

    return prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: dateThreshold,
        },
      },
    });
  }
}

export const auditService = new AuditService();
