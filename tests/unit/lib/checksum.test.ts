import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  calculateFileChecksum,
  calculateChecksum,
  verifyFileChecksum,
} from "@/lib/checksum";
import fs from "fs";
import path from "path";
import os from "os";

describe("Checksum Utility", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "checksum-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("calculateChecksum", () => {
    it("should produce consistent hash for same input", () => {
      const data = "Hello, DBackup!";
      const hash1 = calculateChecksum(data);
      const hash2 = calculateChecksum(data);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex chars
    });

    it("should produce different hash for different input", () => {
      const hash1 = calculateChecksum("data-a");
      const hash2 = calculateChecksum("data-b");

      expect(hash1).not.toBe(hash2);
    });

    it("should work with Buffer input", () => {
      const data = Buffer.from("binary data test");
      const hash = calculateChecksum(data);

      expect(hash).toHaveLength(64);
    });

    it("should produce known SHA-256 for empty string", () => {
      const hash = calculateChecksum("");
      // Well-known SHA-256 of empty string
      expect(hash).toBe(
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      );
    });
  });

  describe("calculateFileChecksum", () => {
    it("should calculate correct checksum for a file", async () => {
      const content = "This is a backup file simulation";
      const filePath = path.join(tempDir, "test-backup.sql");
      fs.writeFileSync(filePath, content);

      const fileHash = await calculateFileChecksum(filePath);
      const directHash = calculateChecksum(content);

      expect(fileHash).toBe(directHash);
    });

    it("should handle large files via streaming", async () => {
      // Create a 1MB file
      const filePath = path.join(tempDir, "large-backup.sql");
      const chunk = "A".repeat(1024);
      const fd = fs.openSync(filePath, "w");
      for (let i = 0; i < 1024; i++) {
        fs.writeSync(fd, chunk);
      }
      fs.closeSync(fd);

      const hash = await calculateFileChecksum(filePath);
      expect(hash).toHaveLength(64);
    });

    it("should handle empty files", async () => {
      const filePath = path.join(tempDir, "empty.sql");
      fs.writeFileSync(filePath, "");

      const hash = await calculateFileChecksum(filePath);
      expect(hash).toBe(
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      );
    });

    it("should reject for non-existent file", async () => {
      await expect(
        calculateFileChecksum(path.join(tempDir, "ghost.sql"))
      ).rejects.toThrow();
    });
  });

  describe("verifyFileChecksum", () => {
    it("should return valid=true for matching checksum", async () => {
      const content = "database dump content";
      const filePath = path.join(tempDir, "verified.sql");
      fs.writeFileSync(filePath, content);

      const expected = calculateChecksum(content);
      const result = await verifyFileChecksum(filePath, expected);

      expect(result.valid).toBe(true);
      expect(result.actual).toBe(expected);
      expect(result.expected).toBe(expected);
    });

    it("should return valid=false for mismatched checksum", async () => {
      const filePath = path.join(tempDir, "tampered.sql");
      fs.writeFileSync(filePath, "original content");

      const fakeChecksum = "0".repeat(64);
      const result = await verifyFileChecksum(filePath, fakeChecksum);

      expect(result.valid).toBe(false);
      expect(result.actual).not.toBe(fakeChecksum);
      expect(result.expected).toBe(fakeChecksum);
    });

    it("should detect file modification", async () => {
      const filePath = path.join(tempDir, "modified.sql");
      fs.writeFileSync(filePath, "original data");

      const originalChecksum = await calculateFileChecksum(filePath);

      // Modify the file
      fs.writeFileSync(filePath, "modified data");

      const result = await verifyFileChecksum(filePath, originalChecksum);
      expect(result.valid).toBe(false);
    });

    it("should detect even single byte change", async () => {
      const filePath = path.join(tempDir, "single-byte.sql");
      fs.writeFileSync(filePath, "AAAAAA");

      const originalChecksum = await calculateFileChecksum(filePath);

      // Change one byte
      fs.writeFileSync(filePath, "AAAAAB");

      const result = await verifyFileChecksum(filePath, originalChecksum);
      expect(result.valid).toBe(false);
    });
  });
});
