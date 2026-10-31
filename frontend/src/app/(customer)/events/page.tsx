"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock3, MapPin, ChevronRight, Search, Building2, Ticket } from "lucide-react";
import { customerApi, eventSchedule } from "../../../services/customerApi";
import { PublicEventPage } from "../../../types/customer";
import Pagination from "../../../components/shared/Pagination";
import { useNotification } from "../../../components/shared/NotificationProvider";

export default function EventsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const term = (params.get("search") || "").trim();
  const sort = ["time", "remaining", "name"].includes(params.get("sort") || "") ? params.get("sort")! : "time";
  const requestedPage = Number(params.get("page") || "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [data, setData] = useState<PublicEventPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const catalog = useRef<HTMLElement>(null);
  const notify = useNotification();

  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    customerApi.events(term, sort, page, controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch(issue => { if (!controller.signal.aborted) { setError(issue.message); notify(issue.message, "error"); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [term, sort, page, retry, notify]);

  function navigate(next: number, nextSort = sort) {
    const query = new URLSearchParams(params.toString());
    query.set("sort", nextSort); query.set("page", String(next));
    router.replace(`/events?${query}`, { scroll: false });
    catalog.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <main className="storefront-main" ref={catalog}>
    <div className="filter-toolbar-card"><div className="filter-info-label"><CalendarDays className="icon teal" size={18} /><span>Danh sách sự kiện đang mở đăng ký</span></div>
      <div className="sort-select-box"><label htmlFor="event-sort">Sắp xếp theo:</label><select id="event-sort" className="sort-select" value={sort} onChange={e => navigate(1, e.target.value)}>
        <option value="time">Thời gian: Gần nhất trước</option><option value="remaining">Số lượng vé: Sắp hết trước</option><option value="name">Tên sự kiện: A - Z</option>
      </select></div></div>
    {loading && <div className="customer-state" role="status">Đang tải sự kiện…</div>}
    {!loading && error && <div className="customer-state" role="alert"><p>{error}</p><button className="btn-modal-back" onClick={() => setRetry(v => v + 1)}>Thử lại</button></div>}
    {!loading && !error && data?.items.length === 0 && <div className="customer-state catalog-empty"><Search size={40} /><h2>Không tìm thấy sự kiện nào</h2><p>{term ? "Hãy thử tìm kiếm với từ khóa khác." : "Hiện chưa có sự kiện mở đăng ký. Bạn hãy quay lại sau nhé."}</p></div>}
    {!loading && !error && <div className="event-catalog-grid">{data?.items.map(event => <article className="event-item-card" key={event.id}>
      <Link href={`/events/${event.id}`} className="card-cover-wrap" aria-label={`Xem ${event.title}`}>
        {event.coverImage ? <img className="card-cover-img" src={event.coverImage} alt="" onError={e => { e.currentTarget.style.display = "none"; }} /> : <Ticket className="cover-placeholder" size={48} />}
        <span className={`card-status-badge ${event.remainingQuantity === 0 ? "upcoming" : "open"}`}>{event.remainingQuantity === 0 ? "Hết vé" : "Đang mở vé"}</span>
      </Link>
      <div className="card-body-content"><div><div className="card-org-tag">{event.organizerAvatarUrl ? <img className="card-org-avatar" src={event.organizerAvatarUrl} alt="" onError={e => { e.currentTarget.style.display = "none"; }} /> : <Building2 size={18} />}<span>{event.organizerName || "Ban tổ chức sự kiện"}</span></div>
        <h2 className="card-event-title"><Link href={`/events/${event.id}`}>{event.title}</Link></h2>
        <div className="card-meta-list"><div className="meta-row"><Clock3 className="icon" /><span>{eventSchedule(event.startTime, event.endTime)}</span></div><div className="meta-row"><MapPin className="icon" /><span>{event.location}</span></div></div></div>
        <div><div className="card-tier-pills">{event.tickets.map(t => <span key={t.id} className={`tier-pill ${/vip/i.test(t.name) ? "vip" : ""}`}>{t.name}</span>)}</div>
          <div className="card-action-footer"><span className="slot-left-info">Còn <strong>{event.remainingQuantity}</strong> chỗ</span><Link href={`/events/${event.id}`} className="btn-book-ticket">Đặt vé ngay <ChevronRight className="icon" size={14} /></Link></div></div>
      </div>
    </article>)}</div>}
    <div className="catalog-pagination-wrap"><span aria-live="polite">{loading ? "Đang tải…" : <>Hiển thị <strong>{error ? 0 : data?.totalCount || 0}</strong> sự kiện</>}</span>
      <Pagination page={data?.page || page} totalPages={error ? 0 : data?.totalPages || 0} disabled={loading || !!error} onChange={next => navigate(next)} />
    </div>
  </main>;
}
