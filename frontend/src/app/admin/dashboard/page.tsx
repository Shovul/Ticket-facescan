'use client';

import React from 'react';
import '../../../styles/admin-dashboard.css';
import { useDashboard } from '../../../hooks/useDashboard';

export default function LiveDashboardPage() {
  const {
    eventsList,
    activeEventId,
    handleEventChange,
    eventData,
    attendees,
    faceScannedAttendees,
    totalAttendees,
    checkedInCount,
    faceScannedCount,
    isLoading,
    isHistoryModalOpen,
    openHistoryModal,
    closeHistoryModal,
    historySearchKw,
    setHistorySearchKw,
    handleExportCSV
  } = useDashboard();

  if (isLoading || !eventData) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Đang tải dữ liệu sự kiện...</div>;
  }

  const capacity = eventData.totalCapacity || totalAttendees || 1; 
  const fillRate = ((checkedInCount / capacity) * 100).toFixed(1);

  const checkedInFaceFeed = faceScannedAttendees
    .filter(a => a.status === 'CheckedIn' || a.checkedInAt != null)
    .slice(0, 10);

    const getStatusBadgeInfo = (status: number | string) => {
        switch (status) {
            case 1:
            case 'Upcoming':
            return { text: 'Sắp diễn ra', className: 'status-badge-upcoming' };
            case 2:
            case 'Ongoing':
            return { text: 'Đang diễn ra', className: 'status-badge-live' };
            case 3:
            case 'Ended':
            return { text: 'Đã kết thúc', className: 'status-badge-ended' };
            case 4:
            case 'Cancelled':
            return { text: 'Đã hủy', className: 'status-badge-cancelled' };
            default:
            return { text: 'Không xác định', className: 'status-badge-default' };
        }
    };

  return (
    <>
      <header className="main-top-header">
        <div className="header-left">
          <h1 className="header-page-title">Live Dashboard Thống Kê Điểm Danh</h1>
        </div>
        <div className="event-selector-wrap">
          <span className="event-selector-label">Đang xem:</span>
          <select value={activeEventId ?? ''} onChange={handleEventChange} className="event-dropdown-select">
            {eventsList.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="main-content-scroll">
        {/* Banner Section */}
        <div className="event-banner-card">
          <div className="banner-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              {(() => {
                const badge = getStatusBadgeInfo(eventData.status);
                return (
                    <span className={`banner-status-badge ${badge.className}`}>
                    {badge.text}
                    </span>
                );
                })()}
              <span style={{ fontSize: '12px', color: 'var(--color-mint)', fontWeight: 700 }}>
                Hệ thống Kiosk đang mở cổng kết nối SignalR
              </span>
            </div>
            <h2>{eventData.title}</h2>
            <div className="banner-submeta">
              <span>Bắt đầu: {new Date(eventData.startTime).toLocaleString('vi-VN')}</span>
              <span>{eventData.location}</span>
            </div>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="kpi-event-grid">
          <div className="kpi-event-card">
            <div className="kpi-event-title">Khách đã Quét Face ID</div>
            <div className="kpi-event-value">{faceScannedCount} / {totalAttendees}</div>
            <div className="kpi-event-desc">Đã điểm danh: <strong>{checkedInCount}</strong> khách</div>
          </div>
          <div className="kpi-event-card">
            <div className="kpi-event-title">Tỷ lệ lấp đầy hiện tại</div>
            <div className="kpi-event-value" style={{ color: 'var(--color-teal)' }}>{fillRate}%</div>
            <div className="kpi-event-desc">Tự động cập nhật qua WebSocket</div>
          </div>
          <div className="kpi-event-card">
            <div className="kpi-event-title">Trạng thái Kiosk</div>
            <div className="kpi-event-value" style={{ color: 'var(--color-teal)' }}>Online</div>
            <div className="kpi-event-desc">Sẵn sàng nhận dữ liệu Face ID</div>
          </div>
          <div className="kpi-event-card">
            <div className="kpi-event-title">Tổng phát hành</div>
            <div className="kpi-event-value" style={{ color: 'var(--color-orange)' }}>{totalAttendees} vé</div>
            <div className="kpi-event-desc">Cập nhật qua Transaction Hub</div>
          </div>
        </div>

        {/* Live Feed Grid */}
        <div className="metrics-content-grid">
          <div className="panel-box">
            <div className="panel-header-sub">
              <h3>Thống kê khuôn mặt đã đăng ký</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Tổng số khách đã cập nhật dữ liệu Face ID: <strong>{faceScannedCount}</strong> / {totalAttendees}
            </p>
          </div>

          <div className="panel-box">
            <div className="panel-header-sub">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3>Nhật ký Face ID qua cổng</h3>
                <span className="live-pill">Live Feed</span>
              </div>
              <button type="button" className="btn-view-checkedin-history" onClick={openHistoryModal}>
                <span>Xem danh sách đầy đủ</span>
              </button>
            </div>

            <ul className="live-feed-list">
              {checkedInFaceFeed.length === 0 ? (
                <li style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Chưa có lượt quét Face ID nào qua cổng.
                </li>
              ) : (
                checkedInFaceFeed.map((f, i) => (
                  <li key={f.id || i} className="feed-item">
                    <div className="feed-user-meta">
                      <div className="feed-avatar" style={{ background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {f.attendeeName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="feed-name">
                          {f.attendeeName || 'Khách Vô Danh'} 
                          {f.hasFaceScan && <span style={{ marginLeft: '6px', fontSize: '11px', color: '#10b981' }}>✔ Face ID</span>}
                        </div>
                        <div className="feed-sub">{f.ticketClass} • {f.ticketCode} • {f.checkedInAt ? new Date(f.checkedInAt).toLocaleTimeString('vi-VN') : '---'}</div>
                      </div>
                    </div>
                    <span className="feed-match-badge">Vào Cổng</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Checked-In & Face Scan History Modal */}
      {isHistoryModalOpen && (
        <div className="modal-backdrop">
          <div className="history-modal-box">
            <div className="history-modal-header">
              <h3 className="history-modal-title">
                Lịch Sử Điểm Danh & Face ID — {eventData.title}
              </h3>
              <button type="button" style={{ background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer' }} onClick={closeHistoryModal}>&times;</button>
            </div>

            <div className="history-modal-toolbar">
              <input 
                type="text" 
                className="history-search-input" 
                placeholder="Tìm tên khách, mã vé..."
                value={historySearchKw}
                onChange={(e) => setHistorySearchKw(e.target.value)}
              />
              <button type="button" className="btn-view-checkedin-history" style={{ background: '#fff' }} onClick={handleExportCSV}>
                <span>Xuất danh sách đối soát (.CSV)</span>
              </button>
            </div>

            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Khách Tham Dự</th>
                    <th style={{ width: '20%' }}>Mã Thẻ Vé</th>
                    <th style={{ width: '15%' }}>Hạng Vé</th>
                    <th style={{ width: '15%' }}>Face Scan</th>
                    <th style={{ width: '15%' }}>Trạng Thái</th>
                    <th style={{ width: '10%' }}>Check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        Không có dữ liệu.
                      </td>
                    </tr>
                  ) : (
                    attendees.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ color: 'var(--color-navy)' }}>{item.attendeeName}</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.attendeeEmail}</span>
                          </div>
                        </td>
                        <td><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '11.5px', fontWeight: 700, background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>{item.ticketCode}</span></td>
                        <td><span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-navy)' }}>{item.ticketClass}</span></td>
                        <td>
                          {item.hasFaceScan || !!item.attendeeFaceData ? (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: '12px' }}>Đã quét</span>
                          ) : (
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: '12px' }}>Chưa quét</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: item.status === 'CheckedIn' ? 'var(--success)' : 'var(--color-orange)' }}>
                            {item.status}
                          </span>
                        </td>
                        <td><span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: 'var(--color-teal)' }}>
                          {item.checkedInAt ? new Date(item.checkedInAt).toLocaleTimeString('vi-VN') : '---'}
                        </span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="history-modal-footer">
              <span>Hiển thị tổng cộng {attendees.length} khách trong danh sách.</span>
              <button type="button" onClick={closeHistoryModal} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--card-border)', background: '#fff', cursor: 'pointer' }}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}