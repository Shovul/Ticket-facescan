'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import '../../../styles/auth.css';
import { authApi } from '../../../services/authApi';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ token?: string; password?: string; confirmPassword?: string }>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pwdStrength, setPwdStrength] = useState<'weak' | 'medium' | 'strong' | ''>('');

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  const handlePasswordChange = (val: string) => {
    setNewPassword(val);
    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
    if (bannerError) setBannerError(null);

    if (!val) {
      setPwdStrength('');
    } else if (val.length < 6) {
      setPwdStrength('weak');
    } else if (val.length < 10 || !/[0-9]/.test(val) || !/[A-Z]/.test(val)) {
      setPwdStrength('medium');
    } else {
      setPwdStrength('strong');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerError(null);
    setSuccessMessage(null);

    const newErrors: { token?: string; password?: string; confirmPassword?: string } = {};

    if (!token.trim()) {
      newErrors.token = 'Vui lòng cung cấp mã Token xác thực từ Email.';
    }
    if (!newPassword.trim()) {
      newErrors.password = 'Mật khẩu phải chứa ít nhất 6 ký tự.';
    } else if (newPassword.length < 6) {
      newErrors.password = 'Mật khẩu phải chứa ít nhất 6 ký tự.';
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const res = await authApi.resetPassword({
        token: token.trim(),
        newPassword: newPassword.trim(),
      });

      if (res.success) {
        setSuccessMessage(res.message || 'Mật khẩu của bạn đã được cập nhật thành công!');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setBannerError(res.message || 'Token không hợp lệ hoặc đã hết hạn.');
      }
    } catch {
      setBannerError('Lỗi kết nối máy chủ. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      {/* Top Bar */}
      <div className="top-bar">
        <span>Cổng phát hành vé điện tử và Điểm danh nhận diện khuôn mặt</span>
        <span>Hệ thống bảo mật tài khoản tập trung</span>
      </div>

      {/* Header */}
      <header className="header">
        <Link href="/events" className="brand-name">
          EventPass<span className="pass-tag">SECURITY</span>
          <span className="accent-dot"></span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="main-wrapper">
        <div className="recover-card">
          {/* CỘT TRÁI: NHẬN DIỆN TÀI KHOẢN TỪ LINK GMAIL */}
          <div className="visual-column">
            <div>
              <span className="badge-kicker">Xác thực hợp lệ</span>
              <h1 className="hero-title">Thiết lập mật khẩu truy cập mới</h1>
              <p className="hero-desc">
                Bạn vừa truy cập thành công qua liên kết xác thực an toàn gửi đến hộp thư Gmail.
              </p>
            </div>

            <div>
              <div className="security-rules">
                <strong>Nguyên tắc bảo vệ tài khoản:</strong>
                Mọi phiên đăng nhập hiện tại trên các thiết bị cũ sẽ tự động bị thu hồi ngay sau khi mật khẩu mới được lưu.
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: FORM NHẬP MẬT KHẨU MỚI */}
          <div className="form-column">
            {bannerError && <div className="banner-alert show error">{bannerError}</div>}

            {successMessage && (
              <div
                style={{
                  background: '#e8f8f0',
                  color: '#15803d',
                  border: '1px solid #a7f3d0',
                  borderRadius: '7px',
                  padding: '12px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '18px',
                  lineHeight: '1.5',
                }}
              >
                ✓ {successMessage} Đang chuyển hướng về trang Đăng nhập...
              </div>
            )}

            <h2 className="form-title">Tạo mật khẩu mới</h2>
            <p className="form-subtitle">
              Vui lòng thiết lập mật khẩu mạnh có tối thiểu 6 ký tự để bảo vệ tài khoản của bạn.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              {/* Token xác thực */}
              <div className={`form-group ${errors.token ? 'has-error' : ''}`}>
                <label className="form-label" htmlFor="resetToken">
                  Mã Token xác thực <span className="req">*</span>
                </label>
                <input
                  type="text"
                  id="resetToken"
                  className={`form-input ${errors.token ? 'is-invalid' : ''}`}
                  placeholder="Dán mã Token nhận được từ email (hoặc nhấp link email)"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    if (errors.token) setErrors((prev) => ({ ...prev, token: undefined }));
                    if (bannerError) setBannerError(null);
                  }}
                />
                {errors.token && <div className="error-message">{errors.token}</div>}
              </div>

              {/* Mật khẩu mới */}
              <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
                <label className="form-label" htmlFor="newPassword">
                  Mật khẩu mới <span className="req">*</span>
                </label>
                <div className="input-password-wrap">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    id="newPassword"
                    className={`form-input ${errors.password ? 'is-invalid' : ''}`}
                    placeholder="Tối thiểu 6 ký tự..."
                    value={newPassword}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-toggle-eye"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    title="Ẩn/Hiện mật khẩu"
                  >
                    <svg className="icon" viewBox="0 0 24 24">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
                <div className="password-meter-bar">
                  <div className={`meter-fill ${pwdStrength}`} />
                </div>
                {errors.password && <div className="error-message">{errors.password}</div>}
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div className={`form-group ${errors.confirmPassword ? 'has-error' : ''}`}>
                <label className="form-label" htmlFor="confirmPassword">
                  Xác nhận mật khẩu mới <span className="req">*</span>
                </label>
                <div className="input-password-wrap">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    className={`form-input ${errors.confirmPassword ? 'is-invalid' : ''}`}
                    placeholder="Nhập lại mật khẩu mới..."
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword)
                        setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                      if (bannerError) setBannerError(null);
                    }}
                  />
                  <button
                    type="button"
                    className="btn-toggle-eye"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title="Ẩn/Hiện mật khẩu"
                  >
                    <svg className="icon" viewBox="0 0 24 24">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
                {errors.confirmPassword && (
                  <div className="error-message">{errors.confirmPassword}</div>
                )}
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                <span>{loading ? 'Đang cập nhật mật khẩu...' : 'Cập Nhật Mật Khẩu Mới'}</span>
              </button>
            </form>

            <div className="form-bottom-row">
              <Link href="/login" className="back-link">
                <svg className="icon" viewBox="0 0 24 24">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                <span>Quay lại trang Đăng nhập</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="customer-state">Đang tải...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
