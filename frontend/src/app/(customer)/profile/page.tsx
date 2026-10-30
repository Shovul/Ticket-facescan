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

  // States
  const [loading, setLoading] = useState(false);
  const [faceUploading, setFaceUploading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined'
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
    setLoading(true);

    try {
      const res = await userApi.updateProfile({
        fullName: fullName.trim(),
        phoneNumber: phone.trim(),
      });

      if (res.success) {
        notify('Cập nhật thông tin tài khoản thành công!', 'success');
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

    if (!newPassword || newPassword.length < 6) {
      setErrorBanner('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorBanner('Mật khẩu xác nhận không khớp.');
      return;
    }

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
        <div className="banner-alert show error" style={{
          background: '#fde8e8',
          color: 'var(--color-red)',
          border: '1px solid #f8b4b4',
          padding: '11px 14px',
          borderRadius: '7px',
          fontSize: '13px',
          fontWeight: 600
        }}>
          {errorBanner}
        </div>
      )}

      {/* Form Panel 1: Thông tin tài khoản & Sinh trắc học */}
      <section className="form-panel">
        <div className="panel-header">
          <div>
            <h1 className="panel-title">
              <svg className="icon" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Hồ sơ cá nhân & Bảo mật sinh trắc học
            </h1>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Quản lý định danh tài khoản và dữ liệu nhận diện khuôn mặt phục vụ điểm danh Kiosk Fast Face-Checkin.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile}>
          <div className="form-grid-layout">
            {/* Sinh trắc học khuôn mặt */}
            <div className="face-biometric-section">
              <div className={`face-preview-container ${faceUploading ? 'active-scan' : ''}`}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Face Avatar" className="face-preview-img" />
                ) : (
                  <svg className="face-placeholder-icon" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
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
                <div>
                  <span className={`face-status-badge ${isFaceRegistered ? 'activated' : 'not-activated'}`}>
                    {isFaceRegistered ? '✓ Đã kích hoạt Face ID' : 'Chưa đăng ký Face ID'}
                  </span>
                </div>
                <h3 className="face-title">Dữ liệu khuôn mặt tự động (Fast Face Check-in)</h3>
                <p className="face-desc">
                  Tải lên ảnh chụp chân dung rõ nét, nhìn thẳng góc chính diện để hệ thống trích xuất vector 512 chiều kích hoạt qua cổng không cần chạm.
                </p>

                <div className="face-action-btns">
                  <input
                    ref={fileInputRef}
                    type="file"
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
                    <svg className="icon" viewBox="0 0 24 24" style={{ width: '15px', height: '15px' }}>
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    {faceUploading ? 'Đang trích xuất...' : isFaceRegistered ? 'Cập nhật ảnh khuôn mặt mới' : 'Nạp ảnh khuôn mặt ngay'}
                  </button>
                </div>
              </div>
            </div>

            {/* Thông tin Text */}
            <div className="form-field">
              <label className="field-label">Tên đăng nhập</label>
              <input
                type="text"
                className="form-control"
                value={profile?.username || ''}
                disabled
              />
            </div>

            <div className="form-field">
              <label className="field-label">Email tài khoản</label>
              <input
                type="text"
                className="form-control"
                value={profile?.email || ''}
                disabled
              />
            </div>

            <div className="form-field">
              <label className="field-label">
                Họ và tên <span className="req">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên đầy đủ"
                required
              />
            </div>

            <div className="form-field">
              <label className="field-label">Số điện thoại liên hệ</label>
              <input
                type="tel"
                className="form-control"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="ví dụ: 0912345678"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-submit-action" disabled={loading}>
              <svg className="icon" viewBox="0 0 24 24" style={{ width: '15px', height: '15px' }}>
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {loading ? 'Đang lưu...' : 'Lưu thay đổi hồ sơ'}
            </button>

            <button
              type="button"
              className="btn-trigger-pwd"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
            >
              <svg className="icon" viewBox="0 0 24 24" style={{ width: '15px', height: '15px' }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {showPasswordSection ? 'Ẩn đổi mật khẩu' : 'Đổi mật khẩu'}
            </button>
          </div>
        </form>
      </section>

      {/* Form Panel 2: Đổi mật khẩu (Toggle) */}
      {showPasswordSection && (
        <section className="form-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                <svg className="icon" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Thiết lập mật khẩu mới
              </h2>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Mật khẩu an toàn phải có độ dài tối thiểu 6 ký tự.
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword}>
            <div className="form-grid-layout">
              <div className="form-field full">
                <label className="field-label">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Nhập mật khẩu hiện tại của bạn"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="field-label">
                  Mật khẩu mới <span className="req">*</span>
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Tối thiểu 6 ký tự"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label className="field-label">
                  Xác nhận mật khẩu mới <span className="req">*</span>
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-submit-action"
                disabled={loading}
                style={{ background: 'var(--color-navy)' }}
              >
                {loading ? 'Đang cập nhật...' : 'Xác nhận cập nhật mật khẩu'}
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
