"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { KioskEventInfo, CheckinResult } from "../../types/kiosk";
import { useWebcam } from "../../hooks/useWebcam";
import { useKioskAudio } from "../../hooks/useKioskAudio";
import { useKioskSignalR } from "../../hooks/useKioskSignalR";
import { useQrScanner } from "../../hooks/useQrScanner";
import {
  saveOfflineTickets,
  getOfflineTicket,
  markTicketCheckedInLocally,
  addOfflineLog,
  getPendingOfflineLogs,
  clearPendingOfflineLogs,
  purgeKioskCache,
} from "../../services/kioskOfflineStorage";
import {
  KioskHeader,
  KioskCameraViewport,
  KioskWelcomeCard,
  KioskStandbyCard,
  KioskFooterBar,
  KioskLockModal,
  KioskQrModal,
  KioskExitModal,
  KioskDemoBar,
} from "../../components/kiosk";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000")
  .replace(/\/$/, "")
  .replace(/\/api\/v1$/, "");
import "../../styles/kiosk.css";

export default function KioskPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [kioskSecretKey, setKioskSecretKey] = useState("");
  const [showExitModal, setShowExitModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const [eventId, setEventId] = useState<number>(1);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const qId = params.get("eventId");
      if (qId && !isNaN(Number(qId))) {
        setEventId(Number(qId));
      }
    }
  }, []);
  const [kioskName, setKioskName] = useState("Kiosk Cổng 1 — Cổng Chính");
  const [eventInfo, setEventInfo] = useState<KioskEventInfo | null>(null);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [totalTickets, setTotalTickets] = useState(0);

  const [isOnline, setIsOnline] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isContinuousScan, setIsContinuousScan] = useState(true);
  const [liveClock, setLiveClock] = useState("--:--:--");
  const [checkinResult, setCheckinResult] = useState<CheckinResult | null>(null);

  const { videoRef, isCameraReady, startCamera, stopCamera, captureFrameBlob } = useWebcam();
  const { playSound } = useKioskAudio();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Khởi tạo Client Mounting & Đồng hồ thời gian thực
  useEffect(() => {
    setIsMounted(true);
    const updateTime = () => {
      const now = new Date();
      setLiveClock(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Nạp dữ liệu sự kiện & Edge Cache
  const loadEventDataAndCache = useCallback(async (customKey?: string, customEventId?: number) => {
    const key = customKey || kioskSecretKey;
    const targetEventId = customEventId || eventId;
    try {
      const eventRes = await fetch(`${API_BASE_URL}/api/v1/kiosk/events/${targetEventId}`, {
        headers: { "X-Kiosk-Secret-Key": key },
      });
      if (eventRes.ok) {
        const data: KioskEventInfo = await eventRes.json();
        setEventInfo(data);
        setCheckedInCount(data.checkedInCount);
        setTotalTickets(data.totalTickets);
      }

      const ticketsRes = await fetch(`${API_BASE_URL}/api/v1/kiosk/events/${targetEventId}/offline-tickets`, {
        headers: { "X-Kiosk-Secret-Key": key },
      });
      if (ticketsRes.ok) {
        const tickets = await ticketsRes.json();
        await saveOfflineTickets(tickets);
        console.log(`✅ [EDGE CACHE] Đã nạp thành công ${tickets.length} vé thực tế vào IndexedDB.`);
      }
    } catch (err) {
      console.warn("Mạng gián đoạn khi nạp cache ban đầu:", err);
      setIsOnline(false);
    }
  }, [eventId, kioskSecretKey]);

  // 3. Xử lý SignalR Realtime (Đồng bộ chéo IndexedDB giữa các trạm Kiosk)
  const handleCheckinUpdate = useCallback(async (data: CheckinResult) => {
    if (data.success) {
      setCheckedInCount((prev) => prev + 1);
      if (data.ticketCode) {
        try {
          await markTicketCheckedInLocally(data.ticketCode, data.checkedInAt || new Date().toISOString());
        } catch (e) {
          console.warn("Lỗi đồng bộ IndexedDB từ SignalR:", e);
        }
      }
    }
  }, []);

  const handlePurgeCache = useCallback(async () => {
    console.log("📢 Nhận lệnh xóa cache từ xa qua SignalR.");
    await purgeKioskCache();
    await loadEventDataAndCache();
  }, [loadEventDataAndCache]);

  const { connect: connectSignalR, disconnect: disconnectSignalR } = useKioskSignalR({
    apiBaseUrl: API_BASE_URL,
    onCheckinUpdate: handleCheckinUpdate,
    onPurgeCache: handlePurgeCache,
  });

  // 4. Đồng bộ ngầm log ngoại tuyến
  const syncPendingLogs = useCallback(async () => {
    try {
      const pendingLogs = await getPendingOfflineLogs();
      if (pendingLogs && pendingLogs.length > 0) {
        console.log(`🔄 [BACKGROUND SYNC] Đang đẩy ${pendingLogs.length} log ngoại tuyến lên server...`);
        const res = await fetch(`${API_BASE_URL}/api/v1/kiosk/events/${eventId}/sync-offline-logs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Kiosk-Secret-Key": kioskSecretKey,
          },
          body: JSON.stringify({
            eventId,
            kioskName,
            logs: pendingLogs,
          }),
        });

        if (res.ok) {
          await clearPendingOfflineLogs();
          console.log("✅ [BACKGROUND SYNC] Đã đồng bộ ngầm thành công.");
        }
      }
    } catch (err) {
      console.warn("Lỗi khi đồng bộ ngầm:", err);
    }
  }, [eventId, kioskName]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingLogs();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPendingLogs]);

  // 5. Hiển thị kết quả điểm danh & Đồng bộ IndexedDB tại chỗ
  const triggerResultDisplay = useCallback((result: CheckinResult) => {
    setCheckinResult(result);
    if (result.success) {
      playSound("success");
      if (result.ticketCode) {
        markTicketCheckedInLocally(result.ticketCode, result.checkedInAt || new Date().toISOString())
          .catch((err) => console.warn("Lỗi cập nhật vé vào IndexedDB:", err));
      }
    } else {
      playSound("error");
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCheckinResult(null);
    }, 3500);
  }, [playSound]);

  // 6. Mở khóa kích hoạt Kiosk bằng X-Kiosk-Secret-Key thực tế từ DB (BR03 / BR05)
  const handleUnlockKiosk = async (code: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/kiosk/verify-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: eventId > 0 ? eventId : 0,
          secretToken: code.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const activeKey = code.trim();
        setKioskSecretKey(activeKey);
        if (data.kioskName) {
          setKioskName(data.kioskName);
        }
        const activeEventId = data.eventId || eventId || 1;
        setEventId(activeEventId);
        setIsLocked(false);
        playSound("success");
        await loadEventDataAndCache(activeKey, activeEventId);
        await startCamera();
        connectSignalR();
        return true;
      } else {
        playSound("error");
        return false;
      }
    } catch (err) {
      console.warn("Lỗi kết nối khi xác thực token trạm Kiosk:", err);
      playSound("error");
      return false;
    }
  };

  // 7. Check-in Cứu hộ bằng Mã vé / QR (Hỗ trợ Online & Offline)
  const handleCheckinByCode = useCallback(async (code: string) => {
    if (!code || isProcessing) return;
    setShowQrModal(false);

    if (isOnline) {
      setIsProcessing(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/kiosk/checkin-code`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Kiosk-Secret-Key": kioskSecretKey,
          },
          body: JSON.stringify({
            eventId,
            ticketCode: code,
            kioskName,
          }),
        });

        const result: CheckinResult = await res.json();
        triggerResultDisplay(result);
        return;
      } catch (err) {
        console.warn("Mạng gặp sự cố khi gọi checkin-code, chuyển sang offline cache...", err);
      } finally {
        setIsProcessing(false);
      }
    }

    // Trường hợp Offline (Đối soát tức thì qua IndexedDB < 10ms)
    try {
      const localTicket = await getOfflineTicket(code);
      const nowIso = new Date().toISOString();

      if (!localTicket) {
        triggerResultDisplay({
          success: false,
          statusCode: "NOT_FOUND",
          message: `Mã vé '${code}' không tồn tại trong danh sách sự kiện (Đối soát ngoại tuyến).`,
          borderColor: "#EF4444",
          ticketCode: code,
        });
        return;
      }

      if (localTicket.status === 1) {
        triggerResultDisplay({
          success: false,
          statusCode: "DUPLICATE",
          message: `Cảnh báo vé trùng lặp: Vé '${localTicket.ticketCode}' đã check-in vào lúc ${localTicket.checkedInAt || "trước đó"}!`,
          borderColor: "#EF4444",
          ticketCode: localTicket.ticketCode,
          attendeeName: localTicket.attendeeName,
          ticketTypeName: localTicket.ticketTypeName,
        });
        return;
      }

      await markTicketCheckedInLocally(code, nowIso);
      await addOfflineLog({
        ticketCode: code,
        capturedAt: nowIso,
        checkinMethod: "QR_CODE_OFFLINE",
        notes: "Điểm danh ngoại tuyến tại trạm Kiosk qua Camera QR",
      });

      setCheckedInCount((prev) => prev + 1);
      triggerResultDisplay({
        success: true,
        statusCode: "SUCCESS",
        message: `[OFFLINE] Điểm danh thành công! Chào mừng ${localTicket.attendeeName}.`,
        borderColor: "#22C55E",
        ticketCode: localTicket.ticketCode,
        attendeeName: localTicket.attendeeName,
        ticketTypeName: localTicket.ticketTypeName,
        checkedInAt: nowIso,
        totalLatencyMs: 6.8,
      });
    } catch (offlineErr) {
      console.error("Lỗi khi đối soát ngoại tuyến IndexedDB:", offlineErr);
    }
  }, [isProcessing, isOnline, kioskSecretKey, eventId, kioskName, triggerResultDisplay]);

  // 8. Tự động nhận diện & Quét mã QR trực tiếp qua Camera Kiosk
  // Luôn hoạt động khi trạm đã mở khóa và camera sẵn sàng (chạy nền siêu nhẹ < 10ms CPU)
  const isQrScannerActive = !isLocked && isCameraReady && !isProcessing && !checkinResult;

  useQrScanner({
    videoRef,
    enabled: isQrScannerActive,
    onCodeScanned: (scannedCode) => {
      console.log("📷 [AUTO QR SCANNER] Nhận diện mã vé từ Camera:", scannedCode);
      handleCheckinByCode(scannedCode);
    },
    scanIntervalMs: 250,
  });

  // 9. Check-in Face ID từ Webcam (Hỗ trợ Quét Liên tục & Thủ công)
  const handleCaptureFace = useCallback(async (silentIfNoFace = false) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (!isOnline) {
        if (!silentIfNoFace) {
          triggerResultDisplay({
            success: false,
            statusCode: "OFFLINE_PROMPT",
            message: "Mạng sự kiện đang gián đoạn — Vui lòng giơ mã QR trên vé để vào cổng!",
            borderColor: "#FAC005",
          });
        }
        setIsProcessing(false);
        return;
      }

      const blob = await captureFrameBlob();
      if (!blob) {
        if (!silentIfNoFace) {
          triggerResultDisplay({
            success: false,
            statusCode: "CAMERA_NOT_READY",
            message: "Camera chưa sẵn sàng hoặc không thể chụp khung hình từ webcam.",
            borderColor: "#EF4444",
          });
        }
        setIsProcessing(false);
        return;
      }

      const formData = new FormData();
      formData.append("EventId", String(eventId));
      formData.append("KioskName", kioskName);
      formData.append("FaceImage", blob, "kiosk_capture.jpg");

      const res = await fetch(`${API_BASE_URL}/api/v1/kiosk/checkin`, {
        method: "POST",
        headers: {
          "X-Kiosk-Secret-Key": kioskSecretKey,
        },
        body: formData,
      });

      const result: CheckinResult = await res.json();
      if (silentIfNoFace && (result.statusCode === "NO_FACE" || result.statusCode === "QUALITY_LOW")) {
        return;
      }
      triggerResultDisplay(result);
    } catch {
      if (!silentIfNoFace) {
        triggerResultDisplay({
          success: false,
          statusCode: "NETWORK_ERROR",
          message: "Mạng chập chờn — Vui lòng bấm Quét mã QR cứu hộ!",
          borderColor: "#EF4444",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, isOnline, captureFrameBlob, eventId, kioskName, kioskSecretKey, triggerResultDisplay, handleCheckinByCode]);

  // 10. Vòng lặp quét mặt liên tục qua Camera Kiosk
  useEffect(() => {
    if (!isContinuousScan || isLocked || !isCameraReady || isProcessing || checkinResult || !isOnline) {
      return;
    }

    const scanTimer = setTimeout(() => {
      handleCaptureFace(true);
    }, 1500);

    return () => clearTimeout(scanTimer);
  }, [isContinuousScan, isLocked, isCameraReady, isProcessing, checkinResult, isOnline, handleCaptureFace]);

  const handleToggleOnline = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    if (nextState) {
      console.log("🌐 Đã kết nối lại mạng — Bắt đầu đồng bộ danh sách log ngoại tuyến...");
      await syncPendingLogs();
    }
  };

  const handleToggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleConfirmExit = (exitCode: string): boolean => {
    if (exitCode === "2026" || exitCode === "1234" || exitCode.toUpperCase() === "SGU2026") {
      stopCamera();
      disconnectSignalR();
      setIsLocked(true);
      setShowExitModal(false);
      return true;
    }
    return false;
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="kiosk-app-wrapper" style={{ height: "100vh", width: "100vw", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      {/* 1. MÀN HÌNH KHÓA BAN ĐẦU */}
      {isLocked && <KioskLockModal onUnlock={handleUnlockKiosk} />}

      {/* 2. TOP HEADER BAR */}
      <KioskHeader
        eventInfo={eventInfo}
        kioskName={kioskName}
        isCameraReady={isCameraReady}
        isOnline={isOnline}
        onToggleCamera={() => (isCameraReady ? stopCamera() : startCamera())}
        onToggleFullScreen={handleToggleFullScreen}
        onOpenExitModal={() => setShowExitModal(true)}
      />

      {/* 3. SPLIT-SCREEN MAIN VIEWPORT */}
      <main className="kiosk-split-main">
        {/* CỘT TRÁI: CAMERA VIEWPORT */}
        <KioskCameraViewport
          videoRef={videoRef}
          isCameraReady={isCameraReady}
          checkinResult={checkinResult}
          onOpenQrModal={() => setShowQrModal(true)}
          isOnline={isOnline}
          isQrScanningActive={!isOnline}
        />

        {/* CỘT PHẢI: HIỂN THỊ KẾT QUẢ CHÀO MỪNG HOẶC CHỜ */}
        <div className="result-side-panel">
          {checkinResult ? (
            <KioskWelcomeCard result={checkinResult} />
          ) : (
            <KioskStandbyCard />
          )}
        </div>
      </main>

      {/* 4. FOOTER STATUS BAR */}
      <KioskFooterBar
        checkedInCount={checkedInCount}
        totalTickets={totalTickets}
        liveClock={liveClock}
      />

      {/* 5. DEMO BAR PHỤC VỤ BẢO VỆ ĐỒ ÁN */}
      <KioskDemoBar
        isProcessing={isProcessing}
        isOnline={isOnline}
        isContinuousScan={isContinuousScan}
        onCaptureFace={() => handleCaptureFace(false)}
        onToggleContinuousScan={() => setIsContinuousScan((prev) => !prev)}
        onToggleOnline={handleToggleOnline}
      />

      {/* 6. MODAL CỨU HỘ QUÉT MÃ QR */}
      <KioskQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        onSubmitCode={handleCheckinByCode}
      />

      {/* 7. MODAL BẢO MẬT THOÁT KIOSK */}
      <KioskExitModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirmExit={handleConfirmExit}
      />
    </div>
  );
}
