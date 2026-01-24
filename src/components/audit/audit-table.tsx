"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuditLogs } from "@/app/actions/audit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Eye, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { format } from "date-fns";
import { AuditLog, User } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/core/audit-types";
import { toast } from "sonner";
import { DateDisplay } from "@/components/utils/date-display";

// Type definition for Audit Log with included User
type AuditLogWithUser = AuditLog & {
  user: Pick<User, "id" | "name" | "email" | "image"> | null;
};

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function AuditTable() {
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Filters
  const [resourceFilter, setResourceFilter] = useState<string>("ALL");
  const [actionFilter, setActionFilter] = useState<string>("ALL");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAuditLogs(pagination.page, pagination.limit, {
        resource: resourceFilter !== "ALL" ? resourceFilter : undefined,
        action: actionFilter !== "ALL" ? actionFilter : undefined,
      });

      if (result.success && result.data) {
        setLogs(result.data.logs as AuditLogWithUser[]);
        setPagination(result.data.pagination);
      } else {
        toast.error("Failed to load audit logs");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, resourceFilter, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case AUDIT_ACTIONS.CREATE: return "default"; // Black/White
      case AUDIT_ACTIONS.UPDATE: return "secondary"; // Gray
      case AUDIT_ACTIONS.DELETE: return "destructive"; // Red
      case AUDIT_ACTIONS.LOGIN: return "outline";
      case AUDIT_ACTIONS.EXECUTE: return "default";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex gap-2 w-full sm:w-auto">
          <Select
            value={actionFilter}
            onValueChange={(val) => handleFilterChange(setActionFilter, val)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Actions</SelectItem>
              {Object.values(AUDIT_ACTIONS).map((action) => (
                <SelectItem key={action} value={action}>{action}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={resourceFilter}
            onValueChange={(val) => handleFilterChange(setResourceFilter, val)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Resource" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Resources</SelectItem>
              {Object.values(AUDIT_RESOURCES).map((res) => (
                <SelectItem key={res} value={res}>{res}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={() => fetchLogs()} title="Refresh">
             <Search className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
             Page {pagination.page} of {pagination.pages || 1}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={log.user?.image || undefined} />
                        <AvatarFallback>
                          {log.user?.name?.substring(0, 2).toUpperCase() || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{log.user?.name || "System/Deleted"}</span>
                        <span className="text-xs text-muted-foreground">{log.user?.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionColor(log.action) as any}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{log.resource}</span>
                      {log.resourceId && (
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[100px]" title={log.resourceId}>
                          {log.resourceId}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.details ? (
                       <Dialog>
                       <DialogTrigger asChild>
                         <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                           <Eye className="h-4 w-4" />
                         </Button>
                       </DialogTrigger>
                       <DialogContent className="max-w-[600px]">
                         <DialogHeader>
                           <DialogTitle>Log Details</DialogTitle>
                         </DialogHeader>
                         <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                           <pre className="text-xs font-mono whitespace-pre-wrap">
                             {JSON.stringify(JSON.parse(log.details), null, 2)}
                           </pre>
                         </ScrollArea>
                       </DialogContent>
                     </Dialog>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DateDisplay date={log.createdAt} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          disabled={pagination.page <= 1 || loading}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          disabled={pagination.page >= pagination.pages || loading}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
