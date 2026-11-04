import { useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";

interface UseQrScannerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  onCodeScanned: (code: string) => void;
  scanIntervalMs?: number;
}

export function useQrScanner({
  videoRef,
  enabled,
  onCodeScanned,
  scanIntervalMs = 200,
}: UseQrScannerProps) {
  const isScanningRef = useRef(false);
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Bóc tách mã vé nếu chuỗi QR là một URL hoặc chứa tham số
  const extractTicketCode = useCallback((rawText: string): string => {
    const trimmed = rawText.trim();
    if (!trimmed) return "";

    try {
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        const url = new URL(trimmed);
        const codeParam =
          url.searchParams.get("code") ||
          url.searchParams.get("ticketCode") ||
          url.searchParams.get("data") ||
          url.searchParams.get("ticket");
        if (codeParam) return codeParam.trim();

        // Kiểm tra đường dẫn dạng /tickets/{code}
        const segments = url.pathname.split("/").filter(Boolean);
        if (segments.length > 0) {
          return segments[segments.length - 1];
        }
      }
    } catch {
      // Không phải URL hợp lệ, giữ nguyên chuỗi thô
    }

    return trimmed;
  }, []);

  const scanFrame = useCallback(async () => {
    if (!enabled || isScanningRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    // Chống kích hoạt lặp lại cùng một mã trong vòng 3 giây
    const now = Date.now();
    if (now - lastScannedTimeRef.current < 3000) {
      return;
    }

    isScanningRef.current = true;

    try {
      let detectedText: string | null = null;

      // 1. Thử nghiệm bộ giải mã BarcodeDetector phần cứng gốc của trình duyệt (nếu có hỗ trợ)
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ["qr_code"],
          });
          const barcodes = await barcodeDetector.detect(video);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            detectedText = barcodes[0].rawValue;
          }
        } catch {
          // Trình duyệt không hỗ trợ BarcodeDetector đầy đủ, chuyển sang jsQR
        }
      }

      // 2. Dự phòng giải mã bằng jsQR (100% Offline, chạy trực tiếp trên CPU trình duyệt)
      if (!detectedText) {
        if (!canvasRef.current) {
          canvasRef.current = document.createElement("canvas");
        }
        const canvas = canvasRef.current;
        const width = video.videoWidth;
        const height = video.videoHeight;

        // Giới hạn chiều ngang tối đa 480px để tối ưu hóa CPU cho thiết bị Kiosk
        const targetWidth = Math.min(width, 480);
        const targetHeight = Math.round((height * targetWidth) / width);

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
        }

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });

          if (qrCode && qrCode.data) {
            detectedText = qrCode.data;
          }
        }
      }

      if (detectedText) {
        const parsedCode = extractTicketCode(detectedText);
        if (parsedCode) {
          lastScannedCodeRef.current = parsedCode;
          lastScannedTimeRef.current = Date.now();
          console.log(`📷 [KIOSK QR SCANNER] Nhận diện thành công mã QR: ${parsedCode}`);
          onCodeScanned(parsedCode);
        }
      }
    } catch (err) {
      console.warn("Lỗi khi quét frame QR:", err);
    } finally {
      isScanningRef.current = false;
    }
  }, [enabled, videoRef, extractTicketCode, onCodeScanned]);

  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(() => {
      scanFrame();
    }, scanIntervalMs);

    return () => clearInterval(intervalId);
  }, [enabled, scanFrame, scanIntervalMs]);

  return {
    resetDebounce: () => {
      lastScannedTimeRef.current = 0;
      lastScannedCodeRef.current = null;
    },
  };
}
