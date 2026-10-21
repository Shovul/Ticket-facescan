import React from "react";
import { KioskEventInfo } from "../../types/kiosk";

interface KioskHeaderProps {
  eventInfo: KioskEventInfo | null;
  kioskName: string;
  isCameraReady: boolean;
  isOnline: boolean;
  onToggleCamera: () => void;
  onToggleFullScreen: () => void;
  onOpenExitModal: () => void;
}

export const KioskHeader: React.FC<KioskHeaderProps> = ({
  eventInfo,
  kioskName,
  isCameraReady,
  isOnline,
  onToggleCamera,
  onToggleFullScreen,
  onOpenExitModal,
}) => {
  return (
    <header className="kiosk-header">
      <div className="kiosk-brand">
        <img
          src="https://upload.wikimedia.org/wikipedia/vi/thumb/2/2e/Dai_hoc_Sai_Gon_logo.png/220px-Dai_hoc_Sai_Gon_logo.png"
          className="kiosk-logo-img"
          alt="Logo SGU"
        />
        <div className="kiosk-event-meta">
          <h1>{eventInfo?.title || "Hội thảo Khoa học & Công nghệ SGU 2026"}</h1>
          <p>
            <svg className="icon" style={{ width: "13px", height: "13px" }} viewBox="0 0 24 24">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{eventInfo?.location || "Hội trường A — Làn vào cổng tự động Face ID"}</span>
          </p>
        </div>
      </div>

      <div className="kiosk-station-badge">
        {/* Badge Camera */}
        <div
          onClick={onToggleCamera}
          className={`live-indicator ${isCameraReady ? "ready" : "not-ready"}`}
          title="Bấm để bật/tắt camera"
        >
          <span className="live-dot"></span>
          <span>{isCameraReady ? "CAMERA SẴN SÀNG" : "CAMERA TẮT"}</span>
        </div>

        {/* Badge Mạng */}
        <div
          className="station-name-tag"
          style={{
            color: isOnline ? "#7dd3fc" : "var(--color-yellow)",
            borderColor: isOnline ? "var(--border-color)" : "var(--color-yellow)",
          }}
        >
          {isOnline ? "CLOUD ONLINE" : "EDGE OFFLINE"}
        </div>

        {/* Badge Trạm */}
        <div className="station-name-tag">{kioskName}</div>

        {/* Nút Toàn màn hình */}
        <button
          type="button"
          onClick={onToggleFullScreen}
          className="btn-kiosk-action"
          title="Toàn màn hình"
        >
          <svg className="icon" viewBox="0 0 24 24">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>

        {/* Nút Thoát Kiosk */}
        <button
          type="button"
          onClick={onOpenExitModal}
          className="btn-kiosk-action"
          title="Thoát Kiosk"
        >
          <svg className="icon" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
};
