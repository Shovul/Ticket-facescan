'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '../../services/authApi';
import { LoginFormErrors } from '../../types/auth';
import { GoogleAuthButton } from './GoogleAuthButton';

interface LoginFormProps {
  identifier: string;
  setIdentifier: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  rememberMe?: boolean;
  setRememberMe?: (val: boolean) => void;
  errors: LoginFormErrors;
  setErrors: React.Dispatch<React.SetStateAction<LoginFormErrors>>;
  bannerError: string | null;
  setBannerError: (val: string | null) => void;
  onGoogleAuth?: () => void;
  onGoogleSuccessToken?: (idToken: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  identifier,
  setIdentifier,
  password,
  setPassword,
  rememberMe,
  setRememberMe,
  errors,
  setErrors,
  bannerError,
  setBannerError,
  onGoogleAuth,
  onGoogleSuccessToken,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerError(null);

    const newErrors: LoginFormErrors = {};
    if (!identifier.trim()) {
      newErrors.identifier = 'Vui lòng nhập Email hoặc Tên đăng nhập.';
    }
    if (!password.trim()) {
      newErrors.password = 'Mật khẩu không được để trống.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const res = await authApi.login({
        username: identifier.trim(),
        password: password.trim(),
      });

      if (!res.success || !res.data) {
        setBannerError(res.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
        setLoading(false);
        return;
      }

      // Lưu trữ thông tin đăng nhập
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', res.data.accessToken);
        localStorage.setItem('access_token', res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        localStorage.setItem('user', JSON.stringify({
          userId: res.data.userId,
          username: res.data.username,
          email: res.data.email,
          fullName: res.data.fullName,
          role: res.data.role,
        }));
        window.dispatchEvent(new Event('auth-state-change'));
      }

      setToastMessage(`Xin chào ${res.data.fullName || res.data.username}! Đang đăng nhập...`);

      setTimeout(() => {
        const userRole = res.data?.role?.toLowerCase() || '';
        if (userRole === 'admin' || userRole === 'organizer') {
          router.push('/admin/events');
        } else {
          router.push('/events');
        }
      }, 1000);
    } catch {
      setBannerError('Đã xảy ra lỗi trong quá trình kết nối máy chủ.');
      setLoading(false);
    }
  };

  return (
    <div className="form-column">
      <h2 className="form-title">Đăng nhập</h2>
      <p className="form-subtitle">Nhập tài khoản để truy cập hệ thống EventPass</p>

      {/* Banner báo lỗi */}
      {bannerError && (
        <div className="banner-alert show error">
          {bannerError}
        </div>
      )}

      {/* Đăng nhập nhanh Google */}
      <GoogleAuthButton
        onClick={onGoogleAuth}
        onSuccessToken={onGoogleSuccessToken}
        label="Đăng nhập nhanh bằng Google"
      />

      <div className="divider">
        <span>hoặc dùng tài khoản hệ thống</span>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className={`form-group ${errors.identifier ? 'has-error' : ''}`}>
          <label className="form-label" htmlFor="loginIdentifier">
            Email hoặc Tên đăng nhập <span className="req">*</span>
          </label>
          <input
            type="text"
            id="loginIdentifier"
            className={`form-input ${errors.identifier ? 'is-invalid' : ''}`}
            placeholder="name@domain.com hoặc username"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: undefined }));
              if (bannerError) setBannerError(null);
            }}
          />
          {errors.identifier && <div className="error-message">{errors.identifier}</div>}
        </div>

        <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
          <label className="form-label" htmlFor="loginPassword">
            Mật khẩu <span className="req">*</span>
          </label>
          <div className="input-password-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              id="loginPassword"
              className={`form-input ${errors.password ? 'is-invalid' : ''}`}
              placeholder="Nhập mật khẩu của bạn"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                if (bannerError) setBannerError(null);
              }}
            />
            <button
              type="button"
              className="btn-toggle-eye"
              onClick={() => setShowPassword(!showPassword)}
              title="Ẩn/Hiện mật khẩu"
            >
              <svg className="icon" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
          {errors.password && <div className="error-message">{errors.password}</div>}
        </div>

        <div className="form-options" style={{ justifyContent: 'flex-end' }}>
          <Link href="/forgot-password" className="forgot-link">
            Quên mật khẩu?
          </Link>
        </div>

        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? 'Đang xác thực...' : 'Đăng nhập'}
        </button>
      </form>

      <p className="form-footer">
        Chưa có tài khoản?{' '}
        <Link href="/register" className="form-link">
          Đăng ký ngay
        </Link>
      </p>

      {/* Toast thông báo góc trái dưới */}
      <div className={`toast-notification ${toastMessage ? 'show' : ''}`}>
        <span className="toast-icon">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M3.5 8.5L6.5 11.5L12.5 4.5"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span>{toastMessage}</span>
      </div>
    </div>
  );
};
