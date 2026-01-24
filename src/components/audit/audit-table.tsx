"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuditLogs, getAuditFilterStats } from "@/app/actions/audit";
import { DataTable } from "@/components/ui/data-table";
import { AuditLogWithUser, columns } from "./columns";
import { toast } from "sonner";
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/core/audit-types";
import { ColumnFiltersState, PaginationState } from "@tanstack/react-table";

interface FilterOption {
    value: string;
    count: number;
}

export function AuditTable() {
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Table State
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Stats for facets
  const [totalRows, setTotalRows] = useState(0);
  const [availableActions, setAvailableActions] = useState<FilterOption[]>(
    Object.values(AUDIT_ACTIONS).map(val => ({ value: val, count: 0 }))
  );
  const [availableResources, setAvailableResources] = useState<FilterOption[]>(
    Object.values(AUDIT_RESOURCES).map(val => ({ value: val, count: 0 }))
  );

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      // Extract filters from columnFilters state
      const actionFilter = (columnFilters.find(f => f.id === "action")?.value as string[])?.[0];
      const resourceFilter = (columnFilters.find(f => f.id === "resource")?.value as string[])?.[0];
      const searchQuery = columnFilters.find(f => f.id === "details")?.value as string;

      const filters = {
        resource: resourceFilter,
        action: actionFilter,
        search: searchQuery,
      };

      const [logsResult, statsResult] = await Promise.all([
          getAuditLogs(pagination.pageIndex + 1, pagination.pageSize, filters),
          getAuditFilterStats(filters)
      ]);

      if (logsResult.success && logsResult.data) {
        setLogs(logsResult.data.logs as AuditLogWithUser[]);
        setTotalRows(logsResult.data.pagination.total);
      } else {
        toast.error("Failed to load audit logs: " + (logsResult as any).error);
      }

      if (statsResult.success && statsResult.data) {
          const actionCounts = new Map(statsResult.data.actions.map((a: any) => [a.value, a.count]));
          const resourceCounts = new Map(statsResult.data.resources.map((r: any) => [r.value, r.count]));

          setAvailableActions(Object.values(AUDIT_ACTIONS).map(val => ({
              value: val,
              count: actionCounts.get(val) || 0
          })));

          setAvailableResources(Object.values(AUDIT_RESOURCES).map(val => ({
              value: val,
              count: resourceCounts.get(val) || 0
          })));
      } else {
        console.error("Failed to load filter stats:", (statsResult as any).error);
        // Do not toast for stats failure to avoid spamming, but log it
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, columnFilters]);

  // Debounce the fetch when filters change (React Table updates state immediately)
  useEffect(() => {
    const timer = setTimeout(() => {
        fetchLogs();
    }, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [fetchLogs]);


  const filterableColumns = useMemo(() => [
    {
      id: "action",
      title: "Action",
      options: availableActions.map(a => ({ label: a.value, value: a.value, count: a.count }))
    },
    {
      id: "resource",
      title: "Resource",
      options: availableResources.map(r => ({ label: r.value, value: r.value, count: r.count }))
    }
  ], [availableActions, availableResources]);

  return (
    <div className="space-y-4">
      <div className="rounded-md">
        <DataTable
            columns={columns}
            data={logs}
            searchKey="details" // Using details column for the generic search input

            // Manual Mode Configuration
            manualPagination={true}
            manualFiltering={true}
            manualSorting={false} // Client-side sorting for now

            // State
            pagination={pagination}
            onPaginationChange={setPagination}
            columnFilters={columnFilters}
            onColumnFiltersChange={setColumnFilters}

            // Metadata
            pageCount={Math.ceil(totalRows / pagination.pageSize)}
            rowCount={totalRows}

            // Features
            filterableColumns={filterableColumns}
            onRefresh={fetchLogs}
            isLoading={isLoading}
        />
      </div>
    </div>
  );
}
