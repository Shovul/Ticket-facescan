import React from 'react';

export const RegisterVisualBanner: React.FC = () => {
  return (
    <div className="visual-column">
      <div>
        <span className="badge-kicker" id="sideBadge">
          Dành cho thành viên tham dự
        </span>
        <h1 className="hero-title" id="sideTitle">
          Vào cổng một chạm, trọn vẹn từng khoảnh khắc
        </h1>
        <p className="hero-desc" id="sideDesc">
          Đăng ký tài khoản cá nhân để giữ chỗ, nhận mã vé điện tử tức thời và trải nghiệm kiểm soát ra vào không xếp hàng bằng nhận diện khuôn mặt siêu tốc.
        </p>
      </div>

      <div>
        <ul className="perks-list" id="sidePerks">
          <li className="perks-item">
            <svg className="perks-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Quản lý vé điện tử chính chủ, tích hợp mã QR động</span>
          </li>
          <li className="perks-item">
            <svg className="perks-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Lối vào nhận diện khuôn mặt siêu tốc dưới 1 giây qua trạm Kiosk</span>
          </li>
          <li className="perks-item">
            <svg className="perks-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Lưu vé nhanh vào Apple Wallet và Google Wallet</span>
          </li>
        </ul>

        <div className="notice-box" id="sideNotice">
          <strong>Lưu ý:</strong> Cung cấp ảnh chân dung rõ nét sau khi tạo tài khoản để kích hoạt làn vào tự động.
        </div>
      </div>
    </div>
  );
};
