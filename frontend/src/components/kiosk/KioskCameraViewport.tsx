import React from "react";
import { CheckinResult } from "../../types/kiosk";

interface KioskCameraViewportProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isCameraReady: boolean;
  checkinResult: CheckinResult | null;
  onOpenQrModal: () => void;
  isOnline: boolean;
  isQrScanningActive?: boolean;
}

export const KioskCameraViewport: React.FC<KioskCameraViewportProps> = ({
  videoRef,
  isCameraReady,
  checkinResult,
  onOpenQrModal,
  isOnline,
  isQrScanningActive = false,
}) => {
  let boxStateClass = "";
  if (checkinResult) {
    boxStateClass = checkinResult.success ? "success" : "error";
  } else if (!isCameraReady) {
    boxStateClass = "disabled";
  }

  const isRescueMode = !isOnline || isQrScanningActive;

  return (
    <div className="camera-side-panel">
      <div className="viewport-container">
        {/* 4 Góc Định Vị Radar */}
        <div className="scanner-corner corner-tl"></div>
        <div className="scanner-corner corner-tr"></div>
        <div className="scanner-corner corner-bl"></div>
        <div className="scanner-corner corner-br"></div>

        {/* Khung Camera */}
        <div className={`camera-frame-box ${boxStateClass}`}>
          <video ref={videoRef} autoPlay playsInline muted id="webcamVideo" />

          {/* Đường Radar Quét (Online) */}
          {isCameraReady && !checkinResult && !isRescueMode && (
            <div className="radar-scanner-line"></div>
          )}

          {/* Khung Ngắm Quét QR Cứu Hộ (Offline hoặc khi kích hoạt quét QR) */}
          {isCameraReady && !checkinResult && isRescueMode && (
            <div className="qr-scanner-guide-overlay">
              <div className="qr-scan-badge-top">
                <svg className="icon" style={{ width: "14px", height: "14px" }} viewBox="0 0 24 24">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <span>{!isOnline ? "Cứu Hộ Ngoại Tuyến (Offline)" : "Đang Quét Mã QR"}</span>
              </div>

              <div className="qr-target-box">
                <div className="qr-target-corner qr-corner-tl"></div>
                <div className="qr-target-corner qr-corner-tr"></div>
                <div className="qr-target-corner qr-corner-bl"></div>
                <div className="qr-target-corner qr-corner-br"></div>
                <div className="qr-scan-laser-line"></div>
                <span style={{ fontSize: "11px", color: "var(--color-yellow)", fontWeight: 700, textAlign: "center", padding: "0 10px" }}>
                  HƯỚNG MÃ QR VÀO KHUNG NGẮM
                </span>
              </div>
            </div>
          )}

          {/* Màn che khi Camera chưa sẵn sàng */}
          <div className={`camera-offline-overlay ${!isCameraReady ? "show" : ""}`}>
            <svg className="icon" style={{ width: "36px", height: "36px", color: "var(--color-red)" }} viewBox="0 0 24 24">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56" />
            </svg>
            <div>
              <strong style={{ fontSize: "14px", color: "#fff", display: "block" }}>CAMERA CHƯA SẴN SÀNG</strong>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                Thiết bị đang tạm dừng hoặc chưa được cấp quyền
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hướng dẫn dưới Camera */}
      <div className="kiosk-instruction-box">
        <h3 className="instruction-title">
          {checkinResult
            ? checkinResult.message
            : isRescueMode
            ? "Đưa mã QR trên vé vào trước camera"
            : "Vui lòng nhìn thẳng vào camera"}
        </h3>
        <p className="instruction-subtitle">
          {isRescueMode
            ? "Kiosk tự động quét và đối soát ngoại tuyến với IndexedDB (< 10ms)"
            : "Hệ thống tự động so khớp khuôn mặt với vé trong 0.3 giây"}
        </p>

        {/* Nút Cứu hộ Quét QR */}
        <button
          type="button"
          onClick={onOpenQrModal}
          className="sim-btn-kiosk"
          style={{
            marginTop: "12px",
            padding: "8px 16px",
            fontSize: "12px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: isRescueMode ? "#26230b" : "#032a3f",
            color: isRescueMode ? "var(--color-yellow)" : "var(--color-mint)",
            borderColor: isRescueMode ? "var(--color-yellow)" : "var(--border-color)",
          }}
        >
          <svg className="icon" style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span>
            {isRescueMode ? "Nhập mã vé thủ công / Máy quét cầm tay" : "Quét mã QR / Nhập mã vé cứu hộ"}
          </span>
        </button>
      </div>
    </div>
  );
};
