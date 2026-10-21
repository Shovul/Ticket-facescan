import React, { useState } from "react";

interface KioskQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCode: (ticketCode: string) => void;
}

export const KioskQrModal: React.FC<KioskQrModalProps> = ({
  isOpen,
  onClose,
  onSubmitCode,
}) => {
  const [ticketCode, setTicketCode] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketCode.trim()) {
      onSubmitCode(ticketCode.trim());
      setTicketCode("");
    }
  };

  return (
    <div className="exit-modal-backdrop show">
      <div className="auth-card-simple">
        <div className="auth-icon-badge">
          <svg className="icon" style={{ width: "24px", height: "24px" }} viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </div>
        <h3 className="auth-title">Cứu Hộ: Nhập Mã Vé / Quét QR</h3>
        <p className="auth-desc">
          Nhập mã vé in trên thẻ hoặc giơ mã QR vào camera để đối soát cứu hộ tức thì.
        </p>

        <form onSubmit={handleSubmit} className="auth-form-wrap">
          <input
            type="text"
            value={ticketCode}
            onChange={(e) => setTicketCode(e.target.value)}
            placeholder="VD: TK-SGU-VIP-8888..."
            autoFocus
            className="auth-input-field"
          />
          <button type="submit" className="btn-auth-action">
            Xác Nhận Check-in Mã Vé
          </button>
        </form>

        <button type="button" onClick={onClose} className="btn-auth-cancel">
          Hủy, quay lại quét Face ID
        </button>
      </div>
    </div>
  );
};
