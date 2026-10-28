'use client';

import React from 'react';
import Link from 'next/link';
import { useCreateEvent } from '../../../../hooks/useCreateEvent';
import '../../../../styles/admin-layout.css';

export default function CreateEventForm() {
  const {
    formData, loading, error, updateField,
    addTicket, updateTicket, removeTicket,
    addKiosk, updateKiosk, removeKiosk, submitForm
  } = useCreateEvent();

  return (
    <>
      <header className="event-header">
        <div className="header-left">
          <Link href="/admin/events" className="btn-back">
            <svg className="svg-icon sm" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            <span>Quay lại sự kiện</span>
          </Link>
          <h1 className="header-title">Khởi Tạo & Xuất Bản Sự Kiện Mới</h1>
        </div>
        <div className="header-status">
          Hình thức phát hành: <strong className="status-success">Công Khai Trực Tiếp (Publish Directly)</strong>
        </div>
      </header>

      <div className="event-form-container">
        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={submitForm} className="event-form">
          
          <section className="form-panel">
            <div className="panel-header">
              <h2 className="panel-title">
                <svg className="svg-icon md icon-teal" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                1. Thông Tin Ban Tổ Chức & Pháp Lý Đơn Vị
              </h2>
            </div>
            
            <div className="panel-grid">
              <div className="form-group">
                <label className="form-label">Tên cơ quan / Đơn vị tổ chức <span className="required-mark">*</span></label>
                <input type="text" required value={formData.organizerName} onChange={(e) => updateField('organizerName', e.target.value)}
                  className="form-input" placeholder="Ví dụ: Đoàn Trường Đại học Sài Gòn" />
              </div>
              <div className="form-group">
                <label className="form-label">Hòm thư điện tử chính thức <span className="required-mark">*</span></label>
                <input type="email" required value={formData.organizerEmail} onChange={(e) => updateField('organizerEmail', e.target.value)}
                  className="form-input" placeholder="doantruong@sgu.edu.vn" />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Đường dây nóng <span className="required-mark">*</span></label>
                <input type="tel" required value={formData.organizerHotline} onChange={(e) => updateField('organizerHotline', e.target.value)}
                  className="form-input" placeholder="028.3835.4409" />
              </div>
            </div>
          </section>

          <section className="form-panel">
            <div className="panel-header">
              <h2 className="panel-title">
                <svg className="svg-icon md icon-teal" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                2. Thông Tin Chung Sự Kiện
              </h2>
            </div>
            
            <div className="panel-grid">
              <div className="form-group full-width">
                <label className="form-label">Tên sự kiện <span className="required-mark">*</span></label>
                <input type="text" required value={formData.title} onChange={(e) => updateField('title', e.target.value)}
                  className="form-input" placeholder="Ví dụ: Ngày Hội Công Nghệ SGU TechDay 2026" />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Mô tả sự kiện <span className="required-mark">*</span></label>
                <textarea required rows={3} value={formData.description} onChange={(e) => updateField('description', e.target.value)}
                  className="form-textarea" placeholder="Mô tả nội dung chương trình..."></textarea>
              </div>
              <div className="form-group full-width">
                <label className="form-label">Địa điểm tổ chức thực tế <span className="required-mark">*</span></label>
                <input type="text" required value={formData.location} onChange={(e) => updateField('location', e.target.value)}
                  className="form-input" placeholder="Ví dụ: Hội trường A - Cơ sở chính SGU" />
              </div>
            </div>
          </section>

          <section className="form-panel">
            <div className="panel-header">
              <h2 className="panel-title">
                <svg className="svg-icon md icon-teal" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                3. Chu Trình Thời Gian Sự Kiện (5 Mốc)
              </h2>
            </div>
            
            <div className="panel-grid">
              <div className="form-group">
                <label className="form-label">1. CÔNG KHAI WEB <span className="required-mark">*</span></label>
                <input type="datetime-local" required value={formData.publicTime} onChange={(e) => updateField('publicTime', e.target.value)}
                  className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">2. MỞ BÁN VÉ <span className="required-mark">*</span></label>
                <input type="datetime-local" required value={formData.openTicketTime} onChange={(e) => updateField('openTicketTime', e.target.value)}
                  className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">3. ĐÓNG BÁN VÉ <span className="required-mark">*</span></label>
                <input type="datetime-local" required value={formData.closeTicketTime} onChange={(e) => updateField('closeTicketTime', e.target.value)}
                  className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">4. MỞ QUÉT KIOSK CHECK-IN <span className="required-mark">*</span></label>
                <input type="datetime-local" required value={formData.openKioskTime} onChange={(e) => updateField('openKioskTime', e.target.value)}
                  className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">5A. BẮT ĐẦU SỰ KIỆN <span className="required-mark">*</span></label>
                <input type="datetime-local" required value={formData.startTime} onChange={(e) => updateField('startTime', e.target.value)}
                  className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">5B. BẾ MẠC SỰ KIỆN <span className="required-mark">*</span></label>
                <input type="datetime-local" required value={formData.endTime} onChange={(e) => updateField('endTime', e.target.value)}
                  className="form-input" />
              </div>
            </div>
          </section>

          <section className="form-panel">
            <div className="panel-header">
              <h2 className="panel-title">
                <svg className="svg-icon md icon-teal" viewBox="0 0 24 24"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>
                4. Phân Hạng Vé Phát Hành
              </h2>
            </div>
            
            <div className="tickets-list">
              {formData.tickets.map((ticket, index) => (
                <div key={index} className="ticket-row">
                  <div className="form-group">
                    <label className="form-label">Tên hạng vé</label>
                    <input type="text" required value={ticket.name} onChange={(e) => updateTicket(index, 'name', e.target.value)} className="form-input" placeholder="Vé VIP" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Giá (VNĐ)</label>
                    <input type="number" min="0" step="10000" required value={ticket.price} onChange={(e) => updateTicket(index, 'price', Number(e.target.value))} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số Slot</label>
                    <input type="number" min="1" required value={ticket.quantity} onChange={(e) => updateTicket(index, 'quantity', Number(e.target.value))} className="form-input" />
                  </div>
                  <div className="ticket-actions">
                    <button type="button" onClick={() => removeTicket(index)} className="btn-remove-ticket" title="Xóa vé">
                      <span className="btn-remove-text">Xóa vé này</span>
                      <svg className="svg-icon md block-md" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <button type="button" onClick={addTicket} className="btn-add-ticket">
              <svg className="svg-icon md" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>+ Thêm phân hạng vé mới</span>
            </button>
          </section>

          <div className="submit-panel">
            <div className="submit-info">
              <h3>
                <svg className="svg-icon lg icon-teal" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Xác nhận thông tin & Xuất bản sự kiện
              </h3>
              <p>Sự kiện sẽ được kích hoạt công khai trực tiếp lên sàn EventPass.</p>
            </div>
            
            <button type="submit" disabled={loading} className="btn-submit">
              <svg className="svg-icon md stroke-2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{loading ? 'Đang xuất bản...' : 'Xuất Bản Sự Kiện Ngay'}</span>
            </button>
          </div>

        </form>
      </div>
    </>
  );
}