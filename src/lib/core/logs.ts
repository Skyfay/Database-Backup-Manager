export type LogLevel = "info" | "success" | "warning" | "error";
export type LogType = "general" | "command" | "storage";

export interface LogEntry {
  timestamp: string; // ISO String
  level: LogLevel;
  type: LogType;
  message: string;
  stage?: string; // High-level stage grouping (e.g. "Initialize", "Dump", "Upload")
  details?: string; // For long output like stdout/stderr
  context?: Record<string, any>; // For metadata
  durationMs?: number;
}
