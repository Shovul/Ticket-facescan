'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import '../../../styles/auth.css';
import { authApi } from '../../../services/authApi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBannerError(null);
    setSuccessMessage(null);

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email của bạn');
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setError('Vui lòng nhập địa chỉ email hợp lệ (ví dụ: name@domain.com)');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email: email.trim() });
      if (res.success) {
        setSuccessMessage(
          res.message ||
            'Hệ thống đã gửi liên kết khôi phục mật khẩu đến hộp thư của bạn. Vui lòng kiểm tra email!'
        );
      } else {
        setBannerError(res.message || 'Không thể gửi email đặt lại mật khẩu.');
      }
    } catch {
      setBannerError('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      {/* Top Bar */}
      <div className="top-bar">
        <span>Cổng phát hành vé điện tử và Điểm danh nhận diện khuôn mặt</span>
        <span>Hệ thống sự kiện thông minh</span>
      </div>

      {/* Header */}
      <header className="header">
        <Link href="/events" className="brand-name">
          EventPass<span className="pass-tag">TICKET</span>
          <span className="accent-dot"></span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="main-wrapper">
        <div className="recover-card">
          {/* CỘT TRÁI: THÔNG TIN QUY ĐỊNH AN TOÀN */}
          <div className="visual-column">
            <div>
              <span className="badge-kicker">Khôi phục quyền truy cập</span>
              <h1 className="hero-title">Lấy lại mật khẩu dễ dàng và an toàn</h1>
              <p className="hero-desc">
                Hệ thống sẽ gửi một mã token bảo mật và liên kết đặt lại mật khẩu đến địa chỉ email đã đăng ký của bạn.
              </p>
            </div>

            <div>
              <div className="security-rules">
                <strong>Quy tắc an toàn hệ thống (BR05 / NFR08):</strong>
                <ul>
                  <li>Liên kết khôi phục có hiệu lực trong chính xác 15 phút.</li>
                  <li>Giới hạn tối đa 3 lần yêu cầu liên tiếp trong vòng 15 phút.</li>
                  <li>Mật khẩu mới bắt buộc tối thiểu 6 ký tự, gồm chữ hoa, chữ thường và số.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: FORM NHẬP EMAIL */}
          <div className="form-column">
            <h2 className="form-title">Quên mật khẩu?</h2>
            <p className="form-subtitle">
              Nhập địa chỉ email đăng ký tài khoản của bạn để nhận liên kết khôi phục mật khẩu mới.
            </p>

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
                ✓ {successMessage}
              </div>
            )}

            {!successMessage ? (
              <form onSubmit={handleSubmit} noValidate>
                <div className={`form-group ${error ? 'has-error' : ''}`}>
                  <label className="form-label" htmlFor="forgotEmail">
                    Địa chỉ Email của bạn <span className="req">*</span>
                  </label>
                  <input
                    type="email"
                    id="forgotEmail"
                    className={`form-input ${error ? 'is-invalid' : ''}`}
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                      if (bannerError) setBannerError(null);
                    }}
                  />
                  {error && <div className="error-message">{error}</div>}
                </div>

                <button type="submit" className="btn-submit" disabled={loading}>
                  <span>{loading ? 'Đang gửi mã xác nhận...' : 'Gửi liên kết khôi phục'}</span>
                </button>
              </form>
            ) : (
              <div style={{ marginTop: '10px' }}>
                <Link
                  href="/reset-password"
                  className="btn-submit"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    textDecoration: 'none',
                    background: 'var(--color-navy)',
                    marginBottom: '10px',
                  }}
                >
                  Nhập mã Token để đổi mật khẩu ngay →
                </Link>
              </div>
            )}

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
