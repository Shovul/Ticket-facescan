"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Ticket, ChevronRight, Minus, Plus, LockKeyhole, Info, X, ShieldCheck } from "lucide-react";
import { customerApi, customerToken, CustomerApiError, money } from "../../../../services/customerApi";
import { PublicEvent } from "../../../../types/customer";
import EventInfoPanel from "../../../../components/customer/EventInfoPanel";
import { useCustomerHeaderKind } from "../../../../components/customer/CustomerHeader";
import { useNotification } from "../../../../components/shared/NotificationProvider";

export default function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const notify = useNotification();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [review, setReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [loginRequired, setLoginRequired] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(""); setEvent(null);
    customerApi.event(id, controller.signal).then(data => { if (!controller.signal.aborted) setEvent(data); })
      .catch(issue => { if (!controller.signal.aborted) { setError(issue.message); notify(issue.message, "error"); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, reload, notify]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => { if (e.key === "Escape" && !submitting.current) { setReview(false); setLoginRequired(false); } };
    document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close);
  }, []);

  const selected = event?.tickets.filter(t => quantities[t.id] > 0) || [];
  const count = selected.reduce((sum, t) => sum + quantities[t.id], 0);
  const total = selected.reduce((sum, t) => sum + t.price * quantities[t.id], 0);
  const hasFree = selected.some(t => t.price === 0);
  const kind = event?.tickets.some(t => t.price > 0) ? event.tickets.some(t => t.price === 0) ? "hybrid" : "paid" : "free";
  useCustomerHeaderKind(event ? kind : "catalog");

  function change(ticketId: number, delta: number) {
    const ticket = event?.tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    setQuantities(previous => {
      const currentCount = event!.tickets.reduce((sum, t) => sum + (previous[t.id] || 0), 0);
      if (currentCount + delta > 6) return previous;
      return { ...previous, [ticketId]: Math.min(ticket.remainingQuantity, Math.max(0, (previous[ticketId] || 0) + delta)) };
    });
  }
  function openReview() {
    if (!count) return;
    if (!customerToken()) { sessionStorage.setItem("eventpass.returnUrl", `/events/${id}`); setLoginRequired(true); notify("Vui lòng đăng nhập để tiếp tục đặt vé.", "info"); return; }
    setReview(true);
  }
  async function reserve() {
    if (!event || !count || submitting.current) return;
    submitting.current = true; setSaving(true);
    const items = selected.map(t => ({ ticketTypeId: t.id, quantity: quantities[t.id] }));
    const selection = JSON.stringify({ eventId: event.id, items });
    let pending: { selection: string; key: string } | null = null;
    try { pending = JSON.parse(sessionStorage.getItem("eventpass.reservationRequest") || "null"); } catch { pending = null; }
    if (!pending || pending.selection !== selection) { pending = { selection, key: crypto.randomUUID() }; sessionStorage.setItem("eventpass.reservationRequest", JSON.stringify(pending)); }
    try {
      const booking = await customerApi.reserve(event.id, items, pending.key);
      sessionStorage.setItem("eventpass.activeBooking", booking.orderCode); sessionStorage.removeItem("eventpass.reservationRequest");
      notify("Đã giữ chỗ. Vui lòng hoàn tất đơn trong thời gian quy định."); router.push(`/checkout?order=${encodeURIComponent(booking.orderCode)}`);
    } catch (e) {
      const issue = e as CustomerApiError; notify(issue.message, "error"); setReview(false);
      if (issue.status === 401) setLoginRequired(true);
      if (issue.status === 409) setReload(v => v + 1);
    } finally { submitting.current = false; setSaving(false); }
  }

  if (loading) return <main className="storefront-main"><div className="customer-state" role="status">Đang tải thông tin sự kiện…</div></main>;
  if (!event) return <main className="storefront-main"><div className="customer-state" role="alert"><h1>Không thể mở sự kiện</h1><p>{error}</p><Link href="/events" className="btn-guest-login">Quay lại danh sách</Link></div></main>;

  return <>
    <nav className="breadcrumb-nav" aria-label="Đường dẫn"><Link href="/events" className="breadcrumb-link">Trang chủ</Link><span>›</span><span>{event.title}</span></nav>
    <main className="detail-layout-container event-detail" data-kind={kind}>
      <EventInfoPanel event={event} />
      <aside className="booking-flow-panel"><section className="booking-card">
        <h2 className={kind === "free" ? "section-heading-row" : "section-title"}><Ticket className="icon teal" />{kind === "free" ? "Chọn Hạng Vé Miễn Phí" : kind === "paid" ? "1. Chọn Hạng Vé & Số Lượng" : "1. Chọn Phân Hạng Vé Tham Dự"}</h2>
        {kind === "free" && <p className="booking-intro">Chọn số lượng vé bạn muốn nhận (tối đa 6 vé/đơn). Bấm bắt đầu để khóa tạm giữ chỗ trong 5 phút.</p>}
        {event.tickets.length === 0 && <p className="booking-intro">Chưa có hạng vé được mở đăng ký.</p>}
        <div className="tier-ticket-list">{event.tickets.map(ticket => <div key={ticket.id} className={`${kind === "paid" ? "paid-tier-item" : "tier-booking-item"} ${(quantities[ticket.id] || 0) > 0 ? "active-selected" : ""}`}>
          <div className={kind === "paid" ? "tier-info-wrap" : "tier-left-info"}>
            {kind === "hybrid" && <span className={`tier-badge-type ${ticket.price === 0 ? "free" : "paid"}`}>{ticket.price === 0 ? "MIỄN PHÍ" : "CÓ PHÍ"}</span>}
            <h4>{ticket.name}</h4>
            {kind === "free" ? <span className="slots-badge">Miễn phí • Còn {ticket.remainingQuantity} chỗ</span> : <><div className={kind === "paid" ? "tier-price-tag" : "tier-price-display"}>{money(ticket.price)}</div><div className="tier-remaining-badge">Số lượng chỗ còn lại: <strong>{ticket.remainingQuantity}</strong> chỗ</div></>}
          </div>
          <div className="quantity-stepper"><button className="btn-step" aria-label={`Giảm ${ticket.name}`} onClick={() => change(ticket.id, -1)} disabled={!quantities[ticket.id] || saving}><Minus size={15} /></button><output className="step-value" aria-label={`Số lượng ${ticket.name}`}>{quantities[ticket.id] || 0}</output><button className="btn-step" aria-label={`Tăng ${ticket.name}`} onClick={() => change(ticket.id, 1)} disabled={count >= 6 || (quantities[ticket.id] || 0) >= ticket.remainingQuantity || saving}><Plus size={15} /></button></div>
        </div>)}</div>
        {kind === "hybrid" && <div className="rule-notice-box"><Info className="icon" /><span>{total === 0 ? "Chỉ chọn vé miễn phí: giữ chỗ 5 phút và nạp Face ID ngay." : hasFree ? "Thanh toán trong 10 phút; hoàn tất vé miễn phí trong tổng 15 phút kể từ lúc giữ chỗ." : "Chỉ chọn vé có phí: thanh toán trong 10 phút. Face ID có thể bổ sung sau."}</span></div>}
        {kind !== "free" && <div className="price-calc-box">{selected.map(t => <div className="calc-row" key={t.id}><span>{t.name} × {quantities[t.id]}</span><strong>{money(t.price * quantities[t.id])}</strong></div>)}<div className="calc-row total-row"><span>Tổng thanh toán</span><strong className="total-amount-display">{money(total)}</strong></div></div>}
        <button className={kind === "free" ? "btn-start-reserve" : "btn-proceed-pay"} disabled={count === 0 || saving || selected.some(t => quantities[t.id] > t.remainingQuantity)} onClick={openReview}>
          {kind === "free" ? <LockKeyhole className="icon" /> : <ShieldCheck className="icon" />}<span>{kind === "free" ? "Khóa Giữ Chỗ & Điền Thông Tin (5 Phút)" : "Tiếp tục xác nhận đơn hàng"}</span>{kind !== "free" && <ChevronRight className="icon" />}
        </button>
        <p className="booking-help">Thời gian giữ chỗ bắt đầu sau khi xác nhận đơn. Tối đa 6 vé/đơn.</p>
      </section></aside>
    </main>
    {loginRequired && <div className="modal-backdrop show"><section className="modal-box" role="dialog" aria-modal="true" aria-labelledby="login-title"><div className="modal-header-styled"><h2 className="modal-title-bold" id="login-title">Đăng nhập để đặt vé</h2><button className="modal-close" aria-label="Đóng" onClick={() => setLoginRequired(false)}><X size={20} /></button></div><div className="modal-body-padded"><p>Bạn cần đăng nhập tài khoản khách hàng trước khi giữ chỗ.</p></div><div className="modal-footer-flex"><button className="btn-modal-back" onClick={() => setLoginRequired(false)}>Tiếp tục xem sự kiện</button><button className="btn-modal-confirm-pay" onClick={() => {
      const url = process.env.NEXT_PUBLIC_LOGIN_URL;
      if (url) window.location.assign(`${url}${url.includes("?") ? "&" : "?"}returnUrl=${encodeURIComponent(`/events/${id}`)}`); else notify("Chức năng đăng nhập đang được cập nhật. Vui lòng thử lại sau.", "info");
    }}>Đăng nhập</button></div></section></div>}
    {review && <div className="modal-backdrop show"><section className="modal-box" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <div className="modal-header-styled"><h2 className="modal-title-bold" id="review-title"><Ticket className="icon teal" />Xác nhận đơn hàng</h2><button className="modal-close" disabled={saving} aria-label="Đóng" onClick={() => setReview(false)}><X size={20} /></button></div>
      <div className="modal-body-padded"><p className="review-event-name">{event.title}</p><table className="review-item-table"><thead><tr><th>Hạng vé</th><th>Số lượng</th><th>Thành tiền</th></tr></thead><tbody>{selected.map(t => <tr key={t.id}><td>{t.name}</td><td>{quantities[t.id]}</td><td>{money(t.price * quantities[t.id])}</td></tr>)}</tbody></table><div className="calc-row total-row"><strong>Tổng thanh toán</strong><strong className="total-amount-display">{money(total)}</strong></div>
        <div className="buyer-verify-box"><p>{total === 0 ? "Bạn có 5 phút để hoàn thiện thông tin và Face ID." : hasFree ? "Thanh toán trong 10 phút; hoàn tất vé miễn phí đến mốc 15 phút kể từ lúc giữ chỗ." : "Bạn có 10 phút để hoàn tất thanh toán VietQR."}</p><p>Vé đã phát hành không được hoàn/hủy vì lý do cá nhân.</p></div>
      </div><div className="modal-footer-flex"><button className="btn-modal-back" disabled={saving} onClick={() => setReview(false)}>Quay lại</button><button className="btn-modal-confirm-pay" disabled={saving} onClick={reserve}>{saving ? "Đang giữ chỗ…" : "Xác nhận & Giữ chỗ"}<ChevronRight className="icon" /></button></div>
    </section></div>}
  </>;
}
