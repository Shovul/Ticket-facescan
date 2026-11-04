"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Clock3, RefreshCw, ShieldCheck, Ticket, Upload, UserRound, MapPin, Calendar, Check, AlertCircle } from "lucide-react";
import { customerApi, eventSchedule, eventTime } from "../../../services/customerApi";
import { ClaimTicket } from "../../../types/customer";
import { useNotification } from "../../../components/shared/NotificationProvider";

export default function ClaimPage() {
  const [claim, setClaim] = useState<ClaimTicket | null>(null);
  const [issuedTicket, setIssuedTicket] = useState<ClaimTicket | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [expired, setExpired] = useState(false);

  // Chế độ chụp ảnh / nạp Face ID
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [consent, setConsent] = useState(true);
  const token = useRef("");
  const busy = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const notify = useNotification();

  useEffect(() => {
    token.current = window.location.hash.slice(1);
    if (!token.current) { setError("Liên kết nhận vé không hợp lệ."); return; }
    const controller = new AbortController(); let timer: ReturnType<typeof setInterval> | undefined;
    customerApi.claim(token.current, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setClaim(result);
      const received = performance.now(); const server = Date.parse(result.serverTime);
      const check = () => setExpired(server + performance.now() - received >= Date.parse(result.expiresAt));
      check(); timer = setInterval(check, 1000);
    }).catch(issue => { if (!controller.signal.aborted) setError(issue.message); });
    return () => { controller.abort(); if (timer) clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (claim && !done && activeTab === "camera" && !capturedBlob) {
      void startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [claim, done, activeTab, capturedBlob]);

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
      console.error("Camera error:", err);
      setIsCameraActive(false);
      setCameraError("Không thể mở camera. Vui lòng cấp quyền truy cập camera hoặc chuyển sang tab 'Tải ảnh từ thiết bị'.");
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

    // Lật ngang video để chụp tự nhiên như soi gương
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
      },
      "image/jpeg",
      0.95
    );
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      notify("Vui lòng chọn ảnh định dạng JPG, PNG hoặc WEBP.", "error");
      return;
    }

    if (file.size < 5 * 1024 || file.size > 6 * 1024 * 1024) {
      notify("Dung lượng ảnh phải từ 5 KB đến 6 MB.", "error");
      return;
    }

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
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (activeTab === "camera") {
      void startCamera();
    }
  }

  async function complete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const photo = capturedBlob || selectedFile;
    if (!photo || !consent || busy.current || expired) {
      if (!photo) notify("Vui lòng chụp ảnh chân dung hoặc tải ảnh từ máy tính.", "error");
      return;
    }

    const values = new FormData(event.currentTarget);
    busy.current = true;
    setPending(true);
    setError("");

    try {
      const res = await customerApi.completeClaim(
        token.current,
        {
          name: String(values.get("name")).trim(),
          email: String(values.get("email")).trim(),
          phone: String(values.get("phone")).trim(),
        },
        photo
      );

      setIssuedTicket({
        ...res,
        faceImage: res.faceImage || previewUrl || undefined,
        location: res.location || claim?.location,
        startTime: res.startTime || claim?.startTime,
        endTime: res.endTime || claim?.endTime,
      });
      setDone(true);
      notify("Nhận vé và kích hoạt Face ID thành công! Thẻ vé điện tử đã được khởi tạo.");
      window.history.replaceState(null, "", window.location.pathname);
    } catch (issue) {
      setError((issue as Error).message);
      notify((issue as Error).message, "error");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <main className="storefront-main claim-page">
      <section className="claim-card">
        <div className="claim-card-heading">
          <span className="claim-heading-icon"><Ticket size={23} /></span>
          <div>
            <h1>Nhận vé tham dự sự kiện</h1>
            <p>Hoàn tất thông tin cá nhân và chụp Face ID chính diện để kích hoạt thẻ vé.</p>
          </div>
        </div>

        {done && issuedTicket ? (
          <div>
            <div className="claim-success">
              <CheckCircle2 size={32} />
              <div>
                <h2>NHẬN VÉ & KÍCH HOẠT FACE ID THÀNH CÔNG!</h2>
                <p>Thẻ vé điện tử chính thức đã được cấp. Bạn có thể sử dụng làn nhận diện khuôn mặt Face ID khi đến sự kiện.</p>
              </div>
            </div>

            {/* Thẻ vé điện tử hoàn chỉnh (Digital Pass) */}
            <div className="claim-digital-pass-card">
              <div className="claim-pass-top">
                <strong>EventPass Official Digital Pass</strong>
                <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "800" }}>
                  {issuedTicket.ticketTypeName}
                </span>
              </div>
              <div className="claim-pass-body">
                <h3>{issuedTicket.eventTitle}</h3>
                <div className="claim-pass-meta-row">
                  {issuedTicket.startTime && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Calendar size={14} color="#9fd8c5" />
                      <span>{eventSchedule(issuedTicket.startTime, issuedTicket.endTime)}</span>
                    </div>
                  )}
                  {issuedTicket.location && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <MapPin size={14} color="#9fd8c5" />
                      <span>{issuedTicket.location}</span>
                    </div>
                  )}
                </div>

                <div className="claim-pass-attendee-strip">
                  {issuedTicket.faceImage ? (
                    <img
                      src={issuedTicket.faceImage}
                      alt={issuedTicket.attendeeName || "Face ID"}
                      className="claim-pass-face-avatar"
                    />
                  ) : (
                    <div className="claim-pass-face-avatar" style={{ display: "grid", placeItems: "center" }}>
                      <UserRound size={32} color="#4ade80" />
                    </div>
                  )}
                  <div className="claim-pass-attendee-info">
                    <strong>{issuedTicket.attendeeName || "Người tham dự"}</strong>
                    <span>✓ Đã đăng ký Face ID • Làn Kiosk sẵn sàng</span>
                  </div>
                </div>

                {issuedTicket.qrCodeUrl && (
                  <div className="claim-pass-qr-wrap">
                    <img src={issuedTicket.qrCodeUrl} width={140} height={140} alt="QR Vé điện tử" />
                    <code>{issuedTicket.ticketCode}</code>
                  </div>
                )}

                <p className="claim-pass-footer-tip">
                  Bước vào làn Kiosk nhận diện khuôn mặt khi đến sự kiện. Mã QR dùng để đối soát dự phòng tại quầy hỗ trợ.
                </p>
              </div>
            </div>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
              <Link href="/events" className="btn-proceed-pay">
                Khám phá thêm sự kiện
              </Link>
            </div>
          </div>
        ) : (
          <>
            {error && <div role="alert" className="claim-message error">{error}</div>}
            {!claim && !error && <div role="status" className="claim-message loading">Đang kiểm tra liên kết…</div>}

            {claim && (
              <>
                <section className="claim-event-summary">
                  <span className="claim-ticket-icon"><Ticket size={22} /></span>
                  <div>
                    <span className="claim-event-label">VÉ ĐƯỢC CHUYỂN CHO BẠN</span>
                    <h2>{claim.eventTitle}</h2>
                    <p>{claim.ticketTypeName}</p>
                  </div>
                  <span className="claim-deadline"><Clock3 size={15} />Hạn nhận vé: {eventTime(claim.expiresAt)}</span>
                </section>

                {expired ? (
                  <div role="alert" className="claim-message expired">
                    <Clock3 size={20} />
                    <div>
                      <strong>Liên kết đã hết hạn</strong>
                      <span>Vui lòng liên hệ người đặt vé để nhận liên kết mới.</span>
                    </div>
                  </div>
                ) : (
                  <form className="claim-form" onSubmit={complete}>
                    <fieldset disabled={pending}>
                      <div className="claim-form-title">
                        <UserRound size={19} />
                        <div>
                          <h2>Thông tin người tham dự</h2>
                          <p>Thông tin này sẽ hiển thị trên vé điện tử chính thức của bạn.</p>
                        </div>
                      </div>

                      <div className="attendee-input-grid">
                        <label className="field-label">
                          Họ và tên
                          <input className="att-control" name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Nhập họ và tên đầy đủ" />
                        </label>
                        <label className="field-label">
                          Số điện thoại
                          <input className="att-control" name="phone" type="tel" required pattern="[0-9]{10}" maxLength={10} autoComplete="tel" placeholder="10 chữ số (VD: 0912345678)" />
                        </label>
                        <label className="field-label full-width">
                          Email nhận vé
                          <input className="att-control" name="email" type="email" required maxLength={255} autoComplete="email" placeholder="email@example.com" />
                        </label>
                      </div>

                      {/* Khung chụp ảnh & Trích xuất Face ID người nhận */}
                      <div className="claim-face-section">
                        <div className="claim-form-title">
                          <Camera size={19} />
                          <div>
                            <h2>Chụp ảnh chân dung Face ID</h2>
                            <p>Căn chỉnh khuôn mặt vào khung tròn để nhận diện nhanh qua làn Kiosk sự kiện.</p>
                          </div>
                        </div>

                        {/* Chuyển tab Camera / Upload file */}
                        <div className="claim-tab-controls">
                          <button
                            type="button"
                            className={`claim-tab-btn ${activeTab === "camera" ? "active" : ""}`}
                            onClick={() => {
                              setActiveTab("camera");
                              resetCapture();
                            }}
                            disabled={pending}
                          >
                            <Camera size={15} /> Chụp trực tiếp bằng camera
                          </button>
                          <button
                            type="button"
                            className={`claim-tab-btn ${activeTab === "upload" ? "active" : ""}`}
                            onClick={() => {
                              setActiveTab("upload");
                              stopCamera();
                            }}
                            disabled={pending}
                          >
                            <Upload size={15} /> Tải ảnh từ thiết bị
                          </button>
                        </div>

                        {/* Vùng camera / xem trước */}
                        {!capturedBlob && !selectedFile ? (
                          activeTab === "camera" ? (
                            <div className="claim-camera-viewport">
                              {isCameraActive ? (
                                <>
                                  <video ref={videoRef} playsInline muted autoPlay className="claim-camera-video" />
                                  {/* Khung ngắm tròn */}
                                  <div className="claim-circle-guide">
                                    <div className="claim-circle-inner">
                                      <div className="claim-crosshair"></div>
                                    </div>
                                  </div>
                                  {/* Thanh kiểm tra góc thẳng & ánh sáng */}
                                  <div className="claim-angle-check-bar">
                                    <span className="claim-check-item ok"><Check size={13} /> Nhìn thẳng camera</span>
                                    <span className="claim-check-item ok"><Check size={13} /> Khung ngắm tròn</span>
                                    <span className="claim-check-item ok"><Check size={13} /> Đủ ánh sáng</span>
                                  </div>
                                  {/* Nút chụp ảnh */}
                                  <div className="claim-camera-controls">
                                    <button
                                      type="button"
                                      className="btn-claim-capture"
                                      onClick={capturePhoto}
                                    >
                                      <Camera size={17} /> Chụp ảnh ngay
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div style={{ color: "#fff", textAlign: "center", padding: "20px" }}>
                                  <AlertCircle size={32} color="#ea580c" style={{ margin: "0 auto 8px" }} />
                                  <p style={{ fontSize: "12.5px" }}>{cameraError || "Đang kết nối camera..."}</p>
                                  <button
                                    type="button"
                                    className="btn-ticket-sub"
                                    style={{ marginTop: "10px" }}
                                    onClick={() => void startCamera()}
                                  >
                                    <RefreshCw size={14} /> Thử lại
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              className="upload-drop-zone"
                              style={{ height: "220px" }}
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload size={36} color="#079fa0" />
                              <p><strong>Chọn ảnh chân dung chính diện</strong> từ máy tính/điện thoại</p>
                              <span>Chấp nhận JPG, PNG, WEBP (tối đa 6 MB)</span>
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                style={{ display: "none" }}
                                onChange={handleFileChange}
                              />
                            </div>
                          )
                        ) : (
                          <div className="claim-preview-container">
                            <div className="claim-preview-circle">
                              <img src={previewUrl || ""} alt="Ảnh chân dung đã chụp" className="claim-preview-img" />
                            </div>
                            <div className="claim-preview-status">
                              <CheckCircle2 size={16} /> Khuôn mặt hợp lệ • Đã căn chỉnh góc thẳng
                            </div>
                            <button
                              type="button"
                              className="btn-claim-retake"
                              onClick={resetCapture}
                              disabled={pending}
                            >
                              <RefreshCw size={14} /> Chụp / Chọn ảnh khác
                            </button>
                          </div>
                        )}
                      </div>

                      <label className="face-consent" style={{ marginTop: "4px" }}>
                        <input
                          type="checkbox"
                          required
                          checked={consent}
                          onChange={(event) => setConsent(event.target.checked)}
                        />
                        <span>
                          Tôi đồng ý sử dụng ảnh chân dung để đối soát nhận diện sinh trắc học Face ID khi vào cổng sự kiện. Ảnh gốc được tự động lưu trữ trên Cloud và xóa sau 30 ngày.
                        </span>
                      </label>

                      <button
                        className="btn-confirm-booking-all"
                        disabled={pending || (!capturedBlob && !selectedFile) || !consent}
                        style={{ marginTop: "8px" }}
                      >
                        <ShieldCheck size={18} />
                        {pending ? "Đang trích xuất Face ID & Kích hoạt vé…" : "Xác nhận & Nhận thẻ vé điện tử"}
                      </button>
                    </fieldset>
                  </form>
                )}
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}
