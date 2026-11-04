'use client';

import React from 'react';
import Link from 'next/link';
import { useCreateEvent } from '../../../../hooks/useCreateEvent';
import '../../../../styles/admin-layout.css';

export default function CreateEventForm() {
  const {
    formData, loading, updateField, handleLogoUpload, handleImagesUpload,
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
        <form onSubmit={submitForm} className="event-form">
          
          {/* PANEL 1: BAN TỔ CHỨC */}
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
                <input type="text" required value={formData.organizerName} onChange={(e) => updateField('organizerName', e.target.value)} className="form-input" placeholder="Ví dụ: Đoàn Trường Đại học Sài Gòn" />
              </div>
              <div className="form-group">
                <label className="form-label">Hòm thư điện tử chính thức <span className="required-mark">*</span></label>
                <input type="email" required value={formData.organizerEmail} onChange={(e) => updateField('organizerEmail', e.target.value)} className="form-input" placeholder="doantruong@sgu.edu.vn" />
              </div>
              <div className="form-group">
                <label className="form-label">Đường dây nóng hỗ trợ <span className="required-mark">*</span></label>
                <input type="tel" required value={formData.organizerHotline} onChange={(e) => updateField('organizerHotline', e.target.value)} className="form-input" placeholder="028.3835.4409" />
              </div>
              <div className="form-group">
                <label className="form-label">Website / Cổng thông tin sự kiện</label>
                <input type="url" value={formData.organizerWebsite} onChange={(e) => updateField('organizerWebsite', e.target.value)} className="form-input" placeholder="https://techday.sgu.edu.vn" />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Mã định danh / Quyết định thành lập</label>
                <input type="text" value={formData.organizerLegalId} onChange={(e) => updateField('organizerLegalId', e.target.value)} className="form-input" placeholder="QĐ-ĐHSG/2026-CNTT" />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Bộ Nhận Diện Chính Thức (Logo)</label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '68px', height: '68px', border: '1.5px solid #cfe5dc', borderRadius: '10px', overflow: 'hidden' }}>
                    <img src={formData.organizerLogo || 'https://via.placeholder.com/68'} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div>
                    <input type="file" id="orgLogoFile" accept="image/png,image/jpeg,image/svg+xml" style={{ display: 'none' }} onChange={handleLogoUpload} />
                    <button type="button" className="btn-add-ticket" onClick={() => document.getElementById('orgLogoFile')?.click()}>
                      Tải lên logo nhận diện (.PNG, .SVG)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* PANEL 2: THÔNG TIN CHUNG */}
          <section className="form-panel">
            <div className="panel-header">
              <h2 className="panel-title">
                <svg className="svg-icon md icon-teal" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                2. Thông Tin Chung Sự Kiện
              </h2>
            </div>
            <div className="panel-grid">
              <div className="form-group full-width">
                <label className="form-label">Tên sự kiện phát hành <span className="required-mark">*</span></label>
                <input type="text" required value={formData.title} onChange={(e) => updateField('title', e.target.value)} className="form-input" placeholder="Ví dụ: Ngày Hội Công Nghệ SGU TechDay 2026" />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Mô tả sự kiện <span className="required-mark">*</span></label>
                <textarea required rows={3} value={formData.description} onChange={(e) => updateField('description', e.target.value)} className="form-textarea" placeholder="Mô tả nội dung chương trình..."></textarea>
              </div>
              <div className="form-group full-width">
                <label className="form-label">Hình ảnh minh họa & Poster ({formData.eventImages.length}/20)</label>
                <div className="upload-dropzone" onClick={() => document.getElementById('eventPhotoInput')?.click()} style={{ border: '2px dashed #cfe5dc', padding: '20px', textAlign: 'center', borderRadius: '10px', cursor: 'pointer' }}>
                  <span>Kéo thả ảnh vào đây hoặc bấm để chọn tải lên (Hỗ trợ Dropbox URL)</span>
                  <input type="file" id="eventPhotoInput" multiple accept="image/*" style={{ display: 'none' }} onChange={handleImagesUpload} />
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {formData.eventImages.map((src, idx) => (
                    <img key={idx} src={src} alt="Uploaded" style={{ width: '76px', height: '76px', borderRadius: '8px', objectFit: 'cover' }} />
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nhân vật nổi bật / Diễn giả</label>
                <input type="text" value={formData.eventSpeakers} onChange={(e) => updateField('eventSpeakers', e.target.value)} className="form-input" placeholder="Khách mời..." />
              </div>
              <div className="form-group">
                <label className="form-label">Địa điểm tổ chức thực tế <span className="required-mark">*</span></label>
                <input type="text" required value={formData.location} onChange={(e) => updateField('location', e.target.value)} className="form-input" placeholder="Ví dụ: Hội trường A - Cơ sở chính SGU" />
              </div>
            </div>
          </section>

          {/* PANEL 3: CHU TRÌNH THỜI GIAN 5 MỐC */}
          <section className="form-panel">
            <div className="panel-header">
              <h2 className="panel-title">
                <svg className="svg-icon md icon-teal" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                3. Chu Trình Thời Gian Sự Kiện (5 Mốc)
              </h2>
            </div>
            
            {/* Thanh Timeline mô phỏng */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', background: '#f8fbfa', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1.5px solid #cfe5dc' }}>
              {['Công Khai Web', 'Mở Bán Vé', 'Đóng Bán Vé', 'Check-in Kiosk', 'Chương Trình'].map((step, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#023852', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>{idx + 1}</div>
                  {step}
                </div>
              ))}
            </div>

            <div className="panel-grid">
              <div className="form-group"><label className="form-label">1. CÔNG KHAI WEB <span className="required-mark">*</span></label><input type="datetime-local" required value={formData.publicTime} onChange={(e) => updateField('publicTime', e.target.value)} className="form-input" /></div>
              <div className="form-group"><label className="form-label">2. MỞ BÁN VÉ <span className="required-mark">*</span></label><input type="datetime-local" required value={formData.openTicketTime} onChange={(e) => updateField('openTicketTime', e.target.value)} className="form-input" /></div>
              <div className="form-group"><label className="form-label">3. ĐÓNG BÁN VÉ <span className="required-mark">*</span></label><input type="datetime-local" required value={formData.closeTicketTime} onChange={(e) => updateField('closeTicketTime', e.target.value)} className="form-input" /></div>
              <div className="form-group"><label className="form-label">4. MỞ QUÉT KIOSK CHECK-IN <span className="required-mark">*</span></label><input type="datetime-local" required value={formData.openKioskTime} onChange={(e) => updateField('openKioskTime', e.target.value)} className="form-input" /></div>
              <div className="form-group"><label className="form-label">5A. BẮT ĐẦU SỰ KIỆN <span className="required-mark">*</span></label><input type="datetime-local" required value={formData.startTime} onChange={(e) => updateField('startTime', e.target.value)} className="form-input" /></div>
              <div className="form-group"><label className="form-label">5B. BẾ MẠC SỰ KIỆN <span className="required-mark">*</span></label><input type="datetime-local" required value={formData.endTime} onChange={(e) => updateField('endTime', e.target.value)} className="form-input" /></div>
            </div>
          </section>

          {/* PANEL 4: PHÂN HẠNG VÉ */}
          <section className="form-panel">
            <div className="panel-header">
              <h2 className="panel-title">
                <svg className="svg-icon md icon-teal" viewBox="0 0 24 24"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>
                4. Phân Hạng Vé Phát Hành
              </h2>
            </div>
            <div className="tickets-list">
              {formData.tickets.map((ticket, index) => (
                <div key={index} className="ticket-row" style={{ gridTemplateColumns: '2fr 1.2fr 1fr 2fr auto' }}>
                  <div className="form-group"><label className="form-label">Tên hạng vé <span className="required-mark">*</span></label><input type="text" required value={ticket.name} onChange={(e) => updateTicket(index, 'name', e.target.value)} className="form-input" placeholder="Vé VIP" /></div>
                  <div className="form-group"><label className="form-label">Giá (VNĐ) <span className="required-mark">*</span></label><input type="number" min="0" step="10000" required value={ticket.price} onChange={(e) => updateTicket(index, 'price', Number(e.target.value))} className="form-input" /></div>
                  <div className="form-group"><label className="form-label">Số Slot <span className="required-mark">*</span></label><input type="number" min="1" required value={ticket.quantity} onChange={(e) => updateTicket(index, 'quantity', Number(e.target.value))} className="form-input" /></div>
                  <div className="form-group"><label className="form-label">Đặc quyền / Quyền lợi</label><input type="text" value={ticket.description} onChange={(e) => updateTicket(index, 'description', e.target.value)} className="form-input" placeholder="Quà tặng kèm..." /></div>
                  <div className="ticket-actions"><button type="button" onClick={() => removeTicket(index)} className="btn-remove-ticket" title="Xóa vé"><svg className="svg-icon md block-md" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addTicket} className="btn-add-ticket">+ Thêm phân hạng vé mới</button>
          </section>

          {/* PANEL 5: TRẠM KIOSK */}
          <section className="form-panel">
            <div className="panel-header">
              <h2 className="panel-title">
                <svg className="svg-icon md icon-teal" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                5. Thiết Lập Trạm Kiosk Soát Vé
              </h2>
            </div>
            <div className="tickets-list">
              {formData.kiosks.map((kiosk, index) => (
                <div key={index} className="ticket-row" style={{ gridTemplateColumns: '2fr 2fr 1.5fr auto' }}>
                <div className="form-group">
                  <label className="form-label">Tên trạm <span className="required-mark">*</span></label>
                  <input type="text" required value={kiosk.name} onChange={(e) => updateKiosk(index, 'name', e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Vị trí <span className="required-mark">*</span></label>
                  <input type="text" required value={kiosk.location} onChange={(e) => updateKiosk(index, 'location', e.target.value)} className="form-input" placeholder="Ví dụ: Cổng chính - Đường ABC" />
                </div>
                <div className="form-group">
                  <label className="form-label">Secret Token (Tự sinh)</label>
                  <div style={{ padding: '8px', background: '#fff', border: '1.5px solid #cfe5dc', borderRadius: '6px', fontFamily: 'monospace', color: '#079FA0', fontWeight: 'bold' }}>{kiosk.secretToken}</div>
                </div>
                <div className="ticket-actions">
                  <button type="button" onClick={() => removeKiosk(index)} className="btn-remove-ticket" title="Xóa trạm">
                    <svg className="svg-icon md block-md" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
              ))}
            </div>
            <button type="button" onClick={addKiosk} className="btn-add-ticket">+ Thêm trạm kiểm soát</button>
          </section>

          {/* PANEL 6: XEM TRƯỚC VÉ & EMAIL */}
          <section className="form-panel">
            <div className="panel-header">
              <h2 className="panel-title">
                <svg className="svg-icon md icon-teal" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                6. Thiết Kế Email & Xem Trước Vé Điện Tử
              </h2>
            </div>
            <div className="panel-grid">
              <div>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Tiêu đề email gửi vé <span className="required-mark">*</span></label>
                  <input type="text" required value={formData.emailSubject} onChange={(e) => updateField('emailSubject', e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Ghi chú hướng dẫn check-in trong email <span className="required-mark">*</span></label>
                  <textarea required rows={4} value={formData.emailCheckinNote} onChange={(e) => updateField('emailCheckinNote', e.target.value)} className="form-textarea"></textarea>
                </div>
              </div>

              {/* Digital Pass Card */}
              <div style={{ background: 'linear-gradient(145deg, #023852 0%, #034b6e 100%)', color: '#fff', borderRadius: '14px', padding: '22px', boxShadow: '0 10px 25px rgba(2, 56, 82, 0.18)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '12px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <img src={formData.organizerLogo || 'https://via.placeholder.com/34'} style={{ width: '34px', height: '34px', borderRadius: '6px', background: '#fff', padding: '2px', objectFit: 'contain' }} alt="Logo" />
                    <div><div style={{ fontSize: '9.5px', color: '#9FD8C5', fontWeight: 800 }}>Đơn vị phát hành</div><div style={{ fontSize: '12.5px', fontWeight: 700 }}>{formData.organizerName || 'Tên Đơn Vị'}</div></div>
                  </div>
                  <span style={{ fontSize: '10.5px', background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: '10px', fontWeight: 800 }}>{formData.tickets[0]?.name || 'PASS'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800 }}>{formData.title || 'Tên sự kiện của bạn'}</div>
                  <div style={{ fontSize: '12px', color: '#d2e9f3' }}>Khách tham dự: <strong>Tên Khách Hàng</strong></div>
                  <div style={{ fontSize: '12px', color: '#d2e9f3' }}>Khai mạc: {formData.startTime ? new Date(formData.startTime).toLocaleString('vi-VN') : 'Chưa thiết lập'}</div>
                  <div style={{ fontSize: '12px', color: '#d2e9f3' }}>Địa điểm: {formData.location || 'Chưa thiết lập'}</div>
                </div>
                <div style={{ background: '#fff', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '100px', height: '100px', border: '2px dashed #023852', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>[QR Code]</div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#023852', fontFamily: 'monospace' }}>PASS-DEMO-2026</span>
                </div>
              </div>
            </div>
          </section>

          {/* SUBMIT BUTTON */}
          <div className="submit-panel">
            <div className="submit-info">
              <h3><svg className="svg-icon lg icon-teal" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Xác nhận & Xuất bản trực tiếp</h3>
              <p>Sự kiện sẽ được kích hoạt công khai lên sàn EventPass và trạm Kiosk sẵn sàng kết nối.</p>
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