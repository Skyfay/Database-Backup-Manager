"use client";

import { ColumnDef } from "@tanstack/react-table";
import { AuditLog, User } from "@prisma/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye } from "lucide-react";
import { DateDisplay } from "@/components/utils/date-display";
import { AUDIT_ACTIONS } from "@/lib/core/audit-types";

// Type definition for Audit Log with included User
export type AuditLogWithUser = AuditLog & {
  user: Pick<User, "id" | "name" | "email" | "image"> | null;
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

export const columns: ColumnDef<AuditLogWithUser>[] = [
  {
    accessorKey: "user",
    header: "User",
    cell: ({ row }) => {
      const user = row.original.user;
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.image || undefined} />
            <AvatarFallback>
              {user?.name?.substring(0, 2).toUpperCase() || "??"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user?.name || "System/Deleted"}</span>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => {
      const action = row.getValue("action") as string;
      return (
        <Badge variant={getActionColor(action) as any}>
          {action}
        </Badge>
      );
    },
  },
  {
    accessorKey: "resource",
    header: "Resource",
    cell: ({ row }) => {
      const resource = row.getValue("resource") as string;
      const resourceId = row.original.resourceId;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{resource}</span>
          {resourceId && (
            <span className="text-xs text-muted-foreground font-mono truncate max-w-[100px]" title={resourceId}>
              {resourceId}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "details",
    header: "Details",
    cell: ({ row }) => {
      const details = row.getValue("details") as string | null;
      if (!details) {
        return <span className="text-muted-foreground text-xs">-</span>;
      }
      return (
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
                {JSON.stringify(JSON.parse(details), null, 2)}
              </pre>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column: _column }) => <div className="text-right">Date</div>,
    cell: ({ row }) => {
      return (
        <div className="text-right">
            <DateDisplay date={row.getValue("createdAt")} />
        </div>
      )
    },
  },
];
