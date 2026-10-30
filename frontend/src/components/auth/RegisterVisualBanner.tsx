import React from 'react';
import { UserRole } from '../../types/auth';

interface RegisterVisualBannerProps {
  role: UserRole;
}

export const RegisterVisualBanner: React.FC<RegisterVisualBannerProps> = ({ role }) => {
  const isCustomer = role === 'customer';

  return (
    <div className="visual-column">
      <div>
        <span className="badge-kicker" id="sideBadge">
          {isCustomer ? 'Dành cho người tham dự' : 'Dành cho nhà tổ chức'}
        </span>
        <h1 className="hero-title" id="sideTitle">
          {isCustomer
            ? 'Vào cổng một chạm, trọn vẹn từng khoảnh khắc'
            : 'Kiểm soát hàng nghìn lượt vào cổng trong tích tắc'}
        </h1>
        <p className="hero-desc" id="sideDesc">
          {isCustomer
            ? 'Đăng ký tài khoản để giữ chỗ, nhận mã vé điện tử tức thời và trải nghiệm kiểm soát ra vào không xếp hàng bằng nhận diện khuôn mặt.'
            : 'Nền tảng phát hành vé số hóa, phân luồng Kiosk thông minh và đối soát tự động theo thời gian thực chuẩn sinh trắc học.'}
        </p>
      </div>

      <div>
        <ul className="perks-list" id="sidePerks">
          {isCustomer ? (
            <>
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
                <span>Lối vào nhận diện khuôn mặt siêu tốc dưới 1 giây</span>
              </li>
              <li className="perks-item">
                <svg className="perks-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Lưu vé nhanh vào Apple Wallet và Google Wallet</span>
              </li>
            </>
          ) : (
            <>
              <li className="perks-item">
                <svg className="perks-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Live Dashboard giám sát lưu lượng và tỷ lệ lấp đầy Realtime</span>
              </li>
              <li className="perks-item">
                <svg className="perks-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Kích hoạt trạm quét Kiosk bằng mã Secret Token độc bản</span>
              </li>
              <li className="perks-item">
                <svg className="perks-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Xuất báo cáo đối soát người tham dự và tài chính VietQR</span>
              </li>
            </>
          )}
        </ul>

        <div className="notice-box" id="sideNotice">
          {isCustomer ? (
            <>
              <strong>Lưu ý:</strong> Cung cấp ảnh chân dung rõ nét sau khi tạo tài khoản để kích hoạt làn vào tự động.
            </>
          ) : (
            <>
              <strong>Xác minh ban tổ chức:</strong> Cung cấp thông tin pháp nhân hoặc giấy ủy quyền sự kiện để mở đầy đủ tính năng thanh toán.
            </>
          )}
        </div>
      </div>
    </div>
  );
};
