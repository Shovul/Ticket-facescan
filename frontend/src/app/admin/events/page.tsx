'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { eventService } from '../../../services/eventService';
import { EventSummaryDto } from '../../../types/event';
import '../../../styles/event.css';

export default function EventsListPage() {
  const [events, setEvents] = useState<EventSummaryDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'upcoming' | 'ended'>('all');
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchEvents = useCallback(async (pageNum: number, search: string, status: string, isNewSearch = false) => {
    if (loading) return;
    setLoading(true);
    
    try {
      const data = await eventService.getEvents(pageNum, 10, search, status);
      
      setEvents(prev => isNewSearch ? data.items : [...prev, ...data.items]);
      setHasMore(data.items.length === 10);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle Search and Filter changes (Reset to Page 1)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchEvents(1, searchQuery, activeFilter, true);
    }, 400); // 400ms debounce for typing
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, activeFilter, fetchEvents]);

  // Infinite Scroll Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchEvents(page + 1, searchQuery, activeFilter, false);
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, page, searchQuery, activeFilter, fetchEvents]);

  return (
    <div className="events-layout-wrapper">
      <header className="events-header">
        <h1 className="text-[18px] font-extrabold text-[#023852]">Quản Lý Sự Kiện</h1>
        <Link href="/admin/events/create" className="btn-primary">
          <svg className="w-4 h-4 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Tạo sự kiện mới</span>
        </Link>
      </header>

      <div className="events-main-container">
        
        <div className="toolbar-filter-row">
          <div className="search-event-input-box">
            <input 
              type="text" 
              className="search-event-input" 
              placeholder="Tìm kiếm tên sự kiện, địa điểm..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg className="search-event-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          </div>

          <div className="filter-tabs">
            <button className={`tab-btn ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>Tất cả</button>
            <button className={`tab-btn ${activeFilter === 'open' ? 'active' : ''}`} onClick={() => setActiveFilter('open')}>Đang mở</button>
            <button className={`tab-btn ${activeFilter === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveFilter('upcoming')}>Sắp tới</button>
            <button className={`tab-btn ${activeFilter === 'ended' ? 'active' : ''}`} onClick={() => setActiveFilter('ended')}>Đã qua</button>
          </div>
        </div>

        {events.length > 0 ? (
          <div className="events-grid-list">
            {events.map((ev) => {
              const percent = ev.total > 0 ? Math.round((ev.sold / ev.total) * 100) : 0;
              return (
                <div key={ev.id} className="event-item-card">
                  <div className="event-cover-box">
                    <img src={ev.coverImage || '/placeholder-event.jpg'} className="event-cover-img" alt={ev.title} />
                    <span className={`event-status-tag ${ev.status}`}>{ev.statusText}</span>
                  </div>

                  <div className="event-card-body">
                    <div>
                      <h3 className="event-title">{ev.title}</h3>
                      <div className="event-meta-list">
                        <div className="event-meta-row">
                          <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          <span>{new Date(ev.startTime).toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="event-meta-row">
                          <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          <span>{ev.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="event-progress-container">
                      <div className="event-progress-label">
                        <span>Tiến độ phát hành vé</span>
                        <strong>{ev.sold} / {ev.total} ({percent}%)</strong>
                      </div>
                      <div className="event-progress-bar">
                        <div className="event-progress-fill" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>

                    <Link href={`/admin/events/${ev.id}`} className="btn-manage-event">
                      <span>Quản trị sự kiện</span>
                      <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !loading ? (
          <div className="empty-events-state">Không tìm thấy sự kiện nào phù hợp.</div>
        ) : null}

        <div ref={observerTarget} className="flex justify-center py-6">
          {loading && (
            <div className="text-[13px] font-bold text-[#079FA0] flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Đang tải thêm...
            </div>
          )}
        </div>

      </div>
    </div>
  );
}