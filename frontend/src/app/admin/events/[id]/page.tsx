'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { eventService } from '../../../../services/eventService';
import { EventDetailResponse } from '../../../../types/event';
import '../../../../styles/event.css';

export default function EventDetailPage() {
  const params = useParams();
  const eventId = Number(params.id);
  const [event, setEvent] = useState<EventDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const data = await eventService.getEventById(eventId);
        setEvent(data);
      } catch (err: any) {
        setError(err.response?.data?.Error || 'Không thể tải chi tiết sự kiện.');
      } finally {
        setLoading(false);
      }
    };
    
    if (eventId) fetchEvent();
  }, [eventId]);

  if (loading) return <div className="p-10 text-center text-[#079FA0] font-bold text-sm">Đang tải dữ liệu...</div>;
  if (error || !event) return <div className="p-10 text-center text-red-500 font-bold text-sm">{error || 'Không tìm thấy sự kiện'}</div>;

  return (
    <div className="events-layout-wrapper">
      <header className="events-header bg-white border-b-[1.5px] border-[#cfe5dc] py-3.5 px-9 flex items-center gap-4">
        <Link href="/admin/events" className="btn-action-secondary py-1.5 px-3 bg-[#f2f7f5] text-[#023852] border-[1.5px] border-[#cfe5dc] rounded-md text-[12.5px] font-bold inline-flex items-center gap-1.5 hover:bg-[#079FA0] hover:text-white transition-colors">
          <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Quay lại danh sách
        </Link>
        <h1 className="text-[18px] font-extrabold text-[#023852]">Quản Trị — {event.title}</h1>
      </header>

      <div className="events-main-container pt-6">
        
        <div className="bg-white border-[1.5px] border-[#cfe5dc] rounded-xl p-6 shadow-[0_4px_14px_rgba(2,56,82,0.04)] flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#e6f7f3] text-[#0d7a60] border border-[#bcf0e2] uppercase">
                ID: EVT-{event.id}
              </span>
            </div>
            <h2 className="text-[19px] font-extrabold text-[#023852] mb-1.5">{event.title}</h2>
            <div className="flex items-center gap-4 text-[13px] text-[#537583]">
              <span>{new Date(event.startTime).toLocaleString('vi-VN')}</span>
              <span>•</span>
              <span>{event.location}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white border-[1.5px] border-[#cfe5dc] rounded-xl p-6 shadow-[0_4px_14px_rgba(2,56,82,0.04)]">
           <h3 className="text-[15px] font-bold text-[#023852] mb-4 border-b border-[#cfe5dc] pb-2">Danh sách Hạng vé</h3>
           <div className="flex flex-col gap-3">
             {event.tickets.map(ticket => (
               <div key={ticket.id} className="p-4 bg-[#f2f7f5] border border-[#cfe5dc] rounded-lg flex justify-between items-center">
                 <div>
                   <div className="font-bold text-[#023852] text-[13.5px]">{ticket.name}</div>
                   <div className="text-[12px] text-[#537583] mt-1">Giá: {ticket.price.toLocaleString('vi-VN')}đ • Đã bán: {ticket.quantitySold} / {ticket.quantity}</div>
                 </div>
               </div>
             ))}
           </div>
        </div>

      </div>
    </div>
  );
}