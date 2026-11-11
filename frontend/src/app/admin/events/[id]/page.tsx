'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { eventService } from '../../../../services/eventService';
import { EventDetailResponse } from '../../../../types/event';
import { useNotification } from '../../../../components/shared/NotificationProvider';
import '../../../../styles/edit-event.css';

export default function EventDetailPage() {
  const params = useParams();
  const eventId = Number(params.id);
  const notify = useNotification();

  const [event, setEvent] = useState<EventDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<number>(1);
  const [isEditing, setIsEditing] = useState(false);
  const [visibleTokens, setVisibleTokens] = useState<Record<number, boolean>>({});
  const [copiedKioskId, setCopiedKioskId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    organizerName: '',
    organizerEmail: '',
    organizerHotline: '',
    organizerWebsite: '',
    organizerLegalId: '',
    title: '',
    description: '',
    location: '',
    eventSpeakers: '',
    publicTime: '',
    openTicketTime: '',
    closeTicketTime: '',
    openKioskTime: '',
    startTime: '',
    endTime: '',
    emailSubject: '',
    emailCheckinNote: '',
  });

  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const data = await eventService.getEventById(eventId);
        setEvent(data);
        setFormData({
          organizerName: data.organizerName || 'Đoàn Trường Đại học Sài Gòn',
          organizerEmail: data.organizerEmail || 'doantruong@sgu.edu.vn',
          organizerHotline: data.organizerHotline || '028.3835.4409',
          organizerWebsite: data.organizerWebsite || '',
          organizerLegalId: data.organizerLegalId || '',
          title: data.title || '',
          description: data.description || '',
          location: data.location || '',
          eventSpeakers: data.eventSpeakers || '',
          publicTime: formatDateForInput(data.publicTime),
          openTicketTime: formatDateForInput(data.openTicketTime),
          closeTicketTime: formatDateForInput(data.closeTicketTime),
          openKioskTime: formatDateForInput(data.openKioskTime),
          startTime: formatDateForInput(data.startTime),
          endTime: formatDateForInput(data.endTime),
          emailSubject: data.emailSubject || '',
          emailCheckinNote: data.emailCheckinNote || ''
        });
      } catch (err: any) {
        notify(err.response?.data?.Error || 'Không thể tải chi tiết sự kiện.', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) fetchEvent();
  }, [eventId, notify]);

  const handleUpdateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleOrCopy = async (kioskId: number, secretToken: string) => {
    if (visibleTokens[kioskId]) {
      try {
        await navigator.clipboard.writeText(secretToken);
        setCopiedKioskId(kioskId);
        notify('Đã sao chép Secret Token vào bộ nhớ tạm!', 'success');
        setTimeout(() => setCopiedKioskId(null), 2000);
      } catch {
        notify('Không thể sao chép Secret Token.', 'error');
      }
    } else {
      toggleTokenVisibility(kioskId);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await eventService.updateEvent(eventId, {
        ...formData,
        tickets: event?.tickets || [],
        kiosks: event?.kiosks || []
      });
      notify('Đã cập nhật thông tin sự kiện thành công trực tiếp!', 'success');
      setIsEditing(false);
    } catch (err: any) {
      notify(err.response?.data?.Error || 'Lỗi khi cập nhật sự kiện.', 'error');
    }
  };

  const toggleTokenVisibility = (kioskId: number) => {
    setVisibleTokens((prev) => ({
      ...prev,
      [kioskId]: !prev[kioskId],
    }));
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#079FA0', fontWeight: 'bold' }}>Đang tải dữ liệu chi tiết...</div>;
  if (!event) return <div style={{ padding: 40, textAlign: 'center', color: '#dc2626', fontWeight: 'bold' }}>Không tìm thấy thông tin sự kiện.</div>;

  return (
    <>

      <main className="app-main-wrapper">
        <header className="main-top-header">
          <div className="header-left">
            <Link href="/admin/events" className="btn-back-events">
              <svg className="icon" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              <span>Quay lại danh sách</span>
            </Link>
            <h1 className="header-page-title">Quản Trị — {event.title}</h1>
          </div>
        </header>

        <div className="main-content-scroll">
          <div className="view-container">
            {/* Header Thẻ Sự kiện */}
            <div className="event-detail-header-card">
              <div className="detail-title-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="event-status-tag open">Đang mở đăng ký</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>ID: EVT-{event.id}</span>
                </div>
                <h2>{event.title}</h2>
                <div className="detail-subline">
                  <span>{new Date(event.startTime).toLocaleString('vi-VN')}</span>
                  <span>•</span>
                  <span>{event.location}</span>
                </div>
              </div>
            </div>

            {/* Điều hướng 4 Tabs */}
            <div className="detail-sub-tabs">
              <button type="button" className={`sub-tab-item ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>
                <svg className="icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                <span>1. Thông tin chung & Hạng vé</span>
              </button>
              <button type="button" className={`sub-tab-item ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>
                <svg className="icon" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <span>2. Cấu hình trạm soát vé</span>
              </button>
              <button type="button" className={`sub-tab-item ${activeTab === 3 ? 'active' : ''}`} onClick={() => setActiveTab(3)}>
                <svg className="icon" viewBox="0 0 24 24"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>
                <span>3. Mẫu vé & Thiết kế email</span>
              </button>
              <button type="button" className={`sub-tab-item ${activeTab === 4 ? 'active' : ''}`} onClick={() => setActiveTab(4)}>
                <svg className="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <span>4. Cài đặt nâng cao / Đóng mở cổng</span>
              </button>
            </div>

            {/* TAB 1: THÔNG TIN CHUNG & HẠNG VÉ */}
            <div className={`detail-tab-content ${activeTab === 1 ? 'active' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--hairline)' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-navy)' }}>Thông tin chi tiết sự kiện</h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    Trạng thái: <strong style={{ color: 'var(--success)' }}>Dữ liệu hoạt động trực tiếp trên sàn</strong>
                  </p>
                </div>
                <button type="button" className="btn-action-secondary" onClick={() => setIsEditing(!isEditing)}>
                  <svg className="icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  <span>{isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa thông tin'}</span>
                </button>
              </div>

              <form onSubmit={handleSaveEvent}>
                <fieldset disabled={!isEditing} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* 1. THÔNG TIN BỘ PHẬN TỔ CHỨC */}
                  <div className="form-section-divider">
                    <svg className="icon" viewBox="0 0 24 24" style={{ color: 'var(--color-teal)' }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                    <span>1. Thông Tin Ban Tổ Chức & Pháp Lý Đơn Vị</span>
                  </div>

                  <div className="form-grid-layout">
                    <div className="form-field">
                      <label className="field-label">Tên cơ quan / Đơn vị tổ chức <span className="req">*</span></label>
                      <input type="text" className="form-control" value={formData.organizerName} onChange={e => handleUpdateField('organizerName', e.target.value)} required />
                    </div>
                    <div className="form-field">
                      <label className="field-label">Hòm thư điện tử chính thức <span className="req">*</span></label>
                      <input type="email" className="form-control" value={formData.organizerEmail} onChange={e => handleUpdateField('organizerEmail', e.target.value)} required />
                    </div>
                    <div className="form-field">
                      <label className="field-label">Đường dây nóng hỗ trợ khách vé <span className="req">*</span></label>
                      <input type="tel" className="form-control" value={formData.organizerHotline} onChange={e => handleUpdateField('organizerHotline', e.target.value)} required />
                    </div>
                    <div className="form-field">
                      <label className="field-label">Website / Cổng thông tin sự kiện</label>
                      <input type="url" className="form-control" value={formData.organizerWebsite} onChange={e => handleUpdateField('organizerWebsite', e.target.value)} />
                    </div>
                    <div className="form-field full">
                      <label className="field-label">Mã định danh / Quyết định thành lập</label>
                      <input type="text" className="form-control" value={formData.organizerLegalId} onChange={e => handleUpdateField('organizerLegalId', e.target.value)} />
                    </div>
                  </div>

                  {/* 2. CHUNG & HÌNH ẢNH */}
                  <div className="form-section-divider">
                    <svg className="icon" viewBox="0 0 24 24" style={{ color: 'var(--color-teal)' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    <span>2. Thông Tin Chung Sự Kiện & Hình Ảnh</span>
                  </div>

                  <div className="form-grid-layout">
                    <div className="form-field full">
                      <label className="field-label">Tên sự kiện <span className="req">*</span></label>
                      <input type="text" className="form-control" value={formData.title} onChange={e => handleUpdateField('title', e.target.value)} required />
                    </div>
                    <div className="form-field full">
                      <label className="field-label">Mô tả sự kiện & Lịch trình</label>
                      <textarea className="form-control" rows={3} value={formData.description} onChange={e => handleUpdateField('description', e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label className="field-label">Nhân vật nổi bật</label>
                      <input type="text" className="form-control" value={formData.eventSpeakers} onChange={e => handleUpdateField('eventSpeakers', e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label className="field-label">Địa điểm tổ chức <span className="req">*</span></label>
                      <input type="text" className="form-control" value={formData.location} onChange={e => handleUpdateField('location', e.target.value)} required />
                    </div>
                  </div>

                  {/* 3. THỜI GIAN */}
                  <div className="form-section-divider">
                    <svg className="icon" viewBox="0 0 24 24" style={{ color: 'var(--color-teal)' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>3. Chu Trình Thời Gian Sự Kiện (5 Mốc Tuyến Tính)</span>
                  </div>

                  <div className="form-grid-layout">
                    <div className="form-field">
                      <label className="field-label">1. Ngày công khai xuất hiện trên Web <span className="req">*</span></label>
                      <input type="datetime-local" className="form-control" value={formData.publicTime} onChange={e => handleUpdateField('publicTime', e.target.value)} required />
                    </div>
                    <div className="form-field">
                      <label className="field-label">2. Ngày chính thức mở cổng bán vé <span className="req">*</span></label>
                      <input type="datetime-local" className="form-control" value={formData.openTicketTime} onChange={e => handleUpdateField('openTicketTime', e.target.value)} required />
                    </div>
                    <div className="form-field">
                      <label className="field-label">3. Ngày đóng cổng bán vé <span className="req">*</span></label>
                      <input type="datetime-local" className="form-control" value={formData.closeTicketTime} onChange={e => handleUpdateField('closeTicketTime', e.target.value)} required />
                    </div>
                    <div className="form-field">
                      <label className="field-label">4. Thời gian bắt đầu quét Kiosk Check-in <span className="req">*</span></label>
                      <input type="datetime-local" className="form-control" value={formData.openKioskTime} onChange={e => handleUpdateField('openKioskTime', e.target.value)} required />
                    </div>
                    <div className="form-field">
                      <label className="field-label">5A. Thời gian bắt đầu sự kiện chính thức <span className="req">*</span></label>
                      <input type="datetime-local" className="form-control" value={formData.startTime} onChange={e => handleUpdateField('startTime', e.target.value)} required />
                    </div>
                    <div className="form-field">
                      <label className="field-label">5B. Thời gian bế mạc sự kiện <span className="req">*</span></label>
                      <input type="datetime-local" className="form-control" value={formData.endTime} onChange={e => handleUpdateField('endTime', e.target.value)} required />
                    </div>
                  </div>

                  {/* 4. PHÂN HẠNG VÉ */}
                  <div className="form-section-divider">
                    <svg className="icon" viewBox="0 0 24 24" style={{ color: 'var(--color-teal)' }}><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>
                    <span>4. Danh Sách Phân Hạng Vé & Slot Phát Hành</span>
                  </div>

                  <div className="form-field full">
                    {event.tickets?.map((ticket) => (
                      <div key={ticket.id} className="ticket-tier-row">
                        <div className="ticket-tier-info">
                          <h4>
                            <span>{ticket.name}</span>
                            <span className="tier-badge-status active">Đang mở bán</span>
                          </h4>
                          <p>Giá: <strong>{ticket.price === 0 ? 'Miễn phí' : `${ticket.price.toLocaleString('vi-VN')} đ`}</strong> • Đã đăng ký: <strong>{ticket.quantitySold}</strong> / Tổng slot: <strong>{ticket.quantity}</strong> • Còn {Math.max(0, ticket.quantity - ticket.quantitySold)} chỗ • {ticket.description}</p>
                        </div>
                        <div style={{ display: isEditing ? 'flex' : 'none', alignItems: 'center', gap: '8px' }}>
                          <button type="button" className="btn-action-secondary" style={{ padding: '5px 12px', fontSize: '12px' }}>+ Thêm slot</button>
                          <button type="button" className="btn-action-danger" style={{ padding: '5px 12px', fontSize: '12px', background: '#fff', color: '#dc2626' }}>Khóa / Ngừng bán</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {isEditing && (
                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--hairline)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button type="submit" className="btn-action-primary">
                          <svg className="icon" viewBox="0 0 24 24" style={{ width: 15, height: 15 }}><polyline points="20 6 9 17 4 12"/></svg>
                          <span>Lưu Thay Đổi Trực Tiếp</span>
                        </button>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Các thay đổi sẽ được công khai ngay trên nền tảng.</span>
                      </div>
                    </div>
                  )}
                </fieldset>
              </form>
            </div>

            {/* TAB 2: TRẠM SOÁT VÉ */}
            <div className={`detail-tab-content ${activeTab === 2 ? 'active' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-navy)' }}>Trạm Soát Vé Tự Động (Làn Kiosk Điểm Danh)</h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>Quản lý định danh các thiết bị Kiosk camera tại cổng vào sự kiện</p>
                </div>
                <button type="button" className="btn-action-primary">
                  <svg className="icon" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span>Thêm trạm mới</span>
                </button>
              </div>

              <table className="station-list-table">
                <thead>
                  <tr>
                    <th style={{ width: '45%' }}>Tên trạm / Làn kiểm soát</th>
                    <th style={{ width: '35%' }}>Secret Token (Định danh trạm)</th>
                    <th style={{ textAlign: 'right', width: '20%' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {event.kiosks?.map((kiosk) => (
                    <tr key={kiosk.id}>
                      <td><strong>{kiosk.name}</strong><br/><span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{kiosk.location || 'Cổng chính'}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {visibleTokens[kiosk.id] ? (
                            <span onClick={() => handleToggleOrCopy(kiosk.id, kiosk.secretToken)} className="token-masked" style={{ fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer' }}>{kiosk.secretToken}</span>
                          ) : (
                            <span className="token-masked">••••••••••••••••</span>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleTokenVisibility(kiosk.id)}
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              color: 'var(--color-teal)',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: '4px 8px',
                              minWidth: '50px',
                              borderRadius: '4px'
                            }}
                          >
                            {visibleTokens[kiosk.id] ? 'Ẩn' : 'Hiển thị'}
                          </button>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button type="button" className="btn-action-secondary" style={{ padding: '4px 10px', fontSize: '11.5px' }}>Cài đặt / Đổi tên</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TAB 3: MẪU VÉ SỐ & THIẾT KẾ EMAIL */}
            <div className={`detail-tab-content ${activeTab === 3 ? 'active' : ''}`}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '6px' }}>Xem trước Thẻ Vé Điện Tử (Digital Pass)</h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '18px' }}>
                    Vé điện tử được tự động sinh sau khi khách đăng ký thành công, tích hợp mã QR động định danh và thông báo làn vào cửa.
                  </p>

                  <div className="form-field full" style={{ marginBottom: '14px' }}>
                    <label className="field-label">Tiêu đề email xác nhận</label>
                    <input type="text" className="form-control" value={formData.emailSubject} onChange={e => handleUpdateField('emailSubject', e.target.value)} />
                  </div>
                  <div className="form-field full" style={{ marginBottom: '14px' }}>
                    <label className="field-label">Ghi chú hướng dẫn check-in trong email</label>
                    <textarea className="form-control" rows={3} value={formData.emailCheckinNote} onChange={e => handleUpdateField('emailCheckinNote', e.target.value)} />
                  </div>
                  <button type="button" className="btn-action-primary" onClick={() => notify('Đã cập nhật mẫu vé và thiết kế email.', 'success')}>Cập nhật thiết kế vé</button>
                </div>

                <div style={{ background: 'linear-gradient(145deg, var(--color-navy) 0%, #034b6e 100%)', color: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 12px 30px rgba(2, 56, 82, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '14px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-mint)', fontWeight: 800 }}>Đơn vị tổ chức</div>
                        <div style={{ fontSize: '13px', fontWeight: 700 }}>{formData.organizerName || 'Đơn vị tổ chức'}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: '10px', fontWeight: 800 }}>VIP PASS</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800 }}>{formData.title || 'Tên sự kiện'}</div>
                    <div style={{ fontSize: '12px', color: '#d2e9f3' }}>Người tham dự: <strong>Hà Thái Sơn</strong></div>
                    <div style={{ fontSize: '12px', color: '#d2e9f3' }}>Thời gian: {formData.startTime.replace('T', ' • ')}</div>
                    <div style={{ fontSize: '12px', color: '#d2e9f3' }}>Cổng vào: {formData.location} (Làn Face ID)</div>
                  </div>

                  <div style={{ background: '#fff', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '110px', height: '110px', border: '2px dashed #023852', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                      <svg className="icon" viewBox="0 0 24 24" style={{ width: 60, height: 60, color: '#023852' }}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#023852', fontFamily: 'monospace' }}>PASS-789-VIP-DEMO</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TAB 4: CÀI ĐẶT NÂNG CAO */}
            <div className={`detail-tab-content ${activeTab === 4 ? 'active' : ''}`}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '4px' }}>Điều Phối Cổng & Giới Hạn Sự Kiện</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>Các thao tác can thiệp trực tiếp vào chu trình phát hành vé và mở cổng soát vé</p>

              <div style={{ border: '1.5px solid var(--card-border)', background: '#fff', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--hairline)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>Đóng đăng ký vé sớm</h4>
                      <span className="event-status-tag open" style={{ marginLeft: '8px' }}>Đang mở đăng ký</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>Khóa cổng đăng ký của người dùng dù vẫn còn số lượng vé trống.</p>
                  </div>
                  <button type="button" className="btn-action-danger" style={{ background: '#fff', color: 'var(--danger)' }}>Đóng đăng ký</button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--danger)', margin: 0 }}>Hủy sự kiện khẩn cấp</h4>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>Vô hiệu hóa toàn bộ mã vé và gửi email thông báo hủy ngay lập tức đến khách tham dự.</p>
                  </div>
                  <button type="button" className="btn-action-danger" onClick={() => notify('Hành động yêu cầu xác nhận.', 'info')}>Xác nhận hủy sự kiện này</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </>
  );
}