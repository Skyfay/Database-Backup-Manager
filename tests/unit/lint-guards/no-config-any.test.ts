/**
 * Lint Guard Tests for Type-Safe Adapter Configs
 *
 * These tests enforce that adapter functions use proper typed configs
 * instead of `config: any`. This improves code quality, IDE support,
 * and catches type errors at compile time.
 *
 * Run with: pnpm test tests/unit/lint-guards/no-config-any.test.ts
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ADAPTERS_DIR = path.resolve(__dirname, "../../../src/lib/adapters");

// Files that are allowed to use `config: any` (legacy or special cases)
const ALLOWED_FILES: string[] = [
  // Add files here that are temporarily allowed (during migration)
];

// Patterns to detect untyped config parameters
// Matches: `config: any`, `config:any`, `(config: any)`, `config: any,`
const CONFIG_ANY_PATTERNS = [
  { pattern: /\bconfig\s*:\s*any\b/g, name: "config: any" },
  { pattern: /\busageConfig\s*:\s*any\b/g, name: "usageConfig: any" },
  { pattern: /\bconnConfig\s*:\s*any\b/g, name: "connConfig: any" },
];

interface Violation {
  file: string;
  line: number;
  column: number;
  content: string;
  pattern: string;
}

/**
 * Recursively finds all files matching extensions in a directory
 */
function findFiles(
  dir: string,
  extensions: string[],
  ignore: string[] = []
): string[] {
  const results: string[] = [];

  function walk(currentDir: string) {
    if (!fs.existsSync(currentDir)) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(process.cwd(), fullPath);

      // Check ignore patterns
      const shouldIgnore = ignore.some((pattern) => {
        if (pattern.includes("*")) {
          const regex = new RegExp(
            pattern.replace(/\*/g, ".*").replace(/\//g, "\\/")
          );
          return regex.test(relativePath);
        }
        return relativePath.includes(pattern);
      });

      if (shouldIgnore) continue;

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Checks if a line is inside a comment
 */
function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*")
  );
}

/**
 * Scans a file for config: any violations
 */
function findConfigAnyUsage(filePath: string): Violation[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const violations: Violation[] = [];

  const relativePath = path.relative(process.cwd(), filePath);

  // Skip allowed files
  if (ALLOWED_FILES.some((allowed) => relativePath.includes(allowed))) {
    return [];
  }

  lines.forEach((line, index) => {
    // Skip comment lines
    if (isCommentLine(line)) {
      return;
    }

    CONFIG_ANY_PATTERNS.forEach(({ pattern, name }) => {
      // Reset lastIndex for global regex
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(line)) !== null) {
        violations.push({
          file: relativePath,
          line: index + 1,
          column: match.index + 1,
          content: line.trim(),
          pattern: name,
        });
      }
    });
  });

  return violations;
}

/**
 * Formats violations into a readable report
 */
function formatViolationReport(violations: Violation[]): string {
  const grouped = violations.reduce(
    (acc, v) => {
      if (!acc[v.file]) acc[v.file] = [];
      acc[v.file].push(v);
      return acc;
    },
    {} as Record<string, Violation[]>
  );

  let report = "";
  for (const [file, fileViolations] of Object.entries(grouped)) {
    report += `\n  ${file}:\n`;
    fileViolations.forEach((v) => {
      report += `    L${v.line}:${v.column} ${v.pattern} → ${v.content.substring(0, 80)}${v.content.length > 80 ? "..." : ""}\n`;
    });
  }
  return report;
}

describe("Type-Safe Adapter Configs", () => {
  /**
   * ENFORCED MODE: This test fails if any `config: any` is found.
   * All adapter functions must use typed configs from @/lib/adapters/definitions.
   */
  it("should not use config: any in adapter files (ENFORCED)", () => {
    const files = findFiles(ADAPTERS_DIR, [".ts"], [
      ".test.ts",
      ".spec.ts",
      "node_modules",
      "__mocks__",
    ]);

    const allViolations: Violation[] = [];

    for (const file of files) {
      const violations = findConfigAnyUsage(file);
      allViolations.push(...violations);
    }

    if (allViolations.length > 0) {
      const report = formatViolationReport(allViolations);
      expect.fail(
        `Found ${allViolations.length} config: any violation(s) in adapter files.\n` +
          `Use typed configs from @/lib/adapters/definitions instead.\n` +
          `${report}\n\n` +
          `Available types: MySQLConfig, PostgresConfig, MongoDBConfig, MSSQLConfig, RedisConfig, SQLiteConfig, etc.`
      );
    }
  });

  /**
   * WARNING MODE: Reports violations without failing the test.
   * Use this during migration phases to track progress.
   */
  it.skip("should report config: any usage in adapter files (WARNING)", () => {
    const files = findFiles(ADAPTERS_DIR, [".ts"], [
      ".test.ts",
      ".spec.ts",
      "node_modules",
      "__mocks__",
    ]);

    const allViolations: Violation[] = [];

    for (const file of files) {
      const violations = findConfigAnyUsage(file);
      allViolations.push(...violations);
    }

    if (allViolations.length > 0) {
      const report = formatViolationReport(allViolations);
      console.warn(
        `\n⚠️  Found ${allViolations.length} config: any violation(s) in adapter files.\n` +
          `   These should be replaced with typed configs from @/lib/adapters/definitions.\n` +
          `${report}\n` +
          `   Available types: MySQLConfig, PostgresConfig, MongoDBConfig, MSSQLConfig, RedisConfig, SQLiteConfig, etc.\n`
      );
    }

    // This test passes but logs warnings - remove this line when ready to enforce
    expect(true).toBe(true);
  });
});
