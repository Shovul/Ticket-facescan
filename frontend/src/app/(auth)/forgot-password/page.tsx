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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setError('Địa chỉ email không hợp lệ (ví dụ: name@domain.com).');
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.forgotPassword({ email: email.trim() });
      if (res.success) {
        setSuccessMessage(
          res.message || 'Liên kết đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư (hiệu lực trong 15 phút).'
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
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)]">
      {/* Simulation Toolbar */}
      <div className="sim-bar">
        <div>
          <span className="sim-title">EventPass Sandbox:</span> Thử nghiệm Quên mật khẩu (UC03)
        </div>
        <div className="sim-actions">
          <button
            type="button"
            className="sim-btn"
            onClick={() => {
              setError(null);
              setBannerError(null);
              setEmail('thaison@example.com');
            }}
          >
            Fill Email mẫu
          </button>
          <button
            type="button"
            className="sim-btn"
            onClick={() => {
              setError(null);
              setEmail('chuadangky@domain.com');
              setBannerError('Email này chưa được đăng ký trong hệ thống EventPass.');
            }}
          >
            Lỗi Email không tồn tại
          </button>
          <button
            type="button"
            className="sim-btn"
            onClick={() => {
              setError(null);
              setEmail('thaison@example.com');
              setBannerError('Bạn đã yêu cầu vượt quá 3 lần trong 15 phút. Vui lòng thử lại sau.');
            }}
          >
            Lỗi Rate Limit (3 lần/15p)
          </button>
          <button
            type="button"
            className="sim-btn"
            onClick={() => {
              setEmail('');
              setError(null);
              setBannerError(null);
              setSuccessMessage(null);
            }}
          >
            Làm mới
          </button>
        </div>
      </div>

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
        <div className="login-card" style={{ minHeight: '520px' }}>
          {/* Cột trái: Thông tin quy định an toàn */}
          <div className="visual-column">
            <div>
              <span className="badge-kicker">Bảo mật tài khoản</span>
              <h1 className="hero-title">Khôi phục mật khẩu dễ dàng & bảo mật</h1>
              <p className="hero-desc">
                EventPass áp dụng cơ chế xác thực an toàn một chiều. Liên kết khôi phục sẽ được gửi trực tiếp đến hộp thư cá nhân đã đăng ký.
              </p>
            </div>

            <div className="security-rules" style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px dashed rgba(159, 216, 197, 0.4)',
              borderRadius: '10px',
              padding: '16px',
              marginTop: '24px',
              fontSize: '12.5px',
              color: '#d1e7f0',
              lineHeight: '1.65'
            }}>
              <strong style={{ color: 'var(--color-yellow)', display: 'block', marginBottom: '8px' }}>
                Quy tắc an toàn hệ thống (BR05 / NFR08):
              </strong>
              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                <li style={{ position: 'relative', paddingLeft: '16px', marginBottom: '6px' }}>
                  • Liên kết khôi phục có hiệu lực trong chính xác 15 phút.
                </li>
                <li style={{ position: 'relative', paddingLeft: '16px', marginBottom: '6px' }}>
                  • Giới hạn tối đa 3 lần yêu cầu liên tiếp trong vòng 15 phút.
                </li>
                <li style={{ position: 'relative', paddingLeft: '16px' }}>
                  • Mật khẩu mới bắt buộc tối thiểu 6 ký tự, gồm chữ hoa, chữ thường và số.
                </li>
              </ul>
            </div>
          </div>

          {/* Cột phải: Form nhập email */}
          <div className="form-column">
            <h2 className="form-title">Quên mật khẩu?</h2>
            <p className="form-subtitle">
              Nhập địa chỉ email đăng ký tài khoản của bạn để nhận liên kết khôi phục mật khẩu mới.
            </p>

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
                    placeholder="ví dụ: yourname@domain.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                      if (bannerError) setBannerError(null);
                    }}
                  />
                  {error && <div className="error-message">{error}</div>}
                </div>

                <button
                  type="submit"
                  className="btn-submit"
                  disabled={loading}
                  style={{ marginTop: '10px' }}
                >
                  {loading ? 'Đang gửi mã xác nhận...' : 'Gửi liên kết khôi phục'}
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

            <div style={{ marginTop: '24px', fontSize: '13px', textAlign: 'center' }}>
              <Link href="/login" className="form-link">
                ← Quay lại trang Đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
