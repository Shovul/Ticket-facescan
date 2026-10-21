import React, { useState } from "react";

interface KioskExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExit: (exitCode: string) => boolean;
}

export const KioskExitModal: React.FC<KioskExitModalProps> = ({
  isOpen,
  onClose,
  onConfirmExit,
}) => {
  const [exitCode, setExitCode] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onConfirmExit(exitCode.trim());
    if (success) {
      setExitCode("");
    } else {
      alert("Mã thoát không chính xác!");
    }
  };

  return (
    <div className="exit-modal-backdrop show">
      <div className="auth-card-simple exit">
        <div className="auth-icon-badge exit">
          <svg className="icon" style={{ width: "24px", height: "24px" }} viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>
        <h3 className="auth-title">Xác Thực Thoát Kiosk</h3>
        <p className="auth-desc">Nhập mã xác thực để đóng phiên làm việc an toàn.</p>

        <form onSubmit={handleSubmit} className="auth-form-wrap">
          <input
            type="password"
            value={exitCode}
            onChange={(e) => setExitCode(e.target.value)}
            placeholder="Mã xác nhận..."
            autoFocus
            className="auth-input-field"
          />
          <button type="submit" className="btn-auth-action danger">
            <span>Xác Nhận Đóng Kiosk</span>
          </button>
        </form>

        <button type="button" onClick={onClose} className="btn-auth-cancel">
          Hủy, quay lại tiếp tục quét
        </button>
      </div>
    </div>
  );
};
