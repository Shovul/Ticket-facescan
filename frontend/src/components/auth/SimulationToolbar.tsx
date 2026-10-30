import React from 'react';
import { UserRole } from '../../types/auth';

interface SimulationToolbarProps {
  onFillCustomer: () => void;
  onFillOrganizer: () => void;
  onTriggerE1: () => void;
  onTriggerE2: () => void;
  onTriggerGoogleAuth: () => void;
  onReset: () => void;
}

export const SimulationToolbar: React.FC<SimulationToolbarProps> = ({
  onFillCustomer,
  onFillOrganizer,
  onTriggerE1,
  onTriggerE2,
  onTriggerGoogleAuth,
  onReset,
}) => {
  return (
    <div className="sim-bar">
      <div>
        <span className="sim-title">EventPass UC01 Sandbox:</span> Thử nghiệm Đăng ký theo Luồng Nghiệp vụ
      </div>
      <div className="sim-actions">
        <button type="button" className="sim-btn" onClick={onFillCustomer}>
          Fill Khách Hàng
        </button>
        <button type="button" className="sim-btn" onClick={onFillOrganizer}>
          Fill Ban Tổ Chức
        </button>
        <button type="button" className="sim-btn" onClick={onTriggerE1}>
          Lỗi Trống/Format (E1)
        </button>
        <button type="button" className="sim-btn" onClick={onTriggerE2}>
          Lỗi Trùng Email (E2)
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
