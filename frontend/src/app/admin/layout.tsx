import Sidebar from '../../components/admin/Sidebar';
import { ReactNode } from 'react';
import '../../styles/admin-layout.css';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-wrapper">
      <div className="admin-topbar">
        <div>
          <span className="topbar-brand">EventPass Management:</span> Tạo & Xuất Bản Sự Kiện Trực Tiếp (Direct Publishing)
        </div>
        <div className="topbar-actions">
          <button className="btn-template">Nạp Mẫu TechDay 2026 (Free)</button>
          <button className="btn-template">Nạp Mẫu Gala Nhạc Hội (Paid)</button>
        </div>
      </div>

      <div className="admin-body">
        <Sidebar />
        <main className="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
}