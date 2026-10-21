import React from "react";

interface KioskDemoBarProps {
  isProcessing: boolean;
  isOnline: boolean;
  onCaptureFace: () => void;
  onTestVipCode: () => void;
  onToggleOnline: () => void;
}

export const KioskDemoBar: React.FC<KioskDemoBarProps> = ({
  isProcessing,
  isOnline,
  onCaptureFace,
  onTestVipCode,
  onToggleOnline,
}) => {
  return (
    <div className="sim-demo-bar">
      <span className="sim-demo-label">Demo Bar:</span>

      {/* Nút Test Quét Mặt Thực Tế */}
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
        {isProcessing ? "Đang quét..." : "Quét Mặt Ngay (Cam)"}
      </button>

      {/* Nút Test VIP 8888 */}
      <button
        type="button"
        onClick={onTestVipCode}
        className="sim-btn-kiosk"
      >
        Test Vé VIP 8888
      </button>

      {/* Nút Bật/Tắt Giả lập Offline */}
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
        {isOnline ? "Rút Dây Mạng (Giả Lập)" : "Cắm Mạng Lại (Sync)"}
      </button>
    </div>
  );
};
