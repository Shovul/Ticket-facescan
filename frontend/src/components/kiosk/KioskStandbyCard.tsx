import React from "react";

export const KioskStandbyCard: React.FC = () => {
  return (
    <div className="standby-state-card">
      <div className="standby-radar-icon">
        <svg className="icon" style={{ width: "28px", height: "28px" }} viewBox="0 0 24 24">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <h4 style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>Đang Chờ Người Tham Dự...</h4>
      <p style={{ fontSize: "12.5px", color: "var(--text-muted)", lineHeight: "1.5" }}>
        Khách mời bước vào làn kiểm soát, nhìn thẳng vào camera để hệ thống nhận diện và mở cửa.
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "11px",
          fontFamily: "'JetBrains Mono', monospace",
          color: "var(--color-mint)",
          background: "#031d2b",
          padding: "6px 14px",
          borderRadius: "999px",
          border: "1px solid var(--border-color)",
        }}
      >
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-green)" }}></span>
        <span>HNSW AI ENGINE: SẴN SÀNG</span>
      </div>
    </div>
  );
};
