'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { userApi, UserProfileData } from '../../../services/userApi';
import { useCustomerHeaderKind } from '../../../components/customer/CustomerHeader';
import { useNotification } from '../../../components/shared/NotificationProvider';

export default function ProfilePage() {
  useCustomerHeaderKind('tickets');
  const router = useRouter();
  const notify = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile data
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);

  // Face ID Module state (UC05)
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pendingFaceBlob, setPendingFaceBlob] = useState<Blob | File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [faceUploading, setFaceUploading] = useState(false);
  const [faceMessage, setFaceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Refs for camera stream
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Password fields (Phần của bạn bạn làm)
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // Field validation error messages
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    phone?: string;
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Loading & global error
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Load user profile on mount
  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('accessToken') || localStorage.getItem('access_token')
        : null;

    if (!token) {
      router.push('/login');
      return;
    }

    userApi.getProfile().then((res) => {
      if (res.success && res.data) {
        setProfile(res.data);
        setFullName(res.data.fullName || '');
        setPhone(res.data.phoneNumber || '');
        const hasFace = Boolean(res.data.hasFaceScan || res.data.hasFaceRegistered);
        setIsFaceRegistered(hasFace);
        if (res.data.avatarUrl) {
          setAvatarPreview(res.data.avatarUrl);
        }
      } else {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            setProfile(parsed);
            setFullName(parsed.fullName || '');
          } catch {}
        }
      }
    });

    return () => {
      stopCameraStream();
    };
  }, [router]);

  // Cleanup camera stream
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // -------------------------------------------------------------
  // VALIDATE & XỬ LÝ FACE ID CÁ NHÂN (UC05)
  // -------------------------------------------------------------

  // 1. Khởi động Camera trực tiếp kèm validate quyền & phần cứng
  const handleStartCamera = async () => {
    setFaceMessage(null);
    setCameraError(null);
    setPendingFaceBlob(null);
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
      setPendingPreviewUrl(null);
    }

    // Validate trình duyệt có hỗ trợ MediaDevices không
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Trình duyệt hiện tại không hỗ trợ webcam hoặc trang chưa chạy trên giao thức an toàn (HTTPS / localhost).');
      return;
    }

    setIsCameraActive(true);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Lỗi truy cập camera:', err);
      setIsCameraActive(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Bạn đã từ chối quyền truy cập camera. Vui lòng cho phép quyền Camera trong cài đặt trình duyệt.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('Không tìm thấy thiết bị camera nào được kết nối với máy tính.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Camera đang được sử dụng bởi ứng dụng khác. Vui lòng tắt ứng dụng đó và thử lại.');
      } else {
        setCameraError('Không thể mở camera. Vui lòng thử tải ảnh từ máy tính.');
      }
    }
  };

  // 2. Chụp khung hình từ camera kèm validate độ phân giải
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Validate video đã load xong frame chưa
    if (!video.videoWidth || !video.videoHeight) {
      setFaceMessage({
        type: 'error',
        text: 'Camera chưa sẵn sàng khung hình. Vui lòng đợi 1 giây rồi chụp lại.',
      });
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Lật ảnh gương cho tự nhiên nếu là camera trước
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size < 5 * 1024) {
          setFaceMessage({
            type: 'error',
            text: 'Ảnh chụp không đạt chất lượng tối thiểu. Vui lòng thử chụp lại.',
          });
          return;
        }

        stopCameraStream();
        const previewUrl = URL.createObjectURL(blob);
        setPendingFaceBlob(blob);
        setPendingPreviewUrl(previewUrl);
        setFaceMessage(null);
      },
      'image/jpeg',
      0.95
    );
  };

  // 3. Tải ảnh từ máy tính kèm VALIDATE CHẶT CHẼ TRÊN FRONTEND
  const handleSelectLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input để có thể chọn lại cùng file nếu muốn
    e.target.value = '';

    // Validate 1: Định dạng MIME & Extension
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!validExtensions.includes(ext) || (!file.type.startsWith('image/') && !validMimes.includes(file.type))) {
      setFaceMessage({
        type: 'error',
        text: 'Định dạng tệp không hợp lệ! Hệ thống chỉ chấp nhận ảnh định dạng .jpg, .jpeg, .png, .webp.',
      });
      return;
    }

    // Validate 2: Dung lượng tệp tối đa 10MB
    if (file.size > 10 * 1024 * 1024) {
      setFaceMessage({
        type: 'error',
        text: `Dung lượng tệp (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá mức cho phép (tối đa 10MB).`,
      });
      return;
    }

    // Validate 3: Dung lượng tệp tối thiểu 5KB (loại trừ ảnh rỗng/lỗi)
    if (file.size < 5 * 1024) {
      setFaceMessage({
        type: 'error',
        text: 'Dung lượng tệp quá nhỏ (dưới 5KB) hoặc tệp bị hỏng. Vui lòng chọn ảnh rõ nét hơn.',
      });
      return;
    }

    // Validate 4: Kiểm tra độ phân giải ảnh (tối thiểu 120x120px) trước khi đưa vào preview
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      if (img.width < 120 || img.height < 120) {
        URL.revokeObjectURL(objectUrl);
        setFaceMessage({
          type: 'error',
          text: `Độ phân giải ảnh quá nhỏ (${img.width}x${img.height}px). Yêu cầu tối thiểu 120x120px để AI trích xuất khuôn mặt chuẩn xác.`,
        });
        return;
      }

      stopCameraStream();
      if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl);
      }

      setPendingFaceBlob(file);
      setPendingPreviewUrl(objectUrl);
      setFaceMessage(null);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setFaceMessage({
        type: 'error',
        text: 'Không thể đọc tệp ảnh. Tệp có thể đã bị hỏng hoặc mã hóa không hợp lệ.',
      });
    };

    img.src = objectUrl;
  };

  // 4. Hủy ảnh xem trước / chọn lại
  const handleCancelPending = () => {
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
    }
    setPendingFaceBlob(null);
    setPendingPreviewUrl(null);
    setFaceMessage(null);
  };

  // 5. Xác nhận & Gửi ảnh sang Backend / AI Service (UC05)
  const handleConfirmFaceUpload = async () => {
    if (!pendingFaceBlob) {
      setFaceMessage({
        type: 'error',
        text: 'Vui lòng chụp ảnh từ camera hoặc chọn ảnh từ máy tính trước.',
      });
      return;
    }

    setFaceUploading(true);
    setFaceMessage(null);

    try {
      const fileName = pendingFaceBlob instanceof File ? pendingFaceBlob.name : 'portrait_webcam.jpg';
      const res = await userApi.uploadFaceProfile(pendingFaceBlob, fileName);

      if (res.success) {
        setIsFaceRegistered(true);
        if (res.data?.avatarUrl) {
          setAvatarPreview(res.data.avatarUrl);
        } else if (pendingPreviewUrl) {
          setAvatarPreview(pendingPreviewUrl);
        }
        setPendingFaceBlob(null);
        setPendingPreviewUrl(null);
        setFaceMessage({
          type: 'success',
          text: res.message || 'Đã nạp và kích hoạt Face ID thành công! Dữ liệu sẵn sàng cho cổng check-in Kiosk.',
        });
        notify('Đã đăng ký Face ID thành công!', 'success');
      } else {
        setFaceMessage({
          type: 'error',
          text: res.message || 'Ảnh chưa đạt tiêu chuẩn. Vui lòng đảm bảo ảnh rõ nét, chính diện và đủ ánh sáng.',
        });
      }
    } catch (err: any) {
      setFaceMessage({
        type: 'error',
        text: 'Lỗi trích xuất nhận diện khuôn mặt qua AI Microservice. Vui lòng thử lại.',
      });
    } finally {
      setFaceUploading(false);
    }
  };

  // -------------------------------------------------------------
  // PHẦN BẠN BẠN LÀM: CẬP NHẬT PROFILE & ĐỔI MẬT KHẨU
  // -------------------------------------------------------------

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    const errors: typeof fieldErrors = {};

    if (!fullName.trim()) {
      errors.fullName = 'Vui lòng nhập họ và tên của bạn';
    } else if (fullName.trim().length < 2 || fullName.trim().length > 100) {
      errors.fullName = 'Họ và tên phải có độ dài từ 2 đến 100 ký tự';
    }

    if (phone.trim() && !/^(0[3|5|7|8|9])[0-9]{8}$/.test(phone.trim())) {
      errors.phone = 'Số điện thoại phải gồm 10 chữ số chuẩn định dạng Việt Nam';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await userApi.updateProfile({
        fullName: fullName.trim(),
        phoneNumber: phone.trim(),
      });

      if (res.success) {
        notify('Cập nhật thông tin tài khoản thành công!', 'success');
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const u = JSON.parse(storedUser);
            u.fullName = fullName.trim();
            localStorage.setItem('user', JSON.stringify(u));
            window.dispatchEvent(new Event('auth-state-change'));
          } catch {}
        }
      } else {
        setErrorBanner(res.message || 'Cập nhật thất bại.');
      }
    } catch {
      setErrorBanner('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    const errors: typeof fieldErrors = {};

    if (!currentPassword) {
      errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    }
    if (!newPassword || newPassword.length < 6) {
      errors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      const res = await userApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        notify('Đổi mật khẩu thành công!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordSection(false);
      } else {
        setErrorBanner(res.message || 'Đổi mật khẩu không thành công.');
      }
    } catch {
      setErrorBanner('Lỗi kết nối hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="main-container-single" style={{ maxWidth: '840px', margin: '0 auto', padding: '24px 16px' }}>
      {errorBanner && (
        <div
          className="banner-alert show error"
          style={{
            background: '#fde8e8',
            color: '#b91c1c',
            border: '1px solid #f8b4b4',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 600,
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{errorBanner}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE QUẢN LÝ FACE ID CÁ NHÂN (UC05) */}
      {/* ========================================================================= */}
      <section
        className="form-panel"
        id="faceIdManagementCard"
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: isFaceRegistered ? '2px solid #22c55e' : '1px solid #e2e8f0',
          boxShadow: isFaceRegistered
            ? '0 4px 20px -2px rgba(34, 197, 94, 0.15)'
            : '0 4px 14px rgba(0, 0, 0, 0.05)',
          padding: '24px',
          marginBottom: '24px',
          transition: 'all 0.3s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: isFaceRegistered ? '#dcfce7' : '#e0f2fe',
                color: isFaceRegistered ? '#16a34a' : '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg style={{ width: '22px', height: '22px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <circle cx="12" cy="12" r="3" />
                <path d="M10 9a2 2 0 0 1 4 0" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Quản Lý Face ID
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                Định danh khuôn mặt gốc (512-d embeddings) phục vụ làn nhận diện tự động Kiosk 1 giây
              </p>
            </div>
          </div>

          {/* Trạng thái Face ID kèm viền xanh */}
          <div>
            {isFaceRegistered ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#dcfce7',
                  color: '#15803d',
                  border: '1.5px solid #22c55e',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.2)',
                }}
              >
                <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Đã đăng ký Face ID
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  border: '1.5px solid #fecaca',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Chưa đăng ký Face ID
              </span>
            )}
          </div>
        </div>

        {/* Thông báo kết quả Face ID (thành công / lỗi kiểm tra AI) */}
        {faceMessage && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 600,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: faceMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: faceMessage.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${faceMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            }}
          >
            {faceMessage.type === 'success' ? (
              <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            <span>{faceMessage.text}</span>
          </div>
        )}

        {cameraError && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 600,
              marginBottom: '16px',
              background: '#fff7ed',
              color: '#c2410c',
              border: '1px solid #fed7aa',
            }}
          >
            {cameraError}
          </div>
        )}

        {/* KHUNG NỘI DUNG CHÍNH CỦA MODULE FACE ID */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
          {/* CỘT 1: AVATAR / KHUNG PREVIEW HOẶC WEBCAM */}
          <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                position: 'relative',
                width: '150px',
                height: '150px',
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#f8fafc',
                border: isFaceRegistered ? '3.5px solid #22c55e' : '2px dashed #cbd5e1',
                boxShadow: isFaceRegistered ? '0 0 0 4px rgba(34, 197, 94, 0.18)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
            >
              {pendingPreviewUrl ? (
                <img
                  src={pendingPreviewUrl}
                  alt="Ảnh chân dung vừa chụp/tải"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Ảnh Face ID hiện tại"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '12px' }}>
                  <svg style={{ width: '48px', height: '48px', margin: '0 auto 6px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span style={{ fontSize: '11px', display: 'block', fontWeight: 500 }}>Chưa có ảnh</span>
                </div>
              )}

              {/* Lớp phủ loading khi AI đang scan / upload */}
              {faceUploading && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '8px',
                    textAlign: 'center',
                    backdropFilter: 'blur(2px)',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      border: '3px solid #38bdf8',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span>Đang AI Scan 512-d...</span>
                </div>
              )}
            </div>

            {/* Badge mô tả dưới ảnh */}
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: pendingPreviewUrl ? '#0284c7' : isFaceRegistered ? '#15803d' : '#64748b',
                textAlign: 'center',
              }}
            >
              {pendingPreviewUrl
                ? 'Ảnh xem trước mới'
                : isFaceRegistered
                ? '✓ Viền xanh: Định danh hợp lệ'
                : 'Chưa có ảnh chân dung'}
            </span>
          </div>

          {/* CỘT 2: KHU VỰC ĐIỀU KHIỂN & HƯỚNG DẪN */}
          <div style={{ flex: '1 1 340px' }}>
            {/* TH1: Đang hiển thị ảnh xem trước vừa chụp hoặc vừa chọn */}
            {pendingPreviewUrl ? (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <svg style={{ width: '18px', height: '18px', color: '#0284c7' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>Xác nhận ảnh Face ID</strong>
                </div>
                <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                  Hệ thống AI sẽ tự động phân tích độ sắc nét (Laplacian blur), độ rọi sáng, kiểm tra chống giả mạo (Anti-spoofing) và trích xuất vector 512 chiều.
                </p>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleConfirmFaceUpload}
                    disabled={faceUploading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#0d9488',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: faceUploading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)',
                    }}
                  >
                    <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {faceUploading ? 'Đang kiểm tra & lưu...' : 'Xác nhận & Lưu Face ID'}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelPending}
                    disabled={faceUploading}
                    style={{
                      background: '#ffffff',
                      color: '#64748b',
                      border: '1px solid #cbd5e1',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: faceUploading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Chụp lại / Chọn ảnh khác
                  </button>
                </div>
              </div>
            ) : isCameraActive ? (
              /* TH2: Đang mở Camera trực tiếp */
              <div
                style={{
                  background: '#0f172a',
                  borderRadius: '12px',
                  padding: '16px',
                  color: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                    Webcam đang hoạt động
                  </span>
                  <button
                    type="button"
                    onClick={stopCameraStream}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      color: '#94a3b8',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Đóng camera
                  </button>
                </div>

                {/* Video viewport có khung ngắm oval */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '420px',
                    height: '240px',
                    background: '#000000',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    margin: '0 auto 14px',
                    border: '2px solid #334155',
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)', // Lật gương
                    }}
                  />

                  {/* Khung định vị khuôn mặt oval */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '160px',
                      height: '200px',
                      border: '2px dashed #38bdf8',
                      borderRadius: '50%',
                      pointerEvents: 'none',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '11px',
                      color: '#e2e8f0',
                      background: 'rgba(0, 0, 0, 0.6)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Căn chỉnh khuôn mặt vào giữa khung
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 22px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(2, 132, 199, 0.4)',
                    }}
                  >
                    <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    Chụp ảnh ngay
                  </button>

                  <button
                    type="button"
                    onClick={stopCameraStream}
                    style={{
                      background: '#334155',
                      color: '#e2e8f0',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Hủy bỏ
                  </button>
                </div>
              </div>
            ) : (
              /* TH3: Trạng thái bình thường - Lựa chọn Bật Camera hoặc Tải ảnh từ máy tính */
              <div>
                <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                  {isFaceRegistered
                    ? 'Bạn đã đăng ký Face ID thành công. Khi đến sự kiện, bạn chỉ cần bước qua làn Kiosk nhận diện để vào cổng ngay tức thì mà không cần xuất trình vé giấy. Bạn có thể chụp lại hoặc tải ảnh mới để cập nhật nếu muốn.'
                    : 'Hãy đăng ký khuôn mặt để kích hoạt tính năng check-in không chạm (Touchless Kiosk 1s). Bạn có thể mở camera chụp trực tiếp hoặc tải ảnh chân dung từ máy tính.'}
                </p>

                {/* Hướng dẫn tiêu chuẩn ICAO */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    color: '#64748b',
                  }}
                >
                  <strong style={{ color: '#334155' }}>💡 Yêu cầu ảnh chuẩn:</strong> Nhìn thẳng camera, đủ sáng, không đeo kính râm hay khẩu trang, và không có người khác đứng cùng trong khung hình.
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Nút 1: Bật camera chụp trực tiếp */}
                  <button
                    type="button"
                    onClick={handleStartCamera}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    <svg style={{ width: '17px', height: '17px', color: '#38bdf8' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    {isFaceRegistered ? 'Chụp lại bằng camera' : 'Bật camera chụp trực tiếp'}
                  </button>

                  {/* Nút 2: Tải ảnh chân dung từ máy tính */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#ffffff',
                      color: '#0f172a',
                      border: '1.5px solid #cbd5e1',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <svg style={{ width: '17px', height: '17px', color: '#64748b' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    {isFaceRegistered ? 'Tải ảnh khác từ máy' : 'Tải ảnh chân dung từ máy tính'}
                  </button>

                  {/* Input file ẩn */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleSelectLocalFile}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* THÔNG TIN CÁ NHÂN CƠ BẢN (BẠN BẠN LÀM) */}
      {/* ========================================================================= */}
      <section className="form-panel">
        <div className="panel-header">
          <h2 className="panel-title">
            <svg className="icon" viewBox="0 0 24 24" style={{ color: 'var(--color-teal)' }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Hồ Sơ Cá Nhân &amp; Tài Khoản
          </h2>
        </div>

        <form id="profileInfoForm" onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="form-grid-layout">
            {/* Tên đăng nhập */}
            <div className="form-field">
              <label className="field-label" htmlFor="inputUsername">
                Tên đăng nhập
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="inputUsername"
                  className="form-control"
                  value={profile?.username || ''}
                  readOnly
                  disabled
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-field">
              <label className="field-label" htmlFor="inputEmail">
                Địa chỉ Email
              </label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="inputEmail"
                  className="form-control"
                  value={profile?.email || ''}
                  readOnly
                  disabled
                />
              </div>
            </div>

            {/* Họ và tên */}
            <div className="form-field">
              <label className="field-label" htmlFor="inputFullName">
                Họ và tên người dùng <span className="req">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="inputFullName"
                  className={`form-control ${fieldErrors.fullName ? 'error-state' : ''}`}
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: undefined }));
                  }}
                  placeholder="Nhập họ và tên"
                />
              </div>
              {fieldErrors.fullName && (
                <span className="field-error-msg">{fieldErrors.fullName}</span>
              )}
            </div>

            {/* Số điện thoại */}
            <div className="form-field">
              <label className="field-label" htmlFor="inputPhone">
                Số điện thoại liên hệ <span className="req">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="inputPhone"
                  className={`form-control ${fieldErrors.phone ? 'error-state' : ''}`}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: undefined }));
                  }}
                  placeholder="Nhập số điện thoại"
                  maxLength={10}
                />
              </div>
              {fieldErrors.phone && (
                <span className="field-error-msg">{fieldErrors.phone}</span>
              )}
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: '20px' }}>
            <button type="submit" className="btn-submit-action" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu thay đổi thông tin'}
            </button>
            <button
              type="button"
              id="btnTogglePasswordPanel"
              className="btn-trigger-pwd"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
            >
              <svg className="icon" viewBox="0 0 24 24">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              <span>{showPasswordSection ? 'Ẩn đổi mật khẩu' : 'Đổi mật khẩu'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* ========================================================================= */}
      {/* FORM ĐỔI MẬT KHẨU (BẠN BẠN LÀM) */}
      {/* ========================================================================= */}
      {showPasswordSection && (
        <section className="form-panel" id="passwordChangePanel" style={{ marginTop: '24px' }}>
          <div className="panel-header">
            <h2 className="panel-title">
              <svg className="icon" viewBox="0 0 24 24" style={{ color: 'var(--color-teal)' }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Thiết Lập Mật Khẩu Mới
            </h2>
          </div>

          <form id="passwordForm" onSubmit={handleChangePassword}>
            <div className="form-grid-layout">
              {/* Mật khẩu hiện tại */}
              <div className="form-field full" style={{ gridColumn: 'span 2' }}>
                <label className="field-label" htmlFor="inputCurrentPassword">
                  Mật khẩu hiện tại <span className="req">*</span>
                </label>
                <div className="input-wrapper" style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    id="inputCurrentPassword"
                    className={`form-control ${fieldErrors.currentPassword ? 'error-state' : ''}`}
                    placeholder="Nhập mật khẩu đang dùng"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (fieldErrors.currentPassword)
                        setFieldErrors((p) => ({ ...p, currentPassword: undefined }));
                    }}
                  />
                  <button
                    type="button"
                    className="toggle-pwd-btn"
                    onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <svg className="icon" viewBox="0 0 24 24">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
                {fieldErrors.currentPassword && (
                  <span className="field-error-msg">{fieldErrors.currentPassword}</span>
                )}
              </div>

              {/* Mật khẩu mới */}
              <div className="form-field">
                <label className="field-label" htmlFor="inputNewPassword">
                  Mật khẩu mới <span className="req">*</span>
                </label>
                <div className="input-wrapper" style={{ position: 'relative' }}>
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    id="inputNewPassword"
                    className={`form-control ${fieldErrors.newPassword ? 'error-state' : ''}`}
                    placeholder="Tối thiểu 6 ký tự"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (fieldErrors.newPassword)
                        setFieldErrors((p) => ({ ...p, newPassword: undefined }));
                    }}
                  />
                  <button
                    type="button"
                    className="toggle-pwd-btn"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <svg className="icon" viewBox="0 0 24 24">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
                {fieldErrors.newPassword && (
                  <span className="field-error-msg">{fieldErrors.newPassword}</span>
                )}
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div className="form-field">
                <label className="field-label" htmlFor="inputConfirmPassword">
                  Xác nhận mật khẩu mới <span className="req">*</span>
                </label>
                <div className="input-wrapper" style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    id="inputConfirmPassword"
                    className={`form-control ${fieldErrors.confirmPassword ? 'error-state' : ''}`}
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword)
                        setFieldErrors((p) => ({ ...p, confirmPassword: undefined }));
                    }}
                  />
                  <button
                    type="button"
                    className="toggle-pwd-btn"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <svg className="icon" viewBox="0 0 24 24">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <span className="field-error-msg">{fieldErrors.confirmPassword}</span>
                )}
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: '20px' }}>
              <button type="submit" className="btn-submit-action" disabled={loading}>
                {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu mới'}
              </button>
              <button
                type="button"
                className="btn-trigger-pwd"
                onClick={() => setShowPasswordSection(false)}
              >
                Hủy bỏ
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
