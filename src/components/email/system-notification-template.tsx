import * as React from "react";

const LOGO_URL = "https://dbackup.app/logo.png";

interface SystemNotificationEmailProps {
  title: string;
  message: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  color?: string;
  success: boolean;
}

export const SystemNotificationEmail: React.FC<SystemNotificationEmailProps> = ({
  title,
  message,
  fields,
  color,
  success,
}) => {
  const statusColor = color || (success ? "#22c55e" : "#ef4444");

  return (
    <div style={{ fontFamily: "sans-serif", lineHeight: "1.6", color: "#1f2937", maxWidth: "600px", margin: "0 auto" }}>
      {/* Header bar */}
      <div
        style={{
          backgroundColor: statusColor,
          padding: "16px 24px",
          borderRadius: "8px 8px 0 0",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_URL}
          alt="DBackup"
          width="28"
          height="28"
          style={{ marginRight: "12px", borderRadius: "4px" }}
        />
        <h1 style={{ margin: 0, color: "#ffffff", fontSize: "20px", fontWeight: 600 }}>
          {title}
        </h1>
      </div>

      {/* Body */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
          padding: "24px",
        }}
      >
        <p style={{ fontSize: "15px", margin: "0 0 20px 0", color: "#374151" }}>
          {message}
        </p>

        {fields && fields.length > 0 && (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              backgroundColor: "#f9fafb",
              borderRadius: "6px",
              overflow: "hidden",
            }}
          >
            <tbody>
              {fields.map((field, idx) => (
                <tr key={idx} style={{ borderBottom: idx < fields.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                  <td
                    style={{
                      padding: "10px 16px",
                      fontWeight: 600,
                      fontSize: "13px",
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      width: "140px",
                      verticalAlign: "top",
                    }}
                  >
                    {field.name}
                  </td>
                  <td
                    style={{
                      padding: "10px 16px",
                      fontSize: "14px",
                      color: "#1f2937",
                    }}
                  >
                    {field.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer */}
        <p
          style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid #e5e7eb",
            fontSize: "12px",
            color: "#9ca3af",
            textAlign: "center" as const,
          }}
        >
          Sent by DBackup
        </p>
      </div>
    </div>
  );
};
