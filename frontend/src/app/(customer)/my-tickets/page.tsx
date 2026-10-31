"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3, Ticket, UserRound, X, CheckCircle2 } from "lucide-react";
import { customerApi, customerToken, eventSchedule, money } from "../../../services/customerApi";
import { Booking, CustomerTicket, CustomerTickets, DigitalPass } from "../../../types/customer";
import { useCustomerHeaderKind } from "../../../components/customer/CustomerHeader";
import BookingCheckout from "../../../components/customer/BookingCheckout";
import { useNotification } from "../../../components/shared/NotificationProvider";
import "../../../styles/customer-tickets.css";

type CancelRequest = { order: Booking; part?: "free" | "paid" };
const ticketStatus = (ticket: CustomerTicket) => ticket.status === "checkedin" ? "Đã vào cổng"
  : ticket.status === "cancelled" ? "Sự kiện hoặc vé đã hủy" : ticket.status === "expired" ? "Đã hết hạn"
    : ticket.hasFaceId ? "Sẵn sàng vào cổng" : "Cần nạp Face ID";

export default function MyTicketsPage() {
  useCustomerHeaderKind("tickets");
  const [data, setData] = useState<CustomerTickets | null>(null);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [error, setError] = useState("");
  const [guest, setGuest] = useState(false);
  const [revision, setRevision] = useState(0);
  const [tick, setTick] = useState(0);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [pass, setPass] = useState<DigitalPass | null>(null);
  const [cancel, setCancel] = useState<CancelRequest | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const requestVersion = useRef(0);
  const clock = useRef({ server: 0, received: 0 });
  const grid = useRef<HTMLDivElement>(null);
  const notify = useNotification();
  const reload = useCallback(() => { requestVersion.current++; setRevision(value => value + 1); }, []);

  useEffect(() => {
    if (!customerToken()) { setGuest(true); return; }
    setGuest(false); setData(null); setError("");
    const controller = new AbortController(); let fetching = false;
    const refresh = async () => {
      if (fetching || busy.current) return;
      fetching = true; const version = requestVersion.current;
      try {
        const result = await customerApi.tickets(page, filter, controller.signal);
        if (!controller.signal.aborted && version === requestVersion.current) {
          clock.current = { server: Date.parse(result.serverTime), received: performance.now() };
          setData(result); setPageInput(String(result.page)); setError("");
        }
      } catch (issue) { if (!controller.signal.aborted) setError((issue as Error).message); }
      finally { fetching = false; }
    };
    void refresh(); const poll = setInterval(refresh, 5000); const timer = setInterval(() => setTick(value => value + 1), 1000);
    return () => { controller.abort(); clearInterval(poll); clearInterval(timer); };
  }, [page, filter, revision]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy.current) { setOrderCode(null); setPass(null); setCancel(null); reload(); } };
    document.addEventListener("keydown", escape); return () => document.removeEventListener("keydown", escape);
  }, [reload]);
  useEffect(() => {
    if (!orderCode && !pass && !cancel) return;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [orderCode, pass, cancel]);

  function countdown(deadline?: string) {
    void tick;
    if (!deadline) return "—";
    const seconds = Math.max(0, Math.ceil((Date.parse(deadline) - clock.current.server - performance.now() + clock.current.received) / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }
  function navigate(next: number) {
    const last = data?.totalPages || 1;
    if (!Number.isInteger(next) || next < 1 || next > last) { setPageInput(String(data?.page || page)); return; }
    setPage(next); setPageInput(String(next)); grid.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function showPass(ticket: CustomerTicket) {
    if (busy.current) return;
    busy.current = true; setPending(true);
    try { setPass(await customerApi.pass(ticket.orderCode, ticket.itemId)); }
    catch (issue) { notify((issue as Error).message, "error"); }
    finally { busy.current = false; setPending(false); }
  }
  async function claimLink(ticket: CustomerTicket) {
    if (busy.current) return;
    busy.current = true; setPending(true);
    try {
      const link = await customerApi.claimLink(ticket.orderCode, ticket.itemId);
      await navigator.clipboard.writeText(`${window.location.origin}/claim#${link.token}`);
      notify("Đã sao chép liên kết mới. Liên kết cũ không còn hiệu lực.");
    } catch (issue) { notify((issue as Error).message, "error"); }
    finally { busy.current = false; setPending(false); }
  }
  async function cancelReservation() {
    if (!cancel || busy.current) return;
    busy.current = true; setPending(true); requestVersion.current++;
    try {
      if (cancel.part) await customerApi.cancelPart(cancel.order.orderCode, cancel.part);
      else await customerApi.cancel(cancel.order.orderCode);
      setCancel(null); notify("Đã hủy phần giữ chỗ chưa phát hành."); reload();
    } catch (issue) { notify((issue as Error).message, "error"); }
    finally { busy.current = false; setPending(false); }
  }
  function closeOrder() { if (busy.current) return; setOrderCode(null); reload(); window.dispatchEvent(new Event("eventpass.booking-updated")); }

  if (guest) return <main className="storefront-main"><div className="customer-state"><h1>Đăng nhập để xem vé của tôi</h1><p>Bạn cần đăng nhập tài khoản đã đặt vé.</p><button className="btn-guest-login" onClick={() => {
    const url = process.env.NEXT_PUBLIC_LOGIN_URL;
    if (url) window.location.assign(`${url}${url.includes("?") ? "&" : "?"}returnUrl=${encodeURIComponent("/my-tickets")}`);
    else notify("Chức năng đăng nhập đang được cập nhật.", "info");
  }}>Đăng nhập</button><Link href="/events">Khám phá sự kiện</Link></div></main>;

  return <div className="my-tickets-page"><main className="workspace-main">
    <div className="page-header-row"><div className="page-header-text"><h1>Vé & Đơn Đặt Chỗ Của Tôi</h1><p>Quản lý vé điện tử và hoàn tất các đơn đang giữ chỗ.</p></div><Link href="/events" className="btn-resume-action">Khám phá sự kiện</Link></div>
    {error && <div className="customer-state" role="alert"><p>{error}</p><button className="btn-ticket-sub" onClick={reload}>Thử lại</button></div>}
    {!data && !error && <div className="customer-state" role="status">Đang tải vé và đơn đặt chỗ…</div>}
    <div className="pending-reservations-container">{data?.pendingOrders.map(order => {
      const free = order.items.some(item => item.unitPrice === 0 && item.status === "reserved");
      const paid = order.items.some(item => item.unitPrice > 0 && item.status === "reserved");
      const issued = order.items.some(item => item.status === "issued");
      return <section key={order.orderCode} className={`reservation-banner-card ${free && paid ? "hybrid-type" : paid ? "paid-type" : ""}`}>
        <div className="res-left-info"><div className="res-icon-box"><Clock3 size={22} /></div><div className="res-text-block"><h4>{order.eventTitle}</h4><p>Mã đơn: {order.orderCode}</p><p>{order.items.filter(item => item.status === "reserved").length} suất đang giữ chỗ • {money(order.totalAmount)}</p></div></div>
        <div className="res-right-actions"><div className="timer-pill-group">
          {order.paymentExpiresAt && !order.paidAt && <span className="timer-item-badge">Hạn VietQR:<strong className="res-timer-badge">{countdown(order.paymentExpiresAt)}</strong></span>}
          {free && <span className="timer-item-badge">Hạn vé miễn phí:<strong className="res-timer-badge free-timer">{countdown(order.expiresAt)}</strong></span>}
        </div><button className="btn-resume-action" onClick={() => setOrderCode(order.orderCode)}>Xử lý đơn →</button>
          <div className="hybrid-cancel-actions">{!issued && <button className="btn-cancel-link danger" disabled={pending} onClick={() => setCancel({ order })}>Hủy đơn giữ chỗ</button>}
            {free && (paid || issued) && <button className="btn-cancel-link" disabled={pending} onClick={() => setCancel({ order, part: "free" })}>Hủy phần vé miễn phí</button>}
            {paid && free && !order.paidAt && <button className="btn-cancel-link danger" disabled={pending} onClick={() => setCancel({ order, part: "paid" })}>Hủy phần có phí</button>}
          </div></div>
      </section>;
    })}</div>
    <div className="tickets-filter-card" ref={grid}><div className="filter-pills">{[["all", "Tất cả vé chính thức", data?.allCount], ["free", "Vé Miễn Phí", data?.freeCount], ["paid", "Vé Có Phí", data?.paidCount], ["pending", "Cần nạp Face ID", data?.missingFaceCount]].map(([key, label, count]) =>
      <button key={key} className={`tab-btn ${filter === key ? "active" : ""}`} onClick={() => { setFilter(String(key)); setPage(1); }}>{label} ({count || 0})</button>)}</div></div>
    {data && !data.totalCount && <div className="customer-state">Không tìm thấy vé nào phù hợp bộ lọc.</div>}
    <div className="tickets-grid-list">{data?.tickets.map(ticket => <article className="ticket-card" key={ticket.ticketCode}>
      <div className="ticket-card-top"><div className="event-badge-group"><span className={`type-badge ${ticket.price === 0 ? "free" : "paid"}`}>{ticket.price === 0 ? "Miễn Phí" : "Vé Có Phí"}</span><code>{ticket.ticketCode}</code></div><span className={`status-badge ${ticket.status === "valid" && ticket.hasFaceId ? "active" : "pending"}`}>{ticketStatus(ticket)}</span></div>
      <div className="ticket-card-body"><div><h2 className="ticket-event-name">{ticket.eventTitle}</h2><p className="teal">{ticket.ticketTypeName} • {money(ticket.price)}</p></div>
        <div className="ticket-meta-grid"><div className="meta-col"><div>Thời gian</div><div>{eventSchedule(ticket.startTime, ticket.endTime)}</div></div><div className="meta-col"><div>Địa điểm</div><div>{ticket.location}</div></div></div>
        <div className="ticket-attendee-strip"><div className={`attendee-face-preview ${ticket.hasFaceId ? "" : "missing"}`}>{ticket.hasFaceId ? <CheckCircle2 size={24} /> : <UserRound size={24} />}</div><div className="attendee-details"><div className="attendee-name-txt">{ticket.attendeeName || "Chưa nhận vé"}</div><div className="attendee-sub-txt">{ticket.hasFaceId ? ticket.gate || "Face ID sẵn sàng" : "Cần hoàn tất Face ID trước khi vào làn nhận diện"}</div></div></div>
      </div><div className="ticket-card-footer"><button className="btn-view-pass" disabled={pending} onClick={() => { void showPass(ticket); }}><Ticket size={16} />Xem Thẻ Pass</button>
        {ticket.status === "valid" && Date.parse(ticket.startTime) > clock.current.server + performance.now() - clock.current.received && <div className="ticket-action-btns"><button className="btn-ticket-sub" onClick={() => setOrderCode(ticket.orderCode)}>{ticket.hasFaceId ? "Đổi ảnh" : "Nạp Face ID"}</button>{!ticket.hasFaceId && <button className="btn-ticket-sub" disabled={pending} onClick={() => { void claimLink(ticket); }}>Gửi link</button>}</div>}
      </div>
    </article>)}</div>
    <div className="catalog-pagination-wrap"><span>Hiển thị {data?.totalCount || 0} vé</span><div className="pagination-controls"><button className="pagination-nav-btn" disabled={!data || data.page <= 1} onClick={() => navigate((data?.page || 1) - 1)}>‹</button><div className="page-indicator-wrap"><input aria-label="Số trang" className="input-current-page" type="number" min={1} max={data?.totalPages || 1} value={pageInput} onChange={event => setPageInput(event.target.value)} onBlur={() => navigate(Number(pageInput))} onKeyDown={event => { if (event.key === "Enter") navigate(Number(pageInput)); }} /><span>/ {data?.totalPages || 1}</span></div><button className="pagination-nav-btn" disabled={!data || data.page >= data.totalPages} onClick={() => navigate((data?.page || 1) + 1)}>›</button></div></div>
    <p className="booking-help">Vé đã phát hành không được hoàn/hủy vì lý do cá nhân.</p>
  </main>
    {orderCode && <div className="modal-backdrop show"><section className="simple-modal-box" role="dialog" aria-modal="true" aria-labelledby="order-modal-title"><div className="modal-header-line"><h3 id="order-modal-title">Hoàn tất đơn đặt chỗ</h3><button className="btn-ticket-sub" aria-label="Đóng" disabled={pending} onClick={closeOrder}><X size={18} /></button></div><BookingCheckout key={orderCode} code={orderCode} embedded onCompleted={closeOrder} onBusyChange={value => { busy.current = value; setPending(value); }} /></section></div>}
    {cancel && <div className="modal-backdrop show"><section className="simple-modal-box" role="dialog" aria-modal="true" aria-labelledby="cancel-reservation-title"><div className="modal-header-line"><h3 id="cancel-reservation-title">Hủy phần giữ chỗ?</h3></div><p>Các suất chưa phát hành tương ứng sẽ được trả lại kho. Vé đã phát hành được bảo lưu.</p>{cancel.part === "paid" && <p>Phần miễn phí còn lại có hạn 5 phút tính từ lúc tạo đơn, không bắt đầu lại thời gian.</p>}<div className="res-right-actions"><button className="btn-ticket-sub" disabled={pending} onClick={() => setCancel(null)}>Quay lại</button><button className="btn-resume-action" disabled={pending} onClick={() => { void cancelReservation(); }}>{pending ? "Đang xử lý…" : "Xác nhận hủy"}</button></div></section></div>}
    {pass && <div className="modal-backdrop show"><section className="pass-modal-box" role="dialog" aria-modal="true" aria-labelledby="pass-title"><div className="pass-header-top"><strong>EventPass Official Digital Pass</strong><span className={`type-badge ${pass.ticket.price === 0 ? "free" : "paid"}`}>{pass.ticket.ticketTypeName}</span></div><div className="pass-body-content"><h2 id="pass-title">{pass.ticket.eventTitle}</h2><p>{eventSchedule(pass.ticket.startTime, pass.ticket.endTime)}</p><p>{pass.ticket.location}</p><div className="pass-face-qr-row">{pass.faceImage ? <img src={pass.faceImage} className="pass-face-large" alt="Ảnh người tham dự" /> : <UserRound size={48} />}<div><strong>{pass.ticket.attendeeName || "Chưa nhận vé"}</strong><p>{ticketStatus(pass.ticket)}</p><p>{pass.ticket.gate || "Cổng điểm danh sự kiện"}</p></div></div><div className="pass-qr-box"><img src={pass.ticket.qrCodeUrl} width={150} height={150} alt="QR dự phòng tại quầy hỗ trợ" /><code>{pass.ticket.ticketCode}</code></div><p>Bước vào làn Kiosk nhận diện khi đã hoàn tất Face ID. Mã QR dùng để đối soát dự phòng.</p></div><div className="pass-footer-btn"><button className="btn-ticket-sub" onClick={() => setPass(null)}>Đóng Thẻ Vé</button></div></section></div>}
  </div>;
}
