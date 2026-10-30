'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserRole, RegisterRequest, RegisterFormErrors } from '../../types/auth';
import { authApi } from '../../services/authApi';
import { GoogleAuthButton } from './GoogleAuthButton';
import { RegisterVisualBanner } from './RegisterVisualBanner';
import { SimulationToolbar } from './SimulationToolbar';

export const RegisterForm: React.FC = () => {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('customer');
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
      errs.fullName = role === 'customer' ? 'Vui lòng nhập họ và tên của bạn' : 'Vui lòng nhập tên công ty / đơn vị tổ chức';
    } else if (fullName.trim().length < 2 || fullName.trim().length > 100) {
      errs.fullName = 'Họ và tên phải có độ dài từ 2 đến 100 ký tự';
    }

    if (!username.trim()) {
      errs.username = 'Tên đăng nhập không được để trống';
    } else if (username.trim().length < 3 || username.trim().length > 50) {
      errs.username = 'Tên đăng nhập từ 3 đến 50 ký tự';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      errs.username = 'Tên đăng nhập chỉ gồm chữ cái, số và dấu gạch dưới';
    }

    if (!phone.trim()) {
      errs.phoneNumber = 'Số điện thoại liên hệ là bắt buộc';
    } else if (!/^(0[3|5|7|8|9])[0-9]{8}$/.test(phone.trim())) {
      errs.phoneNumber = 'Số điện thoại phải gồm 10 chữ số chuẩn Việt Nam (03, 05, 07, 08, 09)';
    }

    if (!email.trim()) {
      errs.email = 'Địa chỉ email không được để trống';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Email không đúng định dạng thư điện tử';
    }

    if (!password) {
      errs.password = 'Mật khẩu không được để trống';
    } else if (password.length < 6) {
      errs.password = 'Mật khẩu phải từ 6 ký tự trở lên (BR02)';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (password !== confirmPassword) {
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
        // Xử lý lỗi trả về từ Backend (ví dụ trùng email hoặc username - E2)
        const errMsg = result.message || 'Đăng ký không thành công. Vui lòng thử lại.';
        showToast(errMsg, true);

        if (errMsg.toLowerCase().includes('email')) {
          setErrors((prev) => ({ ...prev, email: errMsg }));
        } else if (errMsg.toLowerCase().includes('tên đăng nhập') || errMsg.toLowerCase().includes('username')) {
          setErrors((prev) => ({ ...prev, username: errMsg }));
        }
      }
    } catch (err: any) {
      showToast('Đã xảy ra sự cố kết nối máy chủ. Vui lòng thử lại sau ít phút.', true);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    showToast('Đang kết nối xác thực Google OAuth 2.0 (A1)...');
    // Luồng test mẫu Google OAuth gọi endpoint backend
    try {
      const dummyGoogleToken = 'google_test_token_oauth2';
      const result = await authApi.googleLogin({ idToken: dummyGoogleToken });
      if (result.success) {
        showToast('Đăng nhập nhanh Google thành công! Đang chuyển hướng...');
        setTimeout(() => router.push('/events'), 1500);
      } else {
        showToast(result.message || 'Google Auth thất bại trong môi trường thử nghiệm.', true);
      }
    } catch {
      showToast('Không thể kết nối đến cổng Google Identity Service.', true);
    }
  };

  // Các phương thức Sandbox / Simulation
  const handleSimFillCustomer = () => {
    setRole('customer');
    const rand = Math.floor(Math.random() * 900) + 100;
    setFullName('Nguyễn Văn Khách ' + rand);
    setUsername('khachhang_' + rand);
    setPhone('0912345' + rand);
    setEmail(`customer${rand}@eventpass.vn`);
    setPassword('Khach@123');
    setConfirmPassword('Khach@123');
    setErrors({});
    showToast('Đã nạp dữ liệu mẫu Khách hàng!');
  };

  const handleSimFillOrganizer = () => {
    setRole('organizer');
    const rand = Math.floor(Math.random() * 900) + 100;
    setFullName('Đoàn Trường ĐH Sài Gòn ' + rand);
    setUsername('btc_sgu_' + rand);
    setPhone('0988776' + rand);
    setEmail(`organizer${rand}@sgu.edu.vn`);
    setPassword('Btc@123456');
    setConfirmPassword('Btc@123456');
    setErrors({});
    showToast('Đã nạp dữ liệu mẫu Ban Tổ Chức!');
  };

  const handleSimTriggerE1 = () => {
    setFullName('');
    setUsername('ab');
    setPhone('0123');
    setEmail('sai-dinh-dang-email');
    setPassword('123');
    setConfirmPassword('999');
    validateForm();
    showToast('Đã mô phỏng lỗi dữ liệu không hợp lệ (E1).', true);
  };

  const handleSimTriggerE2 = () => {
    setFullName('Trùng Email Test');
    setUsername('user_duplicate');
    setPhone('0912345678');
    setEmail('customer@eventpass.local'); // Email đã seed sẵn trong DB
    setPassword('Pass@123');
    setConfirmPassword('Pass@123');
    setErrors({});
    showToast('Đã điền email customer@eventpass.local sẵn có để test lỗi E2!');
  };

  const handleResetForm = () => {
    setFullName('');
    setUsername('');
    setPhone('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setErrors({});
    showToast('Đã làm mới form!');
  };

  return (
    <div className="auth-page-container">
      {/* Simulation Toolbar */}
      <SimulationToolbar
        onFillCustomer={handleSimFillCustomer}
        onFillOrganizer={handleSimFillOrganizer}
        onTriggerE1={handleSimTriggerE1}
        onTriggerE2={handleSimTriggerE2}
        onTriggerGoogleAuth={handleGoogleAuth}
        onReset={handleResetForm}
      />

      {/* Top Banner */}
      <div className="auth-top-bar">
        <span>Cổng phát hành vé điện tử và Điểm danh nhận diện khuôn mặt</span>
        <span>
          Hệ thống sự kiện thông minh <strong>EventPass</strong>
        </span>
      </div>

      {/* Header */}
      <header className="auth-header">
        <Link href="/" className="auth-brand">
          EventPass<span className="pass-tag">TICKET</span>
          <span className="accent-dot"></span>
        </Link>
      </header>

      {/* Main Form Content */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="register-card">
          {/* CỘT TRÁI: Visual Hero */}
          <RegisterVisualBanner role={role} />

          {/* CỘT PHẢI: Form đăng ký */}
          <div className="form-column">
            <div className="form-header">
              <h2 className="form-title">Tạo tài khoản mới</h2>
              <p className="form-subtitle">Lựa chọn loại đối tượng tài khoản để bắt đầu sử dụng</p>
            </div>

            {/* Segmented Control chọn vai trò */}
            <div className="role-segmented">
              <button
                type="button"
                className={`role-btn ${role === 'customer' ? 'active' : ''}`}
                onClick={() => setRole('customer')}
              >
                Khách hàng / Người tham dự
              </button>
              <button
                type="button"
                className={`role-btn ${role === 'organizer' ? 'active' : ''}`}
                onClick={() => setRole('organizer')}
              >
                Ban tổ chức sự kiện
              </button>
            </div>

            {/* Nút Đăng ký nhanh bằng Google */}
            <GoogleAuthButton onGoogleClick={handleGoogleAuth} disabled={loading} />

            <div className="divider">hoặc nhập thông tin chi tiết</div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>
              <div className="input-grid">
                {/* Họ tên */}
                <div className={`form-group full-width ${errors.fullName ? 'has-error' : ''}`}>
                  <label className="form-label" htmlFor="fullName">
                    <span>
                      {role === 'customer' ? 'Họ và tên người tham dự' : 'Tên cơ quan / Đơn vị tổ chức'}
                      <span className="req">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    className={`form-input ${errors.fullName ? 'is-invalid' : ''}`}
                    placeholder={role === 'customer' ? 'Nguyễn Văn A' : 'Đoàn Trường ĐH Sài Gòn'}
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
                    placeholder="username"
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
                      Số điện thoại liên hệ <span className="req">*</span>
                    </span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    className={`form-input ${errors.phoneNumber ? 'is-invalid' : ''}`}
                    placeholder="09xx xxx xxx"
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
                    placeholder="name@domain.com"
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

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading
                  ? 'Đang kết nối xử lý...'
                  : role === 'customer'
                  ? 'Hoàn tất đăng ký Khách hàng'
                  : 'Hoàn tất đăng ký Ban tổ chức'}
              </button>
            </form>

            <div className="form-footer">
              Đã có tài khoản?
              <Link href="/login">Đăng nhập ngay</Link>
            </div>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      <div className={`auth-toast ${toast.show ? 'show' : ''} ${toast.isError ? 'error' : ''}`}>
        <span>{toast.message}</span>
      </div>
    </div>
  );
};
