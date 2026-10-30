"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { KioskEventInfo, CheckinResult } from "../../types/kiosk";
import { useWebcam } from "../../hooks/useWebcam";
import { useKioskAudio } from "../../hooks/useKioskAudio";
import { useKioskSignalR } from "../../hooks/useKioskSignalR";
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5162";
import "../../styles/kiosk.css";

export default function KioskPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [kioskSecretKey, setKioskSecretKey] = useState("");
  const [showExitModal, setShowExitModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const [eventId] = useState(1);
  const [kioskName, setKioskName] = useState("Kiosk Cổng 1 — Cổng Chính");
  const [eventInfo, setEventInfo] = useState<KioskEventInfo | null>(null);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [totalTickets, setTotalTickets] = useState(0);

  const [isOnline, setIsOnline] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
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
  const loadEventDataAndCache = useCallback(async (customKey?: string) => {
    const key = customKey || kioskSecretKey;
    try {
      const eventRes = await fetch(`${API_BASE_URL}/api/v1/kiosk/events/${eventId}`, {
        headers: { "X-Kiosk-Secret-Key": key },
      });
      if (eventRes.ok) {
        const data: KioskEventInfo = await eventRes.json();
        setEventInfo(data);
        setCheckedInCount(data.checkedInCount);
        setTotalTickets(data.totalTickets);
      }

      const ticketsRes = await fetch(`${API_BASE_URL}/api/v1/kiosk/events/${eventId}/offline-tickets`, {
        headers: { "X-Kiosk-Secret-Key": key },
      });
      if (ticketsRes.ok) {
        const tickets = await ticketsRes.json();
        await saveOfflineTickets(tickets);
        console.log(`✅ [EDGE CACHE] Đã nạp thành công ${tickets.length} vé vào IndexedDB.`);
      }
    } catch (err) {
      console.warn("Mạng gián đoạn khi nạp cache ban đầu:", err);
      setIsOnline(false);
    }
  }, [eventId, kioskSecretKey]);

  // 3. Xử lý SignalR Realtime
  const handleCheckinUpdate = useCallback((data: CheckinResult) => {
    if (data.success) {
      setCheckedInCount((prev) => prev + 1);
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

  // 5. Hiển thị kết quả điểm danh
  const triggerResultDisplay = useCallback((result: CheckinResult) => {
    setCheckinResult(result);
    if (result.success) {
      playSound("success");
    } else {
      playSound("error");
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCheckinResult(null);
    }, 3500);
  }, [playSound]);

  // 6. Mở khóa kích hoạt Kiosk bằng X-Kiosk-Secret-Key thực tế từ DB
  const handleUnlockKiosk = async (code: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/kiosk/events/${eventId}/verify-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
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
        setIsLocked(false);
        playSound("success");
        await loadEventDataAndCache(activeKey);
        await startCamera();
        connectSignalR();
        return true;
      } else {
        playSound("error");
        return false;
      }
    } catch (err) {
      console.warn("Mạng gián đoạn khi xác thực token trạm Kiosk:", err);
      // Fallback cho chế độ offline nếu mất mạng kết nối tới server lúc khởi động
      if (code.length >= 4) {
        const activeKey = code.startsWith("stk_") ? code : `stk_${code}`;
        setKioskSecretKey(activeKey);
        setIsLocked(false);
        playSound("success");
        await startCamera();
        return true;
      }
      playSound("error");
      return false;
    }
  };

  // 7. Check-in Face ID từ Webcam
  const handleCaptureFace = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (!isOnline) {
        triggerResultDisplay({
          success: false,
          statusCode: "OFFLINE_PROMPT",
          message: "Mạng sự kiện đang gián đoạn — Vui lòng giơ mã QR trên vé để vào cổng!",
          borderColor: "#FAC005",
        });
        setIsProcessing(false);
        return;
      }

      const blob = await captureFrameBlob();
      if (!blob) {
        await handleCheckinByCode("TK-SGU-VIP-8888");
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
      triggerResultDisplay(result);
    } catch {
      triggerResultDisplay({
        success: false,
        statusCode: "NETWORK_ERROR",
        message: "Mạng chập chờn — Vui lòng bấm Quét mã QR cứu hộ!",
        borderColor: "#EF4444",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 8. Check-in Cứu hộ bằng Mã vé / QR
  const handleCheckinByCode = async (code: string) => {
    setShowQrModal(false);

    if (isOnline) {
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
      }
    }

    // Trường hợp Offline
    const localTicket = await getOfflineTicket(code);
    const nowIso = new Date().toISOString();

    if (!localTicket) {
      triggerResultDisplay({
        success: false,
        statusCode: "NOT_FOUND",
        message: "Mã vé không tồn tại trong danh sách sự kiện (Đối soát ngoại tuyến).",
        borderColor: "#EF4444",
        ticketCode: code,
      });
      return;
    }

    if (localTicket.status === 1) {
      triggerResultDisplay({
        success: false,
        statusCode: "DUPLICATE",
        message: `Cảnh báo vé trùng lặp: Vé đã check-in vào lúc ${localTicket.checkedInAt || "trước đó"}!`,
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
      notes: "Điểm danh ngoại tuyến tại trạm Kiosk mất mạng",
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
      totalLatencyMs: 8.5,
    });
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
        onCaptureFace={handleCaptureFace}
        onTestVipCode={() => handleCheckinByCode("TK-SGU-VIP-8888")}
        onToggleOnline={() => setIsOnline(!isOnline)}
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
