import React from 'react';

interface LoginSimulationToolbarProps {
  onFillCustomer: () => void;
  onFillOrganizer: () => void;
  onTriggerEmpty: () => void;
  onTriggerWrongPass: () => void;
  onTriggerGoogleAuth: () => void;
  onReset: () => void;
}

export const LoginSimulationToolbar: React.FC<LoginSimulationToolbarProps> = ({
  onFillCustomer,
  onFillOrganizer,
  onTriggerEmpty,
  onTriggerWrongPass,
  onTriggerGoogleAuth,
  onReset
}) => {
  return (
    <div className="sim-bar">
      <div>
        <span className="sim-title">EventPass Sandbox:</span> Thử nghiệm Đăng nhập hệ thống (UC02)
      </div>
      <div className="sim-actions">
        <button type="button" className="sim-btn" onClick={onFillCustomer}>
          Fill Khách Hàng
        </button>
        <button type="button" className="sim-btn" onClick={onFillOrganizer}>
          Fill Ban Tổ Chức
        </button>
        <button type="button" className="sim-btn" onClick={onTriggerEmpty}>
          Lỗi để trống (E1)
        </button>
        <button type="button" className="sim-btn" onClick={onTriggerWrongPass}>
          Lỗi sai pass (E2)
        </button>
        <button type="button" className="sim-btn" onClick={onTriggerGoogleAuth}>
          Google Auth (A1)
        </button>
        <button type="button" className="sim-btn" onClick={onReset}>
          Làm mới
        </button>
      </div>
    </div>
  );
};
