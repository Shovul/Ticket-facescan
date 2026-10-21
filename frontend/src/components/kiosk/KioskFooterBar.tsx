import React from "react";

interface KioskFooterBarProps {
  checkedInCount: number;
  totalTickets: number;
  liveClock: string;
}

export const KioskFooterBar: React.FC<KioskFooterBarProps> = ({
  checkedInCount,
  totalTickets,
  liveClock,
}) => {
  return (
    <footer className="kiosk-footer">
      <div className="footer-tech-meta">
        <div className="footer-tech-tag">
          <span style={{ color: "var(--color-mint)", fontWeight: "bold" }}>Số lượng đã vào:</span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: "#fff",
              background: "#032a3f",
              padding: "2px 8px",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
            }}
          >
            {checkedInCount} / {totalTickets > 0 ? totalTickets : "—"} vé
          </span>
        </div>

        <span style={{ color: "var(--border-color)" }}>|</span>

        <div className="footer-tech-tag" style={{ display: "flex", gap: "8px" }}>
          <span>Mô hình:</span>
          <span style={{ color: "#38bdf8", fontFamily: "'JetBrains Mono', monospace" }}>Facenet512</span>
          <span>+</span>
          <span style={{ color: "var(--color-teal)", fontFamily: "'JetBrains Mono', monospace" }}>pgvector HNSW</span>
          <span>+</span>
          <span style={{ color: "var(--color-green)", fontFamily: "'JetBrains Mono', monospace" }}>MiniFASNet Liveness</span>
        </div>
      </div>

      <div className="footer-clock">{liveClock}</div>
    </footer>
  );
};
