export const PERMISSIONS = {
  USERS: {
    READ: "users:read",
    WRITE: "users:write",
  },
  GROUPS: {
    READ: "groups:read",
    WRITE: "groups:write",
  },
  BACKUPS: {
    READ: "backups:read",
    WRITE: "backups:write",
    EXECUTE: "backups:execute",
  },
  SETTINGS: {
    READ: "settings:read",
    WRITE: "settings:write",
  },
} as const;

export type Permission =
  | typeof PERMISSIONS.USERS.READ
  | typeof PERMISSIONS.USERS.WRITE
  | typeof PERMISSIONS.GROUPS.READ
  | typeof PERMISSIONS.GROUPS.WRITE
  | typeof PERMISSIONS.BACKUPS.READ
  | typeof PERMISSIONS.BACKUPS.WRITE
  | typeof PERMISSIONS.BACKUPS.EXECUTE
  | typeof PERMISSIONS.SETTINGS.READ
  | typeof PERMISSIONS.SETTINGS.WRITE;

export const AVAILABLE_PERMISSIONS = [
  { id: PERMISSIONS.USERS.READ, label: "View Users", category: "Users" },
  { id: PERMISSIONS.USERS.WRITE, label: "Manage Users", category: "Users" },
  { id: PERMISSIONS.GROUPS.READ, label: "View Groups", category: "Groups" },
  { id: PERMISSIONS.GROUPS.WRITE, label: "Manage Groups", category: "Groups" },
  { id: PERMISSIONS.BACKUPS.READ, label: "View Jobs & Backups", category: "Backups" },
  { id: PERMISSIONS.BACKUPS.WRITE, label: "Manage Jobs", category: "Backups" },
  { id: PERMISSIONS.BACKUPS.EXECUTE, label: "Execute Backups", category: "Backups" },
  { id: PERMISSIONS.SETTINGS.READ, label: "View Settings", category: "Settings" },
  { id: PERMISSIONS.SETTINGS.WRITE, label: "Manage Settings", category: "Settings" },
];
