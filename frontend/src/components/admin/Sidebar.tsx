"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import '../../styles/admin-sidebar.css';

export default function Sidebar() {
  const pathname = usePathname();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navItems = [
    { 
      name: 'Tổng quan', 
      href: '/admin/dashboard', 
      icon: <svg className="w-[18px] h-[18px] shrink-0 stroke-current fill-none stroke-[1.8]" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg> 
    },
    { 
      name: 'Quản lý sự kiện', 
      href: '/admin/events/create', 
      icon: <svg className="w-[18px] h-[18px] shrink-0 stroke-current fill-none stroke-[1.8]" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> 
    },
    { 
      name: 'Danh sách tham dự', 
      href: '/admin/attendees', 
      icon: <svg className="w-[18px] h-[18px] shrink-0 stroke-current fill-none stroke-[1.8]" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> 
    },
    { 
      name: 'Lịch sử tài chính', 
      href: '/admin/finance', 
      icon: <svg className="w-[18px] h-[18px] shrink-0 stroke-current fill-none stroke-[1.8]" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> 
    },
  ];

  return (
    <>
      <aside className="admin-sidebar">
        <div>
          <div className="sidebar-header">
            <Link href="/admin" className="brand-link">
              EventPass
              <span className="brand-tag">ADMIN</span>
              <span className="brand-dot"></span>
            </Link>
          </div>

          <div className="sidebar-nav-section">
            <div className="nav-heading">Hệ Thống Quản Trị</div>
            <ul className="nav-list">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link 
                    href={item.href} 
                    className={`nav-item-link ${pathname === item.href ? 'active' : ''}`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <img 
              src="https://media.istockphoto.com/id/2149922267/vector/user-icon.jpg?s=612x612&w=0&k=20&c=i6jYPfB1pWjK8pll6YRxAK9fgBmf65-w5wbKH9R1dyQ=" 
              className="user-avatar" 
              alt="Admin" 
            />
            <div className="user-info">
              <span className="user-name">Quản trị viên</span>
              <span className="user-email">admin@eventpass.vn</span>
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn-icon">
              <svg className="w-[15px] h-[15px] shrink-0 stroke-current fill-none stroke-[1.8]" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </button>
            <button onClick={() => setShowLogoutModal(true)} className="btn-icon danger">
              <svg className="w-[15px] h-[15px] shrink-0 stroke-current fill-none stroke-[1.8]" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Xác Nhận Đăng Xuất</h3>
            <p className="modal-desc">Bạn có chắc chắn muốn kết thúc phiên làm việc của Quản trị viên?</p>
            <div className="modal-actions">
              <button onClick={() => setShowLogoutModal(false)} className="btn-cancel">Hủy</button>
              <button className="btn-confirm">Đăng Xuất Ngay</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}