import * as React from "react";
import { formatBytes } from "@/lib/utils";

interface NotificationEmailProps {
  message: string;
  context?: {
    success: boolean;
    adapterName?: string;
    duration?: number;
    size?: number;
    error?: string;
  };
}

export const NotificationEmail: React.FC<NotificationEmailProps> = ({
  message,
  context,
}) => {
  return (
    <div style={{ fontFamily: "sans-serif", lineHeight: "1.5", color: "#333" }}>
      <p style={{ fontSize: "16px" }}>{message}</p>
      {context && (
        <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f5f5f5", borderRadius: "5px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "10px" }}>Details:</h3>
          <ul style={{ paddingLeft: "20px", margin: 0 }}>
            <li style={{ marginBottom: "5px" }}>
              <strong>Status:</strong>{" "}
              <span style={{ color: context.success ? "green" : "red", fontWeight: "bold" }}>
                {context.success ? "Success" : "Failed"}
              </span>
            </li>
            <li style={{ marginBottom: "5px" }}>
              <strong>Adapter:</strong> {context.adapterName || "Unknown"}
            </li>
            <li style={{ marginBottom: "5px" }}>
              <strong>Duration:</strong>{" "}
              {context.duration ? `${context.duration}ms` : "N/A"}
            </li>
            {context.size !== undefined && (
              <li style={{ marginBottom: "5px" }}>
                <strong>Size:</strong> {formatBytes(context.size)}
              </li>
            )}
            {context.error && (
              <li style={{ marginBottom: "5px" }}>
                <strong>Error:</strong> <span style={{ color: "red" }}>{context.error}</span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
