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
  const [errors, setErrors] = useState<{ token?: string; password?: string; confirmPassword?: string }>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerError(null);
    setSuccessMessage(null);

    const newErrors: { token?: string; password?: string; confirmPassword?: string } = {};

    if (!token.trim()) {
      newErrors.token = 'Vui lòng cung cấp mã Token xác thực từ Email.';
    }
    if (!newPassword.trim()) {
      newErrors.password = 'Mật khẩu mới không được để trống.';
    } else if (newPassword.length < 6) {
      newErrors.password = 'Mật khẩu mới phải có tối thiểu 6 ký tự.';
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
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
    <div className="login-card" style={{ minHeight: '540px' }}>
      {/* Cột trái */}
      <div className="visual-column">
        <div>
          <span className="badge-kicker">Thiết lập mật khẩu mới</span>
          <h1 className="hero-title">Bảo vệ tài khoản với mật khẩu mạnh mẽ</h1>
          <p className="hero-desc">
            Vui lòng nhập mật khẩu an toàn kết hợp các chữ số và ký tự để bảo mật tối đa cho tài khoản EventPass của bạn.
          </p>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px dashed rgba(159, 216, 197, 0.4)',
            borderRadius: '10px',
            padding: '16px',
            fontSize: '12.5px',
            color: '#d1e7f0',
            lineHeight: '1.65',
          }}
        >
          <strong style={{ color: 'var(--color-yellow)', display: 'block', marginBottom: '6px' }}>
            Yêu cầu mật khẩu an toàn:
          </strong>
          <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
            <li>• Tối thiểu 6 ký tự trở lên</li>
            <li>• Không trùng khớp với tên đăng nhập hoặc email</li>
            <li>• Hạn chế dùng ngày sinh hoặc dãy số liên tiếp</li>
          </ul>
        </div>
      </div>

      {/* Cột phải: Form */}
      <div className="form-column">
        <h2 className="form-title">Tạo mật khẩu mới</h2>
        <p className="form-subtitle">Điền mã xác thực từ email và mật khẩu mới bạn muốn đặt</p>

        {bannerError && (
          <div className="banner-alert show error">
            {bannerError}
          </div>
        )}

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
            }}
          >
            ✓ {successMessage} Đang chuyển hướng về trang Đăng nhập...
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
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

          <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
            <label className="form-label" htmlFor="newPassword">
              Mật khẩu mới <span className="req">*</span>
            </label>
            <input
              type="password"
              id="newPassword"
              className={`form-input ${errors.password ? 'is-invalid' : ''}`}
              placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                if (bannerError) setBannerError(null);
              }}
            />
            {errors.password && <div className="error-message">{errors.password}</div>}
          </div>

          <div className={`form-group ${errors.confirmPassword ? 'has-error' : ''}`}>
            <label className="form-label" htmlFor="confirmPassword">
              Xác nhận mật khẩu mới <span className="req">*</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              className={`form-input ${errors.confirmPassword ? 'is-invalid' : ''}`}
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                if (bannerError) setBannerError(null);
              }}
            />
            {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
          </div>

          <button type="submit" className="btn-submit" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'Đang cập nhật mật khẩu...' : 'Xác nhận đổi mật khẩu'}
          </button>
        </form>

        <p className="form-footer" style={{ marginTop: '20px' }}>
          Nhớ lại mật khẩu?{' '}
          <Link href="/login" className="form-link">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)]">
      {/* Top Bar */}
      <div className="top-bar">
        <span>Cổng phát hành vé điện tử và Điểm danh nhận diện khuôn mặt</span>
        <span>Hệ thống sự kiện thông minh SGU</span>
      </div>

      {/* Header */}
      <header className="header">
        <Link href="/events" className="brand-name">
          EventPass<span className="pass-tag">TICKET</span><span className="accent-dot"></span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="main-wrapper">
        <Suspense fallback={<div>Đang tải giao diện...</div>}>
          <ResetPasswordContent />
        </Suspense>
      </main>
    </div>
  );
}
