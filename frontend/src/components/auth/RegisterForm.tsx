'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RegisterRequest, RegisterFormErrors } from '../../types/auth';
import { authApi } from '../../services/authApi';
import { GoogleAuthButton } from './GoogleAuthButton';
import { RegisterVisualBanner } from './RegisterVisualBanner';

export const RegisterForm: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);

  // Form state
  const [fullName, setFullName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // Validation errors state
  const [errors, setErrors] = useState<RegisterFormErrors>({});

  // Toast feedback state
  const [toast, setToast] = useState<{ show: boolean; message: string; isError: boolean }>({
    show: false,
    message: '',
    isError: false,
  });

  const showToast = (message: string, isError = false) => {
    setToast({ show: true, message, isError });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4500);
  };

  const validateForm = (): boolean => {
    const errs: RegisterFormErrors = {};

    if (!fullName.trim()) {
      errs.fullName = 'Vui lòng nhập họ và tên của bạn';
    } else if (fullName.trim().length < 2 || fullName.trim().length > 100) {
      errs.fullName = 'Họ và tên phải có độ dài từ 2 đến 100 ký tự';
    }

    if (!username.trim()) {
      errs.username = 'Tên đăng nhập không được để trống';
    } else if (username.trim().length < 4 || username.trim().length > 50) {
      errs.username = 'Tên đăng nhập từ 4 đến 50 ký tự';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      errs.username = 'Tên đăng nhập chỉ gồm chữ cái, số và dấu gạch dưới';
    }

    if (!phone.trim()) {
      errs.phoneNumber = 'Số điện thoại liên hệ là bắt buộc';
    } else if (!/^(0[3|5|7|8|9])[0-9]{8}$/.test(phone.trim())) {
      errs.phoneNumber = 'Số điện thoại phải có 10 chữ số chuẩn định dạng Việt Nam (ví dụ 0912345678)';
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email.trim()) {
      errs.email = 'Địa chỉ email không được để trống';
    } else if (!emailRegex.test(email.trim())) {
      errs.email = 'Email không hợp lệ (ví dụ: yourname@domain.com)';
    }

    if (!password) {
      errs.password = 'Mật khẩu không được để trống';
    } else if (password.length < 6) {
      errs.password = 'Mật khẩu phải có độ dài tối thiểu 6 ký tự';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Vui lòng xác nhận lại mật khẩu';
    } else if (confirmPassword !== password) {
      errs.confirmPassword = 'Mật khẩu xác nhận không trùng khớp';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Vui lòng kiểm tra và hoàn thiện các trường thông tin có viền đỏ.', true);
      return;
    }

    setLoading(true);
    try {
      const payload: RegisterRequest = {
        fullName: fullName.trim(),
        username: username.trim(),
        phoneNumber: phone.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      };

      const result = await authApi.register(payload);

      if (result.success) {
        showToast(`Đăng ký tài khoản ${result.data?.username || ''} thành công! Đang chuyển hướng...`);
        setTimeout(() => {
          router.push('/login');
        }, 1800);
      } else {
        const errMsg = result.message || 'Đăng ký không thành công. Vui lòng thử lại.';
        showToast(errMsg, true);

        if (errMsg.toLowerCase().includes('email')) {
          setErrors((prev) => ({ ...prev, email: errMsg }));
        } else if (errMsg.toLowerCase().includes('tên đăng nhập') || errMsg.toLowerCase().includes('username')) {
          setErrors((prev) => ({ ...prev, username: errMsg }));
        }
      }
    } catch {
      showToast('Đã xảy ra sự cố kết nối máy chủ. Vui lòng thử lại sau ít phút.', true);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccessToken = async (idToken: string) => {
    showToast('Đang kết nối xác thực Google OAuth 2.0...');
    try {
      const result = await authApi.googleLogin({ idToken });
      if (result.success && result.data) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', result.data.accessToken);
          localStorage.setItem('access_token', result.data.accessToken);
          localStorage.setItem('refreshToken', result.data.refreshToken);
          localStorage.setItem('user', JSON.stringify(result.data));
          window.dispatchEvent(new Event('auth-state-change'));
        }
        showToast('Đăng nhập nhanh Google thành công! Đang chuyển hướng...');
        setTimeout(() => router.push('/events'), 1200);
      } else {
        showToast(result.message || 'Google Auth không thành công.', true);
      }
    } catch {
      showToast('Không thể kết nối đến máy chủ xác thực.', true);
    }
  };

  return (
    <div className="auth-page-container">
      {/* Top Banner */}
      <div className="auth-top-bar">
        <span>Cổng phát hành vé điện tử và Điểm danh nhận diện khuôn mặt</span>
        <span>
          Hệ thống sự kiện thông minh <strong>EventPass</strong>
        </span>
      </div>

      {/* Header */}
      <header className="auth-header">
        <Link href="/events" className="auth-brand">
          EventPass<span className="pass-tag">TICKET</span>
          <span className="accent-dot"></span>
        </Link>
      </header>

      {/* Main Form Content */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="register-card">
          {/* CỘT TRÁI: Visual Hero */}
          <RegisterVisualBanner />

          {/* CỘT PHẢI: Form đăng ký */}
          <div className="form-column">
            <div className="form-header">
              <h2 className="form-title">Tạo tài khoản thành viên</h2>
              <p className="form-subtitle">Đăng ký tài khoản để tra cứu vé và điểm danh nhận diện khuôn mặt</p>
            </div>

            {/* Nút Đăng ký nhanh bằng Google */}
            <GoogleAuthButton onSuccessToken={handleGoogleSuccessToken} disabled={loading} label="Đăng ký nhanh bằng Google" />

            <div className="divider">hoặc nhập thông tin chi tiết</div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>
              <div className="input-grid">
                {/* Họ tên */}
                <div className={`form-group full-width ${errors.fullName ? 'has-error' : ''}`}>
                  <label className="form-label" htmlFor="fullName">
                    <span>
                      Họ và tên người tham dự
                      <span className="req">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    className={`form-input ${errors.fullName ? 'is-invalid' : ''}`}
                    placeholder="ví dụ: Hà Thái Sơn"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                    }}
                  />
                  {errors.fullName && <div className="error-message">{errors.fullName}</div>}
                </div>

                {/* Tên đăng nhập */}
                <div className={`form-group ${errors.username ? 'has-error' : ''}`}>
                  <label className="form-label" htmlFor="username">
                    <span>
                      Tên đăng nhập <span className="req">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    id="username"
                    className={`form-input ${errors.username ? 'is-invalid' : ''}`}
                    placeholder="ví dụ: thaison_2026"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }));
                    }}
                  />
                  {errors.username && <div className="error-message">{errors.username}</div>}
                </div>

                {/* Số điện thoại */}
                <div className={`form-group ${errors.phoneNumber ? 'has-error' : ''}`}>
                  <label className="form-label" htmlFor="phone">
                    <span>
                      Số điện thoại <span className="req">*</span>
                    </span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    className={`form-input ${errors.phoneNumber ? 'is-invalid' : ''}`}
                    placeholder="ví dụ: 0912345678"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phoneNumber) setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                    }}
                  />
                  {errors.phoneNumber && <div className="error-message">{errors.phoneNumber}</div>}
                </div>

                {/* Email */}
                <div className={`form-group full-width ${errors.email ? 'has-error' : ''}`}>
                  <label className="form-label" htmlFor="email">
                    <span>
                      Địa chỉ Email <span className="req">*</span>
                    </span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    className={`form-input ${errors.email ? 'is-invalid' : ''}`}
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                  />
                  {errors.email && <div className="error-message">{errors.email}</div>}
                </div>

                {/* Mật khẩu */}
                <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
                  <label className="form-label" htmlFor="password">
                    <span>
                      Mật khẩu <span className="req">*</span>
                    </span>
                  </label>
                  <input
                    type="password"
                    id="password"
                    className={`form-input ${errors.password ? 'is-invalid' : ''}`}
                    placeholder="Tối thiểu 6 ký tự"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                  />
                  {errors.password && <div className="error-message">{errors.password}</div>}
                </div>

                {/* Xác nhận mật khẩu */}
                <div className={`form-group ${errors.confirmPassword ? 'has-error' : ''}`}>
                  <label className="form-label" htmlFor="confirmPassword">
                    <span>
                      Xác nhận mật khẩu <span className="req">*</span>
                    </span>
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    className={`form-input ${errors.confirmPassword ? 'is-invalid' : ''}`}
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }}
                  />
                  {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
                </div>
              </div>

              {/* Submit */}
              <button type="submit" className="btn-submit" disabled={loading} style={{ marginTop: '20px' }}>
                {loading ? 'Đang tạo tài khoản...' : 'Hoàn tất Đăng ký Thành viên'}
              </button>
            </form>

            <p className="form-footer">
              Đã có tài khoản?
              <Link href="/login">Đăng nhập ngay</Link>
            </p>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      <div className={`auth-toast ${toast.show ? 'show' : ''} ${toast.isError ? 'error' : ''}`}>
        <span>{toast.isError ? '⚠️' : '✓'}</span>
        <span>{toast.message}</span>
      </div>
    </div>
  );
};
