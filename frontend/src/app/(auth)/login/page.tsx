'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../../../styles/auth.css';
import { LoginForm } from '../../../components/auth/LoginForm';
import { LoginVisualBanner } from '../../../components/auth/LoginVisualBanner';
import { LoginFormErrors } from '../../../types/auth';
import { authApi } from '../../../services/authApi';
import { GoogleAuthProviderWrapper } from '../../../components/auth/GoogleAuthProviderWrapper';

function LoginPageContent() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Nhận IdToken hoặc AccessToken từ popup Google thật
  const handleGoogleSuccessToken = async (idToken: string) => {
    setBannerError(null);
    try {
      const res = await authApi.googleLogin({ idToken });
      if (res.success && res.data) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', res.data.accessToken);
          localStorage.setItem('access_token', res.data.accessToken);
          localStorage.setItem('refreshToken', res.data.refreshToken);
          localStorage.setItem('user', JSON.stringify(res.data));
          window.dispatchEvent(new Event('auth-state-change'));
        }

        const role = res.data.role?.toLowerCase() || '';
        if (role === 'admin' || role === 'organizer') {
          router.push('/admin/events');
        } else {
          router.push('/events');
        }
      } else {
        setBannerError(res.message || 'Xác thực Google không thành công.');
      }
    } catch {
      setBannerError('Lỗi kết nối máy chủ khi đăng nhập Google.');
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
          EventPass<span className="pass-tag">TICKET</span><span className="accent-dot"></span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="main-wrapper">
        <div className="login-card">
          {/* Cột trái */}
          <LoginVisualBanner />

          {/* Cột phải */}
          <LoginForm
            identifier={identifier}
            setIdentifier={setIdentifier}
            password={password}
            setPassword={setPassword}
            errors={errors}
            setErrors={setErrors}
            bannerError={bannerError}
            setBannerError={setBannerError}
            onGoogleSuccessToken={handleGoogleSuccessToken}
          />
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <GoogleAuthProviderWrapper>
      <LoginPageContent />
    </GoogleAuthProviderWrapper>
  );
}
