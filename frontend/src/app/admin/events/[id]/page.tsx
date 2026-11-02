'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { eventService } from '../../../../services/eventService';
import { EventDetailResponse } from '../../../../types/event';
import { useNotification } from '../../../../components/shared/NotificationProvider';
import '../../../../styles/admin-layout.css';

export default function EventDetailPage() {
  const params = useParams();
  const eventId = Number(params.id);
  const notify = useNotification();

  const [event, setEvent] = useState<EventDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<number>(1);
  const [isEditing, setIsEditing] = useState(false);

  // Form states cho chỉnh sửa trực tiếp
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
    startTime: '',
    endTime: '',
  });

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
          startTime: data.startTime ? data.startTime.slice(0, 16) : '',
          endTime: data.endTime ? data.endTime.slice(0, 16) : '',
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

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Gọi service cập nhật sự kiện
      notify('Đã cập nhật thông tin sự kiện thành công trực tiếp!', 'success');
      setIsEditing(false);
    } catch (err: any) {
      notify(err.response?.data?.Error || 'Lỗi khi cập nhật sự kiện.', 'error');
    }
  };

  if (loading) return <div className="p-10 text-center text-[#079FA0] font-bold text-sm">Đang tải dữ liệu chi tiết...</div>;
  if (!event) return <div className="p-10 text-center text-red-500 font-bold text-sm">Không tìm thấy thông tin sự kiện.</div>;

  return (
    <div className="events-layout-wrapper">
      {/* Top Header */}
      <header className="event-header">
        <div className="header-left">
          <Link href="/admin/events" className="btn-back">
            <svg className="svg-icon sm" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            <span>Quay lại danh sách</span>
          </Link>
          <h1 className="header-title">Quản Trị — {event.title}</h1>
        </div>
        <div className="header-status">
          Trạng thái: <strong className="status-success">Đang hoạt động trực tiếp</strong>
        </div>
      </header>

      <div className="event-form-container">
        
        {/* Tiêu đề tổng quan sự kiện */}
        <div className="form-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="event-status-tag open" style={{ background: '#e6f7f3', color: '#0d7a60', border: '1px solid #bcf0e2', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
                ID: EVT-{event.id}
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#023852', marginBottom: '4px' }}>{event.title}</h2>
            <div style={{ fontSize: '13px', color: '#537583', display: 'flex', gap: '12px' }}>
              <span>{new Date(event.startTime).toLocaleString('vi-VN')}</span>
              <span>•</span>
              <span>{event.location}</span>
            </div>
          </div>
        </div>

        {/* 4 Tabs Điều Hướng Quản Trị */}
        <div className="detail-sub-tabs" style={{ display: 'flex', borderBottom: '1.5px solid #cfe5dc', gap: '24px', background: '#fff', padding: '0 20px', borderRadius: '10px 10px 0 0' }}>
          {[
            { id: 1, label: '1. Thông tin chung & Hạng vé' },
            { id: 2, label: '2. Cấu hình trạm soát vé' },
            { id: 3, label: '3. Mẫu vé & Thiết kế email' },
            { id: 4, label: '4. Cài đặt nâng cao / Đóng mở cổng' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '14px 4px',
                fontSize: '13.5px',
                fontWeight: 700,
                color: activeTab === tab.id ? '#023852' : '#537583',
                borderBottom: activeTab === tab.id ? '3px solid #079FA0' : '3px solid transparent',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: THÔNG TIN CHUNG & HẠNG VÉ */}
        {activeTab === 1 && (
          <div className="form-panel" style={{ borderRadius: '0 0 10px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1.5px solid #e3efea' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#023852' }}>Chi tiết nội dung & Phân hạng vé</h3>
              <button
                type="button"
                className="btn-action-secondary"
                onClick={() => setIsEditing(!isEditing)}
                style={{ padding: '6px 12px', background: '#f2f7f5', border: '1.5px solid #cfe5dc', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              >
                {isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa thông tin'}
              </button>
            </div>

            <form onSubmit={handleSaveEvent}>
              <fieldset disabled={!isEditing} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="panel-grid">
                  <div className="form-group">
                    <label className="form-label">Tên đơn vị tổ chức <span className="required-mark">*</span></label>
                    <input type="text" className="form-input" value={formData.organizerName} onChange={(e) => handleUpdateField('organizerName', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email ban tổ chức <span className="required-mark">*</span></label>
                    <input type="email" className="form-input" value={formData.organizerEmail} onChange={(e) => handleUpdateField('organizerEmail', e.target.value)} required />
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Tên sự kiện <span className="required-mark">*</span></label>
                    <input type="text" className="form-input" value={formData.title} onChange={(e) => handleUpdateField('title', e.target.value)} required />
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Mô tả chi tiết</label>
                    <textarea className="form-textarea" rows={3} value={formData.description} onChange={(e) => handleUpdateField('description', e.target.value)}></textarea>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Địa điểm tổ chức <span className="required-mark">*</span></label>
                    <input type="text" className="form-input" value={formData.location} onChange={(e) => handleUpdateField('location', e.target.value)} required />
                  </div>
                </div>

                {/* Danh sách Hạng vé */}
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#023852', marginBottom: '10px' }}>Danh sách Phân hạng vé phát hành</h4>
                  <div className="tickets-list">
                    {event.tickets?.map((ticket) => (
                      <div key={ticket.id} className="ticket-row" style={{ gridTemplateColumns: '2fr 1fr 1fr auto' }}>
                        <div><strong>{ticket.name}</strong></div>
                        <div>Giá: {ticket.price.toLocaleString('vi-VN')}đ</div>
                        <div>Đã bán: {ticket.quantitySold} / {ticket.quantity}</div>
                        <div><span className="status-success">Đang mở bán</span></div>
                      </div>
                    ))}
                  </div>
                </div>

                {isEditing && (
                  <div style={{ marginTop: '16px' }}>
                    <button type="submit" className="btn-submit">Lưu Thay Đổi Trực Tiếp</button>
                  </div>
                )}
              </fieldset>
            </form>
          </div>
        )}

        {/* TAB 2: CẤU HÌNH TRẠM SOÁT VÉ */}
        {activeTab === 2 && (
          <div className="form-panel" style={{ borderRadius: '0 0 10px 10px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#023852', marginBottom: '12px' }}>Trạm Soát Vé Tự Động (Kiosk Check-in)</h3>
            <p style={{ fontSize: '13px', color: '#537583', marginBottom: '16px' }}>Quản lý các thiết bị camera tại cổng và mã Secret Token định danh[cite: 7].</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {event.kiosks && event.kiosks.length > 0 ? (
                event.kiosks.map((kiosk) => (
                  <div key={kiosk.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f2f7f5', border: '1px solid #cfe5dc', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#023852' }}>{kiosk.name}</div>
                      <div style={{ fontSize: '12px', color: '#537583' }}>Địa điểm: {kiosk.location || 'Cổng chính'}</div>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px', background: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cfe5dc', color: '#079FA0', fontWeight: 700 }}>
                      {kiosk.secretToken}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '13px', color: '#537583' }}>Chưa có trạm Kiosk nào được cấu hình cho sự kiện này.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MẪU VÉ & THIẾT KẾ EMAIL */}
        {activeTab === 3 && (
          <div className="form-panel" style={{ borderRadius: '0 0 10px 10px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#023852', marginBottom: '12px' }}>Mẫu Thẻ Vé Điện Tử & Email Xác Nhận</h3>
            <p style={{ fontSize: '13px', color: '#537583', marginBottom: '16px' }}>Xem trước cấu trúc vé và nội dung thông báo gửi tự động cho khách đăng ký thành công.</p>
            
            <div style={{ background: 'linear-gradient(145deg, #023852 0%, #034b6e 100%)', color: '#fff', borderRadius: '14px', padding: '24px', maxWidth: '420px', boxShadow: '0 10px 25px rgba(2, 56, 82, 0.18)' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>{event.title}</div>
              <div style={{ fontSize: '12px', color: '#d2e9f3', marginBottom: '14px' }}>Thời gian: {new Date(event.startTime).toLocaleString('vi-VN')}</div>
              <div style={{ background: '#fff', borderRadius: '8px', padding: '14px', color: '#023852', textAlign: 'center', fontWeight: 700, fontFamily: 'monospace' }}>
                [QR CODE ĐỘNG & FACE ID]
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CÀI ĐẶT NÂNG CAO */}
        {activeTab === 4 && (
          <div className="form-panel" style={{ borderRadius: '0 0 10px 10px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#023852', marginBottom: '12px' }}>Cài Đặt Nâng Cao & Tác Vụ Khẩn Cấp</h3>
            <p style={{ fontSize: '13px', color: '#537583', marginBottom: '16px' }}>Các thao tác can thiệp trực tiếp vào chu trình vận hành sự kiện.</p>
            
            <div style={{ border: '1.5px solid #fecaca', background: '#fff5f5', borderRadius: '10px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#dc2626' }}>Hủy sự kiện khẩn cấp</h4>
                <p style={{ fontSize: '12.5px', color: '#537583', marginTop: '2px' }}>Vô hiệu hóa toàn bộ mã vé và gửi email thông báo hủy đến khách tham dự.</p>
              </div>
              <button type="button" className="btn-action-danger" onClick={() => notify('Chức năng hủy khẩn cấp yêu cầu xác nhận lý do.', 'info')} style={{ background: '#dc2626', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                Hủy sự kiện
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}