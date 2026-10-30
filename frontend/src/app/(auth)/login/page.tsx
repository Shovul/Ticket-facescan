'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../../../styles/auth.css';
import { LoginForm } from '../../../components/auth/LoginForm';
import { LoginVisualBanner } from '../../../components/auth/LoginVisualBanner';
import { LoginSimulationToolbar } from '../../../components/auth/LoginSimulationToolbar';
import { LoginFormErrors } from '../../../types/auth';
import { authApi } from '../../../services/authApi';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Simulation test cases
  const handleFillCustomer = () => {
    setErrors({});
    setBannerError(null);
    setIdentifier('thaison@example.com');
    setPassword('123456');
  };

  const handleFillOrganizer = () => {
    setErrors({});
    setBannerError(null);
    setIdentifier('organizer_sgu');
    setPassword('123456');
  };

  const handleTriggerEmpty = () => {
    setIdentifier('');
    setPassword('');
    setErrors({
      identifier: 'Vui lòng nhập Email hoặc Tên đăng nhập.',
      password: 'Mật khẩu không được để trống.',
    });
  };

  const handleTriggerWrongPass = () => {
    setErrors({});
    setIdentifier('thaison@example.com');
    setPassword('MatKhauSai999@');
    setBannerError('Tên đăng nhập hoặc mật khẩu không chính xác.');
  };

  const handleGoogleAuth = async () => {
    setBannerError(null);
    try {
      // Giả lập IdToken Google hợp lệ gửi về Backend
      const res = await authApi.googleLogin({
        idToken: 'simulated_google_token_123456',
      });
      if (res.success && res.data) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', res.data.accessToken);
          localStorage.setItem('refreshToken', res.data.refreshToken);
          localStorage.setItem('user', JSON.stringify(res.data));
        }
        router.push('/events');
      } else {
        setBannerError(res.message || 'Xác thực Google không thành công.');
      }
    } catch {
      setBannerError('Lỗi kết nối xác thực Google.');
    }
  };

  const handleReset = () => {
    setIdentifier('');
    setPassword('');
    setRememberMe(false);
    setErrors({});
    setBannerError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)]">
      {/* Simulation Toolbar */}
      <LoginSimulationToolbar
        onFillCustomer={handleFillCustomer}
        onFillOrganizer={handleFillOrganizer}
        onTriggerEmpty={handleTriggerEmpty}
        onTriggerWrongPass={handleTriggerWrongPass}
        onTriggerGoogleAuth={handleGoogleAuth}
        onReset={handleReset}
      />

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
        <div className="login-card">
          {/* Cột trái: Giới thiệu & Điểm nhấn */}
          <LoginVisualBanner />

          {/* Cột phải: Form đăng nhập kết nối API */}
          <LoginForm
            identifier={identifier}
            setIdentifier={setIdentifier}
            password={password}
            setPassword={setPassword}
            rememberMe={rememberMe}
            setRememberMe={setRememberMe}
            errors={errors}
            setErrors={setErrors}
            bannerError={bannerError}
            setBannerError={setBannerError}
            onGoogleAuth={handleGoogleAuth}
          />
        </div>
      </main>
    </div>
  );
}
