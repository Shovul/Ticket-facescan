import React from "react";
import { CheckinResult } from "../../types/kiosk";

interface KioskWelcomeCardProps {
  result: CheckinResult;
}

export const KioskWelcomeCard: React.FC<KioskWelcomeCardProps> = ({ result }) => {
  return (
    <div className={`welcome-side-card show ${!result.success ? "error" : ""}`}>
      {/* Avatar / Badge */}
      <div className="welcome-avatar-wrap">
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: result.success ? "#064e3b" : "#7f1d1d",
            border: `2px solid ${result.success ? "var(--color-green)" : "var(--color-red)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {result.success ? (
            <svg className="icon" style={{ width: "36px", height: "36px", color: "var(--color-green)" }} viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg className="icon" style={{ width: "36px", height: "36px", color: "var(--color-red)" }} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          )}
        </div>
      </div>

      {/* Status Title */}
      <div
        className="welcome-status-title"
        style={{ color: result.success ? "var(--color-green)" : "var(--color-red)" }}
      >
        {result.success ? "Điểm Danh Thành Công" : "Cảnh Báo Kiểm Soát"}
      </div>

      {/* Guest Name */}
      <h2 className="welcome-guest-name">
        {result.attendeeName || (result.success ? "Khách Mời Sự Kiện" : "Không Hợp Lệ")}
      </h2>

      {/* Meta Pills */}
      <div className="welcome-meta-pill-group">
        {result.ticketCode && <span className="meta-pill tier-vip">{result.ticketCode}</span>}
        {result.ticketTypeName && <span className="meta-pill tier-std">{result.ticketTypeName}</span>}
        {result.totalLatencyMs && (
          <span className="meta-pill">⏱️ {Math.round(result.totalLatencyMs)} ms</span>
        )}
      </div>

      {/* Guide Message */}
      <div
        className="welcome-guide-msg"
        style={{
          borderLeftColor: result.success ? "var(--color-green)" : "var(--color-red)",
        }}
      >
        {result.message}
      </div>

      {/* Thanh đếm ngược tự động reset 3.5s */}
      <div className="welcome-timer-bar">
        <div
          className="welcome-timer-fill"
          style={{
            background: result.success ? "var(--color-green)" : "var(--color-red)",
            animation: "shrinkTimer 3.5s linear forwards",
          }}
        ></div>
      </div>
    </div>
  );
};
