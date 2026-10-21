import React, { useState } from "react";

interface KioskLockModalProps {
  onUnlock: (code: string) => Promise<boolean>;
}

export const KioskLockModal: React.FC<KioskLockModalProps> = ({ onUnlock }) => {
  const [lockCode, setLockCode] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockCode.trim()) return;
    setIsLoading(true);
    const success = await onUnlock(lockCode.trim());
    setIsLoading(false);
    if (!success) {
      setHasError(true);
      setTimeout(() => setHasError(false), 2000);
    }
  };

  return (
    <div className="kiosk-lock-screen">
      <div className="auth-card-simple">
        <div className="auth-icon-badge">
          <svg className="icon" style={{ width: "24px", height: "24px" }} viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className="auth-title">Khởi Động Làn Soát Vé Kiosk</h2>
        <p className="auth-desc">
          Nhập mã khóa bảo mật <strong>X-Kiosk-Secret-Key</strong> (BR-005) do Ban Tổ Chức cấp để kích hoạt trạm.
        </p>

        <form onSubmit={handleSubmit} className="auth-form-wrap">
          <input
            type="password"
            value={lockCode}
            onChange={(e) => setLockCode(e.target.value)}
            placeholder="Nhập X-Kiosk-Secret-Key..."
            autoFocus
            className={`auth-input-field ${hasError ? "error" : ""}`}
          />
          {hasError && (
            <p style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", marginBottom: "4px" }}>
              Mã bảo mật không đúng hoặc trạm chưa được cấp phép trong hệ thống!
            </p>
          )}
          <button type="submit" disabled={isLoading} className="btn-auth-action">
            <span>{isLoading ? "Đang Xác Thực Khóa..." : "Kích Hoạt Làn Kiểm Soát"}</span>
            <svg className="icon" viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </form>
        <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "12px" }}>
          Mã mẫu trong DB: <code style={{ background: "#011522", padding: "2px 6px", borderRadius: "4px", color: "var(--color-mint)" }}>stk_sgu_2026</code> hoặc <code style={{ background: "#011522", padding: "2px 6px", borderRadius: "4px", color: "var(--color-mint)" }}>2026</code>
        </div>
      </div>
    </div>
  );
};
