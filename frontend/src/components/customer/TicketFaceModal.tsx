"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Upload, RefreshCw, Check, AlertCircle, X, ShieldCheck, UserCheck } from "lucide-react";
import { customerApi } from "../../services/customerApi";
import { CustomerTicket } from "../../types/customer";
import { useNotification } from "../shared/NotificationProvider";

interface TicketFaceModalProps {
  ticket: CustomerTicket;
  onClose: () => void;
  onSuccess: (updated: { ticketCode: string; hasFaceId: boolean; avatarUrl?: string }) => void;
}

export default function TicketFaceModal({ ticket, onClose, onSuccess }: TicketFaceModalProps) {
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(ticket.attendeeFaceUrl || null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [consent, setConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isUpdate = ticket.hasFaceId;

  useEffect(() => {
    // Tự động bật camera nếu chọn tab camera
    if (activeTab === "camera") {
      void startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  async function startCamera() {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setIsCameraActive(false);
      setCameraError("Không thể mở webcam. Vui lòng cấp quyền truy cập camera trên trình duyệt hoặc chuyển sang tab 'Tải ảnh từ máy'.");
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Lật ảnh ngang để chụp tự nhiên như soi gương
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size < 5 * 1024) {
          notify("Ảnh chụp không đạt chất lượng tối thiểu. Vui lòng chụp lại.", "error");
          return;
        }
        stopCamera();
        setCapturedBlob(blob);
        setSelectedFile(null);
        if (previewUrl && previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previewUrl);
        }
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setErrorMessage(null);
      },
      "image/jpeg",
      0.95
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
    if (!allowedExtensions.includes(ext)) {
      setErrorMessage("Định dạng file không hỗ trợ. Chỉ chấp nhận .jpg, .jpeg, .png, .webp.");
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      setErrorMessage("Dung lượng file vượt quá giới hạn 6MB.");
      return;
    }

    if (file.size < 5 * 1024) {
      setErrorMessage("Dung lượng file quá nhỏ (tối thiểu 5KB).");
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    setCapturedBlob(null);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  function resetCapture() {
    setCapturedBlob(null);
    setSelectedFile(null);
    setPreviewUrl(ticket.attendeeFaceUrl || null);
    setErrorMessage(null);
    if (activeTab === "camera") {
      void startCamera();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = capturedBlob || selectedFile;
    if (!payload) {
      setErrorMessage("Vui lòng chụp ảnh chân dung hoặc chọn ảnh từ thiết bị.");
      return;
    }

    if (!consent) {
      setErrorMessage("Vui lòng xác nhận đồng ý cung cấp ảnh sinh trắc học để vào cổng.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const targetId = ticket.ticketId || ticket.itemId;
      const res = await customerApi.updateTicketFace(targetId, payload, consent);
      
      const newAvatarUrl = (res as any)?.data?.avatarUrl || previewUrl;
      notify(
        isUpdate
          ? "Đã cập nhật khuôn mặt Face ID mới cho thẻ vé thành công!"
          : "Đã bổ sung Face ID cho vé thành công! Bạn có thể dùng làn Face ID khi check-in.",
        "success"
      );
      onSuccess({
        ticketCode: ticket.ticketCode,
        hasFaceId: true,
        avatarUrl: newAvatarUrl || undefined,
      });
      onClose();
    } catch (err: any) {
      console.error("Face update failed:", err);
      const msg = err.message || "Không thể cập nhật Face ID. Vui lòng kiểm tra lại chất lượng ảnh.";
      setErrorMessage(msg);
      notify(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop show">
      <div className="simple-modal-box ticket-face-modal" role="dialog" aria-modal="true" aria-labelledby="face-modal-title">
        <div className="modal-header-line">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <UserCheck size={20} color={isUpdate ? "#0284c7" : "#ea580c"} />
            <h3 id="face-modal-title">
              {isUpdate ? "Cập nhật / Đổi ảnh Face ID mới" : "Bổ sung Face ID cho thẻ vé"}
            </h3>
          </div>
          <button
            type="button"
            className="btn-ticket-sub"
            aria-label="Đóng"
            disabled={isSubmitting}
            onClick={() => {
              stopCamera();
              onClose();
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Thông tin vé vắn tắt */}
        <div className="ticket-modal-banner">
          <div className="ticket-modal-banner-row">
            <span>Sự kiện:</span>
            <strong>{ticket.eventTitle}</strong>
          </div>
          <div className="ticket-modal-banner-row">
            <span>Mã vé:</span>
            <code>{ticket.ticketCode}</code> • <span>{ticket.ticketTypeName}</span>
          </div>
          <div className="ticket-modal-banner-row">
            <span>Người tham dự:</span>
            <strong>{ticket.attendeeName || "Chưa đặt tên"}</strong>
          </div>
        </div>

        {errorMessage && (
          <div className="face-modal-error-alert" role="alert">
            <AlertCircle size={18} className="flex-shrink-0" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Chuyển đổi phương thức: Camera hoặc Tải file */}
        <div className="face-tab-controls">
          <button
            type="button"
            className={`face-tab-btn ${activeTab === "camera" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("camera");
              resetCapture();
            }}
            disabled={isSubmitting}
          >
            <Camera size={15} /> Bật camera chụp trực tiếp
          </button>
          <button
            type="button"
            className={`face-tab-btn ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("upload");
              stopCamera();
            }}
            disabled={isSubmitting}
          >
            <Upload size={15} /> Tải ảnh từ máy tính
          </button>
        </div>

        {/* Khu vực chụp / xem trước ảnh */}
        <div className="face-media-view-box">
          {activeTab === "camera" && (
            <>
              {!capturedBlob ? (
                <div className="camera-live-container">
                  {isCameraActive ? (
                    <div className="camera-viewport">
                      <video ref={videoRef} playsInline muted autoPlay className="camera-video-elem" />
                      <div className="face-oval-guide">
                        <div className="face-oval-inner"></div>
                      </div>
                      <div className="camera-capture-floating">
                        <button
                          type="button"
                          className="btn-capture-shot"
                          onClick={capturePhoto}
                        >
                          <Camera size={18} /> Chụp ảnh
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="camera-error-fallback">
                      <AlertCircle size={32} color="#ea580c" />
                      <p>{cameraError || "Đang khởi động webcam..."}</p>
                      <button
                        type="button"
                        className="btn-ticket-sub"
                        onClick={() => void startCamera()}
                      >
                        <RefreshCw size={14} /> Thử lại
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="captured-preview-box">
                  <img src={previewUrl || ""} alt="Ảnh chụp chân dung" className="face-preview-img" />
                  <div className="preview-overlay-tag">
                    <Check size={14} /> Đã chụp
                  </div>
                  <button
                    type="button"
                    className="btn-retake-shot"
                    onClick={resetCapture}
                    disabled={isSubmitting}
                  >
                    <RefreshCw size={14} /> Chụp lại
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === "upload" && (
            <div className="upload-drop-container">
              {previewUrl && (selectedFile || !ticket.attendeeFaceUrl) ? (
                <div className="captured-preview-box">
                  <img src={previewUrl} alt="Ảnh chân dung đã chọn" className="face-preview-img" />
                  <button
                    type="button"
                    className="btn-retake-shot"
                    onClick={() => {
                      resetCapture();
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    disabled={isSubmitting}
                  >
                    <RefreshCw size={14} /> Chọn ảnh khác
                  </button>
                </div>
              ) : (
                <div
                  className="upload-drop-zone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={36} color="#079fa0" />
                  <p><strong>Nhấp để chọn ảnh chân dung</strong> hoặc kéo thả vào đây</p>
                  <span>Hỗ trợ JPG, PNG, WEBP (tối đa 6MB)</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hướng dẫn tiêu chuẩn ảnh */}
        <div className="face-standards-hint">
          <ShieldCheck size={16} color="#079fa0" className="flex-shrink-0" />
          <p>
            Yêu cầu: Chụp thẳng chính diện, đủ ánh sáng, không đeo kính râm hoặc khẩu trang để Kiosk nhận diện nhanh nhất.
          </p>
        </div>

        {/* Checkbox cam kết */}
        <label className="face-consent-checkbox-label">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={isSubmitting}
          />
          <span>Tôi đồng ý gán ảnh sinh trắc học này cho thẻ vé để đối soát qua cổng Kiosk tự động.</span>
        </label>

        {/* Nút hành động Submit */}
        <div className="modal-actions-footer">
          <button
            type="button"
            className="btn-ticket-sub"
            disabled={isSubmitting}
            onClick={() => {
              stopCamera();
              onClose();
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            className={`btn-face-submit ${isUpdate ? "btn-update" : "btn-supplement"}`}
            disabled={isSubmitting || (!capturedBlob && !selectedFile)}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={16} className="spin-animate" /> Đang kiểm định AI & Lưu...
              </>
            ) : isUpdate ? (
              "Lưu & Cập nhật Face ID mới"
            ) : (
              "Xác nhận & Nạp Face ID"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
