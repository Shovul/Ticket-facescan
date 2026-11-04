import React from "react";

interface KioskDemoBarProps {
  isProcessing: boolean;
  isOnline: boolean;
  isContinuousScan: boolean;
  onCaptureFace: () => void;
  onToggleContinuousScan: () => void;
  onToggleOnline: () => void;
}

export const KioskDemoBar: React.FC<KioskDemoBarProps> = ({
  isProcessing,
  isOnline,
  isContinuousScan,
  onCaptureFace,
  onToggleContinuousScan,
  onToggleOnline,
}) => {
  return (
    <div className="sim-demo-bar">
      <span className="sim-demo-label">Điều khiển Trạm Soát Vé:</span>

      {/* Nút Bật/Tắt Quét Mặt Liên Tục */}
      <button
        type="button"
        onClick={onToggleContinuousScan}
        className="sim-btn-kiosk"
        style={{
          background: isContinuousScan ? "rgba(34, 197, 94, 0.25)" : "#043852",
          color: isContinuousScan ? "#22C55E" : "var(--text-muted)",
          borderColor: isContinuousScan ? "#22C55E" : "var(--border-color)",
          fontWeight: 700,
        }}
      >
        {isContinuousScan ? "● Quét Mặt Liên Tục: BẬT" : "○ Quét Mặt Liên Tục: TẮT"}
      </button>

      {/* Nút Chụp & Quét Mặt Ngay */}
      <button
        type="button"
        onClick={onCaptureFace}
        disabled={isProcessing}
        className="sim-btn-kiosk"
        style={{
          background: "var(--color-teal)",
          color: "#fff",
          opacity: isProcessing ? 0.6 : 1,
        }}
      >
        {isProcessing ? "Đang quét..." : "Chụp & Quét Mặt Ngay"}
      </button>

      {/* Nút Bật/Tắt Giả lập Ngoại Tuyến */}
      <button
        type="button"
        onClick={onToggleOnline}
        className="sim-btn-kiosk"
        style={{
          background: isOnline ? "#043852" : "var(--color-yellow)",
          color: isOnline ? "#fff" : "#011420",
          fontWeight: isOnline ? 600 : 800,
        }}
      >
        {isOnline ? "Thử Nghiệm Mất Mạng (Offline Failover)" : "Kết Nối Lại Mạng (Sync Dữ Liệu)"}
      </button>
    </div>
  );
};
