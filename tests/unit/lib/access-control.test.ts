import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthContext, checkPermissionWithContext } from "@/lib/access-control";
import { PermissionError, ApiKeyError } from "@/lib/errors";
import { PERMISSIONS, AVAILABLE_PERMISSIONS } from "@/lib/permissions";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// Mock auth
const mockGetSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: (...args: any[]) => mockGetSession(...args),
    },
  },
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

// Mock prisma
const mockPrismaUser = {
  findUnique: vi.fn(),
  count: vi.fn(),
  update: vi.fn(),
};
const mockPrismaGroup = {
  upsert: vi.fn(),
};
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: (...args: any[]) => mockPrismaUser.findUnique(...args),
      count: (...args: any[]) => mockPrismaUser.count(...args),
      update: (...args: any[]) => mockPrismaUser.update(...args),
    },
    group: {
      upsert: (...args: any[]) => mockPrismaGroup.upsert(...args),
    },
  },
}));

// Mock apiKeyService
const mockValidate = vi.fn();
vi.mock("@/services/api-key-service", () => ({
  apiKeyService: {
    validate: (...args: any[]) => mockValidate(...args),
  },
}));

// Import getAuthContext after mocks are defined
const { getAuthContext } = await import("@/lib/access-control");

describe("Access Control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================================
  // getAuthContext()
  // ========================================================================
  describe("getAuthContext", () => {
    it("should return session-based context for authenticated user with group", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "user-1" },
      });
      mockPrismaUser.findUnique.mockResolvedValue({
        id: "user-1",
        group: {
          name: "Operators",
          permissions: '["jobs:read","jobs:execute","history:read"]',
        },
      });

      const headers = new Headers();
      const ctx = await getAuthContext(headers);

      expect(ctx).not.toBeNull();
      expect(ctx!.userId).toBe("user-1");
      expect(ctx!.authMethod).toBe("session");
      expect(ctx!.isSuperAdmin).toBe(false);
      expect(ctx!.permissions).toEqual(["jobs:read", "jobs:execute", "history:read"]);
      expect(ctx!.apiKeyId).toBeUndefined();
    });

    it("should grant all permissions to SuperAdmin session", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "admin-1" },
      });
      mockPrismaUser.findUnique.mockResolvedValue({
        id: "admin-1",
        group: {
          name: "SuperAdmin",
          permissions: "[]", // doesn't matter for SuperAdmin
        },
      });

      const headers = new Headers();
      const ctx = await getAuthContext(headers);

      expect(ctx).not.toBeNull();
      expect(ctx!.isSuperAdmin).toBe(true);
      expect(ctx!.authMethod).toBe("session");
      // SuperAdmin gets all available permissions
      expect(ctx!.permissions.length).toBe(AVAILABLE_PERMISSIONS.length);
    });

    it("should fall back to API key when no session exists", async () => {
      mockGetSession.mockResolvedValue(null);
      mockValidate.mockResolvedValue({
        id: "key-1",
        userId: "user-1",
        permissions: ["jobs:execute", "history:read"],
      });

      const headers = new Headers({
        authorization: "Bearer dbackup_testkey123",
      });
      const ctx = await getAuthContext(headers);

      expect(ctx).not.toBeNull();
      expect(ctx!.userId).toBe("user-1");
      expect(ctx!.authMethod).toBe("apikey");
      expect(ctx!.apiKeyId).toBe("key-1");
      expect(ctx!.isSuperAdmin).toBe(false);
      expect(ctx!.permissions).toEqual(["jobs:execute", "history:read"]);
    });

    it("should never grant SuperAdmin to API key auth", async () => {
      mockGetSession.mockResolvedValue(null);
      mockValidate.mockResolvedValue({
        id: "key-1",
        userId: "admin-1",
        permissions: ["jobs:execute"],
      });

      const headers = new Headers({
        authorization: "Bearer dbackup_superadminkey",
      });
      const ctx = await getAuthContext(headers);

      expect(ctx!.isSuperAdmin).toBe(false);
    });

    it("should return null when no session and no Bearer token", async () => {
      mockGetSession.mockResolvedValue(null);

      const headers = new Headers();
      const ctx = await getAuthContext(headers);

      expect(ctx).toBeNull();
      expect(mockValidate).not.toHaveBeenCalled();
    });

    it("should return null when no session and invalid API key", async () => {
      mockGetSession.mockResolvedValue(null);
      mockValidate.mockResolvedValue(null);

      const headers = new Headers({
        authorization: "Bearer dbackup_invalidkey",
      });
      const ctx = await getAuthContext(headers);

      expect(ctx).toBeNull();
    });

    it("should rethrow ApiKeyError for disabled keys", async () => {
      mockGetSession.mockResolvedValue(null);
      mockValidate.mockRejectedValue(new ApiKeyError("disabled", "API key is disabled"));

      const headers = new Headers({
        authorization: "Bearer dbackup_disabledkey",
      });

      await expect(getAuthContext(headers)).rejects.toThrow(ApiKeyError);
    });

    it("should rethrow ApiKeyError for expired keys", async () => {
      mockGetSession.mockResolvedValue(null);
      mockValidate.mockRejectedValue(new ApiKeyError("expired", "API key has expired"));

      const headers = new Headers({
        authorization: "Bearer dbackup_expiredkey",
      });

      await expect(getAuthContext(headers)).rejects.toThrow(ApiKeyError);
    });

    it("should prefer session over API key when both are present", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "session-user" },
      });
      mockPrismaUser.findUnique.mockResolvedValue({
        id: "session-user",
        group: {
          name: "Editors",
          permissions: '["jobs:read"]',
        },
      });

      // Both session and API key present — session should win
      const headers = new Headers({
        authorization: "Bearer dbackup_somekey",
      });
      const ctx = await getAuthContext(headers);

      expect(ctx!.authMethod).toBe("session");
      expect(ctx!.userId).toBe("session-user");
      // API key validate should NOT be called
      expect(mockValidate).not.toHaveBeenCalled();
    });

    it("should fall back to API key when session check throws", async () => {
      mockGetSession.mockRejectedValue(new Error("Session error"));
      mockValidate.mockResolvedValue({
        id: "key-1",
        userId: "user-1",
        permissions: ["jobs:read"],
      });

      const headers = new Headers({
        authorization: "Bearer dbackup_fallbackkey",
      });
      const ctx = await getAuthContext(headers);

      expect(ctx!.authMethod).toBe("apikey");
    });

    it("should ignore non-Bearer authorization headers", async () => {
      mockGetSession.mockResolvedValue(null);

      const headers = new Headers({
        authorization: "Basic dXNlcjpwYXNz",
      });
      const ctx = await getAuthContext(headers);

      expect(ctx).toBeNull();
      expect(mockValidate).not.toHaveBeenCalled();
    });

    it("should handle empty group permissions gracefully", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "user-1" },
      });
      mockPrismaUser.findUnique.mockResolvedValue({
        id: "user-1",
        group: {
          name: "Empty Group",
          permissions: "invalid-json",
        },
      });

      const headers = new Headers();
      const ctx = await getAuthContext(headers);

      expect(ctx!.permissions).toEqual([]);
    });
  });

  // ========================================================================
  // checkPermissionWithContext()
  // ========================================================================
  describe("checkPermissionWithContext", () => {
    it("should allow access when permission is present", () => {
      const ctx: AuthContext = {
        userId: "user-1",
        permissions: ["jobs:read", "jobs:execute", "history:read"],
        isSuperAdmin: false,
        authMethod: "apikey",
      };

      expect(() => {
        checkPermissionWithContext(ctx, PERMISSIONS.JOBS.EXECUTE);
      }).not.toThrow();
    });

    it("should throw PermissionError when permission is missing", () => {
      const ctx: AuthContext = {
        userId: "user-1",
        permissions: ["jobs:read"],
        isSuperAdmin: false,
        authMethod: "apikey",
      };

      expect(() => {
        checkPermissionWithContext(ctx, PERMISSIONS.JOBS.EXECUTE);
      }).toThrow(PermissionError);
    });

    it("should bypass permission check for SuperAdmin sessions", () => {
      const ctx: AuthContext = {
        userId: "admin-1",
        permissions: [], // empty, but SuperAdmin bypasses
        isSuperAdmin: true,
        authMethod: "session",
      };

      expect(() => {
        checkPermissionWithContext(ctx, PERMISSIONS.SETTINGS.WRITE);
      }).not.toThrow();
    });

    it("should NOT bypass for API key even with isSuperAdmin false", () => {
      const ctx: AuthContext = {
        userId: "user-1",
        permissions: [],
        isSuperAdmin: false,
        authMethod: "apikey",
        apiKeyId: "key-1",
      };

      expect(() => {
        checkPermissionWithContext(ctx, PERMISSIONS.JOBS.READ);
      }).toThrow(PermissionError);
    });

    it("should check exact permission string match", () => {
      const ctx: AuthContext = {
        userId: "user-1",
        permissions: ["jobs:read"],
        isSuperAdmin: false,
        authMethod: "session",
      };

      // jobs:read does NOT grant jobs:write
      expect(() => {
        checkPermissionWithContext(ctx, PERMISSIONS.JOBS.WRITE);
      }).toThrow(PermissionError);
    });
  });
});
