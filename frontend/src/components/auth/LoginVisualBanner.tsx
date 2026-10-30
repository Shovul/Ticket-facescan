import React from 'react';

export const LoginVisualBanner: React.FC = () => {
  return (
    <div className="visual-column">
      <div>
        <span className="badge-kicker">Cổng đăng nhập tập trung</span>
        <h1 className="hero-title">Chào mừng bạn trở lại với EventPass</h1>
        <p className="hero-desc">
          Đăng nhập để tra cứu vé cá nhân, cập nhật dữ liệu sinh trắc học hoặc truy cập trung tâm quản trị và điều phối sự kiện.
        </p>
      </div>

      <div>
        <ul className="perks-list">
          <li className="perks-item">
            <svg className="perks-icon" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Quản lý vé điện tử chính chủ với mã QR động tức thời</span>
          </li>
          <li className="perks-item">
            <svg className="perks-icon" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Đồng bộ dữ liệu nhận diện khuôn mặt siêu tốc dưới 1 giây</span>
          </li>
          <li className="perks-item">
            <svg className="perks-icon" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Hỗ trợ lưu trữ vé trên Apple Wallet và Google Wallet</span>
          </li>
        </ul>

        <div className="account-hints">
          <strong>Tài khoản thử nghiệm hệ thống (Mật khẩu: <code>123456</code>)</strong>
          Khách hàng: <code>sonha</code> hoặc <code>thaison@example.com</code><br />
          Ban tổ chức: <code>organizer_sgu</code> hoặc <code>admin</code>
        </div>
      </div>
    </div>
  );
};
