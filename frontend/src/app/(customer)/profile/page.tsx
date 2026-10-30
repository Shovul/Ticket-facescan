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

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);

  // Password fields
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

  // States
  const [loading, setLoading] = useState(false);
  const [faceUploading, setFaceUploading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

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
        setIsFaceRegistered(res.data.hasFaceRegistered);
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
  }, [router]);

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
        // Đồng bộ lại user trong localStorage
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

  const handleFaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    setFaceUploading(true);
    setErrorBanner(null);

    try {
      const res = await userApi.uploadFaceProfile(file);
      if (res.success) {
        setIsFaceRegistered(true);
        notify('Đã trích xuất 512-d embeddings và kích hoạt Face ID thành công!', 'success');
      } else {
        setErrorBanner(res.message || 'Không thể trích xuất khuôn mặt. Hãy chụp ảnh chính diện rõ nét.');
      }
    } catch {
      setErrorBanner('Lỗi trích xuất nhận diện khuôn mặt qua AI Service.');
    } finally {
      setFaceUploading(false);
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
    <main className="main-container-single">
      {errorBanner && (
        <div
          className="banner-alert show error"
          style={{
            background: '#fde8e8',
            color: 'var(--color-red)',
            border: '1px solid #f8b4b4',
            padding: '11px 14px',
            borderRadius: '7px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
          }}
        >
          {errorBanner}
        </div>
      )}

      {/* BIỂU MẪU: THÔNG TIN CÁ NHÂN & SINH TRẮC HỌC (UC04) */}
      <section className="form-panel">
        <div className="panel-header">
          <h2 className="panel-title">
            <svg className="icon" viewBox="0 0 24 24" style={{ color: 'var(--color-teal)' }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Hồ Sơ Cá Nhân &amp; Dữ Liệu Sinh Trắc Học
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
                Họ và tên người tham dự <span className="req">*</span>
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

            {/* PHẦN SINH TRẮC HỌC: XỬ LÝ TRẠNG THÁI TRƯỚC / SAU KHI TẢI ẢNH */}
            <div className="face-biometric-section">
              <div
                className={`face-preview-container ${faceUploading ? 'active-scan' : ''}`}
                id="facePreviewContainer"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} id="facePreviewImg" className="face-preview-img" alt="Ảnh nhận diện" />
                ) : (
                  <svg
                    id="facePlaceholderIcon"
                    className="face-placeholder-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
                <div className="face-scan-overlay" />
                {faceUploading && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(2, 56, 82, 0.75)',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: '4px',
                    }}
                  >
                    Đang AI Scan...
                  </div>
                )}
              </div>

              <div className="face-info-content">
                {/* HUY HIỆU TRẠNG THÁI */}
                <div
                  className={`face-status-badge ${isFaceRegistered ? 'activated' : 'not-activated'}`}
                  id="faceStatusBadge"
                >
                  <span id="faceStatusText">
                    {isFaceRegistered ? '✓ Đã kích hoạt Face ID' : 'Chưa kích hoạt Face ID'}
                  </span>
                </div>

                <h3 className="face-title">Ảnh chân dung nhận diện khuôn mặt</h3>
                <p className="face-desc">
                  Dữ liệu được mã hóa an toàn. Camera tại cổng Kiosk sẽ tự động nhận diện bạn chỉ trong 1 giây.
                </p>

                <div className="face-action-btns">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="faceFileInput"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFaceFileChange}
                  />
                  <button
                    type="button"
                    className="btn-face-upload"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={faceUploading}
                  >
                    <svg className="icon" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span id="btnUploadText">
                      {faceUploading
                        ? 'Đang trích xuất...'
                        : isFaceRegistered
                        ? 'Cập nhật ảnh khuôn mặt'
                        : 'Tải ảnh khuôn mặt'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-submit-action" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu thay đổi hồ sơ'}
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

      {/* BIỂU MẪU ĐỔI MẬT KHẨU (HIỂN THỊ KHI BẤM ĐỔI MẬT KHẨU) */}
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
