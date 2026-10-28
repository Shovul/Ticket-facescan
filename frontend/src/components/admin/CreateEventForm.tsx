'use client';

import React from 'react';
import Link from 'next/link';
import { useCreateEvent } from '../../hooks/useCreateEvent';

export default function CreateEventForm() {
  const {
    formData, loading, error, updateField,
    addTicket, updateTicket, removeTicket,
    addKiosk, updateKiosk, removeKiosk, submitForm
  } = useCreateEvent();

  return (
    <>
      {/* TOP HEADER */}
      <header className="bg-white border-b-[1.5px] border-[#cfe5dc] py-3.5 px-9 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <Link href="/admin/events" className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-[#f2f7f5] text-[#023852] border-[1.5px] border-[#cfe5dc] rounded-md text-[12.5px] font-bold decoration-transparent hover:bg-[#079FA0] hover:text-white hover:border-[#079FA0] transition-colors">
            <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-[1.8] shrink-0" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            <span>Quay lại sự kiện</span>
          </Link>
          <h1 className="text-4.5 font-extrabold text-[#023852]">Khởi Tạo & Xuất Bản Sự Kiện Mới</h1>
        </div>
        <div className="text-[12.5px] text-[#537583]">
          Hình thức phát hành: <strong className="text-[#15803d]">Công Khai Trực Tiếp (Publish Directly)</strong>
        </div>
      </header>

      {/* NỘI DUNG */}
      <div className="pt-6 pb-16 px-9 w-full max-w-275 mx-auto flex flex-col gap-5">
        
        {error && <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-md font-medium text-sm">{error}</div>}

        <form onSubmit={submitForm} className="flex flex-col gap-5.5">
          
          {/* PANEL BAN TỔ CHỨC */}
          <section className="bg-white rounded-xl border border-[#cfe5dc] shadow-[0_6px_20px_-6px_rgba(2,56,82,0.05)] p-6 px-7.5">
            <div className="flex justify-between items-center border-b-[1.5px] border-[#e3efea] pb-3 mb-5">
              <h2 className="text-[16.5px] font-extrabold flex items-center gap-2.5 text-[#023852]">
                <svg className="w-4.5 h-4.5 text-[#079FA0] fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                1. Thông Tin Ban Tổ Chức & Pháp Lý Đơn Vị
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-[#023852] uppercase tracking-[0.3px]">Tên cơ quan / Đơn vị tổ chức <span className="text-[#DC2E2F] ml-0.5">*</span></label>
                <input type="text" required value={formData.organizerName} onChange={(e) => updateField('organizerName', e.target.value)}
                  className="w-full p-2.5 text-[13.5px] text-[#023852] border-[1.5px] border-[#cfe5dc] rounded-[7px] outline-none focus:border-[#079FA0] focus:shadow-[0_0_0_3px_rgba(7,159,160,0.12)] transition-colors" placeholder="Ví dụ: Đoàn Trường Đại học Sài Gòn" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-[#023852] uppercase tracking-[0.3px]">Hòm thư điện tử chính thức <span className="text-[#DC2E2F] ml-0.5">*</span></label>
                <input type="email" required value={formData.organizerEmail} onChange={(e) => updateField('organizerEmail', e.target.value)}
                  className="w-full p-2.5 text-[13.5px] text-[#023852] border-[1.5px] border-[#cfe5dc] rounded-[7px] outline-none focus:border-[#079FA0] focus:shadow-[0_0_0_3px_rgba(7,159,160,0.12)] transition-colors" placeholder="doantruong@sgu.edu.vn" />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[11.5px] font-bold text-[#023852] uppercase tracking-[0.3px]">Đường dây nóng <span className="text-[#DC2E2F] ml-0.5">*</span></label>
                <input type="tel" required value={formData.organizerHotline} onChange={(e) => updateField('organizerHotline', e.target.value)}
                  className="w-full p-2.5 text-[13.5px] text-[#023852] border-[1.5px] border-[#cfe5dc] rounded-[7px] outline-none focus:border-[#079FA0] focus:shadow-[0_0_0_3px_rgba(7,159,160,0.12)] transition-colors" placeholder="028.3835.4409" />
              </div>
            </div>
          </section>

          {/* PANEL 2: THÔNG TIN CHUNG SỰ KIỆN */}
          <section className="bg-white rounded-xl border border-[#cfe5dc] shadow-[0_6px_20px_-6px_rgba(2,56,82,0.05)] p-6 px-7.5">
            <div className="flex justify-between items-center border-b-[1.5px] border-[#e3efea] pb-3 mb-5">
              <h2 className="text-[16.5px] font-extrabold flex items-center gap-2.5 text-[#023852]">
                <svg className="w-4.5 h-4.5 text-[#079FA0] fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                2. Thông Tin Chung Sự Kiện
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-5">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[11.5px] font-bold text-[#023852] uppercase tracking-[0.3px]">Tên sự kiện <span className="text-[#DC2E2F] ml-0.5">*</span></label>
                <input type="text" required value={formData.title} onChange={(e) => updateField('title', e.target.value)}
                  className="w-full p-2.5 text-[13.5px] text-[#023852] border-[1.5px] border-[#cfe5dc] rounded-[7px] outline-none focus:border-[#079FA0] focus:shadow-[0_0_0_3px_rgba(7,159,160,0.12)] transition-colors" placeholder="Ví dụ: Ngày Hội Công Nghệ SGU TechDay 2026" />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[11.5px] font-bold text-[#023852] uppercase tracking-[0.3px]">Mô tả sự kiện <span className="text-[#DC2E2F] ml-0.5">*</span></label>
                <textarea required rows={3} value={formData.description} onChange={(e) => updateField('description', e.target.value)}
                  className="w-full min-h-21.25 p-2.5 text-[13.5px] text-[#023852] border-[1.5px] border-[#cfe5dc] rounded-[7px] outline-none focus:border-[#079FA0] focus:shadow-[0_0_0_3px_rgba(7,159,160,0.12)] transition-colors resize-y" placeholder="Mô tả nội dung chương trình..."></textarea>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[11.5px] font-bold text-[#023852] uppercase tracking-[0.3px]">Địa điểm tổ chức thực tế <span className="text-[#DC2E2F] ml-0.5">*</span></label>
                <input type="text" required value={formData.location} onChange={(e) => updateField('location', e.target.value)}
                  className="w-full p-2.5 text-[13.5px] text-[#023852] border-[1.5px] border-[#cfe5dc] rounded-[7px] outline-none focus:border-[#079FA0] focus:shadow-[0_0_0_3px_rgba(7,159,160,0.12)] transition-colors" placeholder="Ví dụ: Hội trường A - Cơ sở chính SGU" />
              </div>
            </div>
          </section>

          {/* PANEL 3: CHU TRÌNH THỜI GIAN */}
          <section className="bg-white rounded-xl border border-[#cfe5dc] shadow-[0_6px_20px_-6px_rgba(2,56,82,0.05)] p-6 px-7.5">
            <div className="flex justify-between items-center border-b-[1.5px] border-[#e3efea] pb-3 mb-5">
              <h2 className="text-[16.5px] font-extrabold flex items-center gap-2.5 text-[#023852]">
                <svg className="w-4.5 h-4.5 text-[#079FA0] fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                3. Chu Trình Thời Gian Sự Kiện (5 Mốc)
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-[#023852] uppercase tracking-[0.3px]">1. CÔNG KHAI WEB <span className="text-[#DC2E2F] ml-0.5">*</span></label>
                <input type="datetime-local" required value={formData.publicTime} onChange={(e) => updateField('publicTime', e.target.value)}
                  className="w-full p-2.5 text-[13.5px] text-[#023852] border-[1.5px] border-[#cfe5dc] rounded-[7px] outline-none focus:border-[#079FA0] transition-colors" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-[#023852] uppercase tracking-[0.3px]">2. MỞ BÁN VÉ <span className="text-[#DC2E2F] ml-0.5">*</span></label>
                <input type="datetime-local" required value={formData.openTicketTime} onChange={(e) => updateField('openTicketTime', e.target.value)}
                  className="w-full p-2.5 text-[13.5px] text-[#023852] border-[1.5px] border-[#cfe5dc] rounded-[7px] outline-none focus:border-[#079FA0] transition-colors" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-[#023852] uppercase tracking-[0.3px]">3. ĐÓNG BÁN VÉ <span className="text-[#DC2E2F] ml-0.5">*</span></label>
                <input type="datetime-local" required value={formData.closeTicketTime} onChange={(e) => updateField('closeTicketTime', e.target.value)}
                  className="w-full p-2.5 text-[13.5px] text-[#023852] border-[1.5px] border-[#cfe5dc] rounded-[7px] outline-none focus:border-[#079FA0] transition-colors" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-[#023852] uppercase tracking-[0.3px]">4. MỞ QUÉT KIOSK CHECK-IN <span className="text-[#DC2E2F] ml-0.5">*</span></label>
                <input type="datetime-local" required value={formData.openKioskTime} onChange={(e) => updateField('openKioskTime', e.target.value)}
                  className="w-full p-2.5 text-[13.5px] text-[#023852] border-[1.5px] border-[#cfe5dc] rounded-[7px] outline-none focus:border-[#079FA0] transition-colors" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-[#023852] uppercase tracking-[0.3px]">5A. BẮT ĐẦU SỰ KIỆN <span className="text-[#DC2E2F] ml-0.5">*</span></label>
                <input type="datetime-local" required value={formData.startTime} onChange={(e) => updateField('startTime', e.target.value)}
                  className="w-full p-2.5 text-[13.5px] text-[#023852] border-[1.5px] border-[#cfe5dc] rounded-[7px] outline-none focus:border-[#079FA0] transition-colors" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-[#023852] uppercase tracking-[0.3px]">5B. BẾ MẠC SỰ KIỆN <span className="text-[#DC2E2F] ml-0.5">*</span></label>
                <input type="datetime-local" required value={formData.endTime} onChange={(e) => updateField('endTime', e.target.value)}
                  className="w-full p-2.5 text-[13.5px] text-[#023852] border-[1.5px] border-[#cfe5dc] rounded-[7px] outline-none focus:border-[#079FA0] transition-colors" />
              </div>
            </div>
          </section>

          {/* PANEL 4: PHÂN HẠNG VÉ */}
          <section className="bg-white rounded-xl border border-[#cfe5dc] shadow-[0_6px_20px_-6px_rgba(2,56,82,0.05)] p-6 px-7.5">
            <div className="flex justify-between items-center border-b-[1.5px] border-[#e3efea] pb-3 mb-5">
              <h2 className="text-[16.5px] font-extrabold flex items-center gap-2.5 text-[#023852]">
                <svg className="w-4.5 h-4.5 text-[#079FA0] fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>
                4. Phân Hạng Vé Phát Hành
              </h2>
            </div>
            
            <div className="flex flex-col gap-2.5 mb-2">
              {formData.tickets.map((ticket, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-[2fr_1.2fr_1fr_auto] gap-3 items-center bg-[#f2f7f5] border border-[#cfe5dc] rounded-lg p-[14px_16px]">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11.5px] font-bold text-[#023852]">Tên hạng vé</label>
                    <input type="text" required value={ticket.name} onChange={(e) => updateTicket(index, 'name', e.target.value)} className="w-full p-2.5 text-[13.5px] text-[#023852] border-[1.5px] border-[#cfe5dc] rounded-[7px] outline-none focus:border-[#079FA0]" placeholder="Vé VIP" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11.5px] font-bold text-[#023852]">Giá (VNĐ)</label>
                    <input type="number" min="0" step="10000" required value={ticket.price} onChange={(e) => updateTicket(index, 'price', Number(e.target.value))} className="w-full p-2.5 text-[13.5px] text-[#023852] border-[1.5px] border-[#cfe5dc] rounded-[7px] outline-none focus:border-[#079FA0]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11.5px] font-bold text-[#023852]">Số Slot</label>
                    <input type="number" min="1" required value={ticket.quantity} onChange={(e) => updateTicket(index, 'quantity', Number(e.target.value))} className="w-full p-2.5 text-[13.5px] text-[#023852] border-[1.5px] border-[#cfe5dc] rounded-[7px] outline-none focus:border-[#079FA0]" />
                  </div>
                  <div className="pt-4.5">
                    <button type="button" onClick={() => removeTicket(index)} className="p-1.5 text-[#DC2E2F] bg-transparent hover:bg-red-100 rounded-md transition-colors" title="Xóa vé">
                      <span className="text-[13px] font-bold md:hidden">Xóa vé này</span>
                      <svg className="w-4.5 h-4.5 hidden md:block fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <button type="button" onClick={addTicket} className="mt-1.5 px-3.5 py-2 bg-white text-[#079FA0] border-[1.5px] border-dashed border-[#079FA0] rounded-[7px] text-[13px] font-bold hover:bg-[#eef7f4] transition-colors inline-flex items-center gap-1.5">
              <svg className="w-4.5 h-4.5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>+ Thêm phân hạng vé mới</span>
            </button>
          </section>

          {/* SUBMIT SECTION NÚT NHẤN KHỔNG LỒ */}
          <div className="bg-white rounded-xl border-[1.5px] border-[#cfe5dc] shadow-[0_10px_30px_-5px_rgba(2,56,82,0.08)] p-6 px-7.5 flex flex-col md:flex-row items-center justify-between gap-5">
            <div>
              <h3 className="text-[16px] font-extrabold text-[#023852] flex items-center gap-2">
                <svg className="w-5 h-5 text-[#079FA0] fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Xác nhận thông tin & Xuất bản sự kiện
              </h3>
              <p className="text-[13px] text-[#537583] mt-0.75">Sự kiện sẽ được kích hoạt công khai trực tiếp lên sàn EventPass.</p>
            </div>
            
            <button type="submit" disabled={loading} className="w-full md:w-auto px-9 py-3.5 bg-linear-to-br from-[#079FA0] to-[#057a7b] text-white text-[15px] font-extrabold rounded-lg shadow-[0_6px_18px_rgba(7,159,160,0.35)] hover:shadow-[0_8px_24px_rgba(7,159,160,0.45)] hover:-translate-y-px transition-all inline-flex justify-center items-center gap-2.5 whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed">
              <svg className="w-4.5 h-4.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{loading ? 'Đang xuất bản...' : 'Xuất Bản Sự Kiện Ngay'}</span>
            </button>
          </div>

        </form>
      </div>
    </>
  );
}