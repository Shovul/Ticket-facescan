"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, Clock3, Copy, Upload, Ticket, UserRound, X, Link2, CreditCard, ChevronRight } from "lucide-react";
import { customerApi, CustomerApiError, eventTime, money } from "../../services/customerApi";
import { Booking, BookingItem, PublicEvent } from "../../types/customer";
import EventInfoPanel from "./EventInfoPanel";
import { useCustomerHeaderKind } from "./CustomerHeader";
import { useNotification } from "../shared/NotificationProvider";

export function AttendeeForm({ item, index, locked, pending, upload, claim }: {
  item: BookingItem; index: number; locked: boolean; pending: boolean;
  upload: (id: number, attendee: { name: string; email: string; phone: string }, image: File) => Promise<void>;
  claim?: (id: number) => Promise<void>;
}) {
  const [name, setName] = useState(item.attendeeName || "");
  const [email, setEmail] = useState(item.attendeeEmail || "");
  const [phone, setPhone] = useState(item.attendeePhone || "");
  const [consent, setConsent] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const previousPreview = useRef<string | null>(null);
  const notify = useNotification();
  useEffect(() => { setName(item.attendeeName || ""); setEmail(item.attendeeEmail || ""); setPhone(item.attendeePhone || ""); }, [item.attendeeName, item.attendeeEmail, item.attendeePhone]);
  useEffect(() => () => { if (previousPreview.current) URL.revokeObjectURL(previousPreview.current); }, []);
  const frozen = locked || pending;
  const attendee = { name: name.trim(), email: email.trim(), phone: phone.trim() };
  const hasValidAttendee = attendee.name.length >= 2 && attendee.name.length <= 100 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.email) && /^\d{10}$/.test(attendee.phone);
  const canUpload = consent && !frozen && hasValidAttendee;

  async function selectImage(file?: File) {
    if (!file) return;
    if (!consent) { notify("Vui lòng đồng ý xử lý dữ liệu khuôn mặt trước khi chọn ảnh.", "error"); return; }
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) { notify("Chọn ảnh JPG/PNG, dung lượng tối đa 5 MB.", "error"); return; }
    try {
      if (!hasValidAttendee) { notify("Vui lòng nhập đúng họ tên, email và số điện thoại trước khi nạp ảnh.", "error"); return; }
      await upload(item.id, attendee, file);
      if (previousPreview.current) URL.revokeObjectURL(previousPreview.current);
      previousPreview.current = URL.createObjectURL(file); setPreview(previousPreview.current);
    } catch {}
  }

  return <section className="attendee-card-item"><div className="attendee-header-row"><strong className="attendee-number">Vé #{index + 1}</strong><span className={`attendee-tier-tag ${/vip/i.test(item.ticketTypeName) ? "vip" : ""}`}>{item.ticketTypeName}</span></div>
    {item.status === "expired" || item.status === "cancelled" ? <p className="booking-help">{item.status === "expired" ? "Vé giữ chỗ đã hết hạn." : "Đã hủy giữ chỗ vé này."}</p> : <>
      {!locked && <div className="method-switch-tabs"><button className={`method-tab-btn ${item.hasActiveClaimLink ? "" : "active"}`} type="button" disabled={item.hasActiveClaimLink}><UserRound size={13} />Tự điền thông tin</button><button className={`method-tab-btn ${item.hasActiveClaimLink ? "active" : ""}`} type="button" disabled={pending || item.hasFaceId || !claim} onClick={() => { void claim?.(item.id).catch(() => {}); }}><Link2 size={13} />{item.hasActiveClaimLink ? "Tạo link mới" : "Gửi link cho bạn bè"}</button></div>}
      {item.hasActiveClaimLink ? <div className="claim-sent-notice"><Link2 size={17} /><div><strong>Đã gửi liên kết nhận vé</strong><span>Người nhận sẽ tự điền thông tin và nạp Face ID qua liên kết. Bạn có thể tạo link mới nếu cần.</span></div></div> : <fieldset disabled={frozen || (item.status === "issued" && item.hasFaceId)}><div className="attendee-input-grid"><label className="field-label">Họ và tên<input className="att-control" value={name} placeholder="Họ và tên người tham dự" required minLength={2} maxLength={100} autoComplete="name" onChange={e => setName(e.target.value)} /></label>
          <label className="field-label">Số điện thoại<input className="att-control" type="tel" value={phone} placeholder="Số điện thoại" required pattern="[0-9]{10}" maxLength={10} autoComplete="tel" onChange={e => setPhone(e.target.value)} /></label>
          <label className="field-label full-width">Email<input className="att-control" type="email" value={email} placeholder="Email nhận thông tin vé" required maxLength={255} autoComplete="email" onChange={e => setEmail(e.target.value)} /></label></div>
        </fieldset>}
      {!item.hasActiveClaimLink && <>
      <div className="att-face-upload-box"><div className="att-face-thumb">{preview ? <img src={preview} alt="Ảnh chân dung đã được kiểm tra" /> : item.hasFaceId ? <CheckCircle2 size={24} className="teal" /> : <UserRound size={24} className="muted" />}</div>
        <div className="att-face-meta"><strong className="face-label">{item.hasFaceId ? "Face ID đã sẵn sàng" : "Nạp ảnh khuôn mặt"}</strong><span className="face-hint">Ảnh rõ mặt, chính diện • JPG/PNG, tối đa 5 MB</span>
          {!locked && canUpload && <label className="btn-upload-single-face"><Upload size={12} />{item.hasFaceId ? "Thay ảnh chân dung" : "Chọn ảnh chân dung"}<input type="file" accept="image/jpeg,image/png" onChange={e => { void selectImage(e.target.files?.[0]); e.target.value = ""; }} /></label>}
          {!locked && !canUpload && <span className="face-upload-requirement">Nhập đủ thông tin và tick đồng ý xử lý ảnh để chọn ảnh.</span>}
        </div>
      </div>
      {!locked && <><label className="face-consent"><input type="checkbox" checked={consent} disabled={pending} onChange={e => setConsent(e.target.checked)} /><span>Tôi đồng ý xử lý ảnh khuôn mặt để nhận diện và đối soát sự kiện. Ảnh gốc được xóa sau 30 ngày kể từ khi sự kiện kết thúc.</span></label><p className="booking-help">Thông tin người tham dự chỉ được lưu sau khi ảnh Face ID hợp lệ.</p></>}</>}
    </>}
    {item.ticketCode && <div className="issued-ticket-code"><Check size={14} /><span>Mã vé: <code>{item.ticketCode}</code></span></div>}
  </section>;
}

export default function BookingCheckout({ code, embedded = false, onBusyChange, onCompleted }: { code: string; embedded?: boolean; onBusyChange?: (busy: boolean) => void; onCompleted?: () => void }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [tick, setTick] = useState(0);
  const [retry, setRetry] = useState(0);
  const [cancelReview, setCancelReview] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  const revision = useRef(0);
  const issuedCount = useRef(0);
  const loaded = useRef(false);
  const completed = useRef(onCompleted);
  completed.current = onCompleted;
  const clock = useRef({ server: 0, received: 0 });
  const notify = useNotification();
  const apply = useCallback((data: Booking) => {
    if (!mounted.current) return;
    clock.current = { server: Date.parse(data.serverTime), received: performance.now() }; setBooking(data); setError("");
    const count = data.items.filter(item => item.status === "issued").length;
    if (loaded.current && count > issuedCount.current && data.items.every(item => item.status !== "reserved"))
      setTimeout(() => { if (mounted.current) completed.current?.(); }, 0);
    loaded.current = true;
    if (issuedCount.current !== count) { issuedCount.current = count; window.dispatchEvent(new Event("eventpass.booking-updated")); }
  }, []);

  useEffect(() => { if (error) notify(error, "error"); }, [error, notify]);
  const eventId = booking?.eventId;
  const headerPrices = event?.tickets.map(t => t.price) || booking?.items.map(i => i.unitPrice) || [];
  useCustomerHeaderKind(!headerPrices.length ? "catalog" : headerPrices.some(p => p > 0) ? headerPrices.some(p => p === 0) ? "hybrid" : "paid" : "free", !embedded);
  useEffect(() => {
    if (!eventId) return;
    const controller = new AbortController();
    customerApi.event(String(eventId), controller.signal).then(data => { if (!controller.signal.aborted) setEvent(data); }).catch(() => {});
    return () => controller.abort();
  }, [eventId]);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController(); let polling = false;
    const refresh = async () => {
      if (busy.current || polling) return;
      polling = true; const version = revision.current;
      try { const data = await customerApi.booking(code, controller.signal); if (version === revision.current && !controller.signal.aborted) apply(data); }
      catch (e) { if (!controller.signal.aborted && version === revision.current) setError((e as Error).message); }
      finally { polling = false; }
    };
    void refresh(); const poll = setInterval(refresh, 5000); const timer = setInterval(() => setTick(v => v + 1), 1000);
    return () => { mounted.current = false; controller.abort(); clearInterval(poll); clearInterval(timer); };
  }, [code, retry, apply]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy.current) setCancelReview(false); };
    document.addEventListener("keydown", escape); return () => document.removeEventListener("keydown", escape);
  }, []);

  async function mutate(action: () => Promise<Booking>, success: string) {
    if (busy.current) throw new Error("Vui lòng đợi thao tác hiện tại hoàn tất.");
    busy.current = true; onBusyChange?.(true); revision.current++; setPending(true); setError("");
    try { apply(await action()); notify(success); }
    catch (e) { if (mounted.current) setError((e as CustomerApiError).message); throw e; }
    finally { busy.current = false; onBusyChange?.(false); if (mounted.current) setPending(false); }
  }
  async function createClaim(itemId: number) {
    if (busy.current) return;
    busy.current = true; onBusyChange?.(true); setPending(true);
    try {
      const link = await customerApi.claimLink(code, itemId);
      await navigator.clipboard.writeText(`${window.location.origin}/claim#${link.token}`);
      apply(await customerApi.booking(code));
      notify("Đã tạo liên kết mới và sao chép. Liên kết cũ không còn hiệu lực.");
    } catch (issue) { notify((issue as Error).message, "error"); }
    finally { busy.current = false; onBusyChange?.(false); if (mounted.current) setPending(false); }
  }
  function countdown(deadline?: string) {
    void tick;
    if (!deadline) return "—";
    const now = clock.current.server + (performance.now() - clock.current.received);
    const seconds = Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  if (!booking) return <main className="storefront-main"><div className="customer-state" role={error ? "alert" : "status"}><h1>{error ? "Chưa thể mở đơn đặt vé" : "Đang tải đơn đặt vé…"}</h1>{error && <><p>{error}</p><button className="btn-modal-back" onClick={() => setRetry(v => v + 1)}>Thử lại</button><Link href="/events" className="breadcrumb-link">Khám phá sự kiện</Link></>}</div></main>;
  const expired = booking.status === "expired" || booking.status === "cancelled";
  const freePending = booking.items.filter(i => i.unitPrice === 0 && i.status === "reserved");
  const canConfirm = !expired && freePending.length > 0 && freePending.every(i => i.hasFaceId && i.attendeeName && i.attendeeEmail && i.attendeePhone)
    && (booking.totalAmount === 0 || !!booking.paidAt) && countdown(booking.expiresAt) !== "00:00";
  const hasIssued = booking.items.some(i => i.status === "issued");
  const hasPending = booking.items.some(i => i.status === "reserved");
  const fallback: PublicEvent = { id: booking.eventId, title: booking.eventTitle, location: booking.location, startTime: booking.startTime, endTime: booking.startTime,
    remainingQuantity: 0, tickets: booking.items.map(i => ({ id: i.ticketTypeId, name: i.ticketTypeName, price: i.unitPrice, remainingQuantity: 0 })) };
  const info = event || fallback;
  const kind = info.tickets.some(t => t.price > 0) ? info.tickets.some(t => t.price === 0) ? "hybrid" : "paid" : "free";
  const showAttendees = booking.totalAmount === 0 || !!booking.paidAt;

  return <>
    {!embedded && <nav className="breadcrumb-nav" aria-label="Đường dẫn"><Link href="/events" className="breadcrumb-link">Trang chủ</Link><span>›</span><Link href={`/events/${booking.eventId}`} className="breadcrumb-link">{booking.eventTitle}</Link><span>›</span><span>Hoàn tất đặt vé</span></nav>}
    <main className={embedded ? "booking-modal-content" : "detail-layout-container event-detail"} data-kind={kind}>{!embedded && <EventInfoPanel event={info} />}
      <aside className="booking-flow-panel"><section className="booking-card">
        {expired ? <div className="expired-booking"><Clock3 size={30} /><h2>{booking.status === "expired" ? "Đơn giữ chỗ đã hết hạn" : "Đơn giữ chỗ đã hủy"}</h2><p>Các suất chưa phát hành đã được trả lại kho sự kiện.</p><Link href="/events" className="btn-proceed-pay">Khám phá sự kiện</Link></div> : <>
          {!hasIssued && booking.totalAmount === 0 && <h2 className="section-heading-row"><Ticket className="icon teal" />Hoàn Tất Thông Tin Nhận Vé</h2>}
          {hasPending && (!booking.paymentExpiresAt || booking.paidAt) && <div className="reservation-countdown-bar active"><span className="timer-label"><Clock3 className="icon" />{booking.totalAmount > 0 ? "Hạn hoàn tất vé miễn phí:" : "Vé đang được khóa tạm giữ:"}</span><strong className="timer-badge">{countdown(booking.expiresAt)}</strong></div>}
          {booking.payment && !booking.paidAt && <div className="vietqr-stage-box active"><h2 className="section-title"><CreditCard className="icon teal" />2. Thanh Toán VietQR</h2>
            <div className="countdown-hold-box"><span>Thời gian thanh toán còn lại:</span><strong className="timer-digit">{countdown(booking.paymentExpiresAt)}</strong></div>
            {freePending.length > 0 && <div className="banner-combined-alert">Đơn kết hợp: thanh toán trong 10 phút. Hoàn tất thông tin và Face ID vé miễn phí trong tổng 15 phút kể từ lúc giữ chỗ.</div>}
            <p className="booking-intro">Quét mã bằng ứng dụng ngân hàng. Chuyển đúng số tiền và giữ nguyên nội dung chuyển khoản.</p>
            <div className="qr-code-frame"><img className="qr-code-img" src={booking.payment.qrUrl} alt="Mã VietQR thanh toán đơn đặt vé" /></div>
            <div className="bank-details-card"><div className="bank-row"><span>Ngân hàng:</span><strong className="bank-val">{booking.payment.bankCode}</strong></div><div className="bank-row"><span>Chủ tài khoản:</span><strong className="bank-val">{booking.payment.accountName}</strong></div><div className="bank-row"><span>Số tài khoản:</span><strong className="bank-val">{booking.payment.accountNumber}</strong></div><div className="bank-row"><span>Số tiền:</span><strong className="bank-val total-amount-display">{money(booking.payment.amount)}</strong></div><div className="bank-row"><span>Nội dung:</span><strong className="bank-val transfer-memo">{booking.payment.memo}</strong><button className="copy-memo" aria-label="Sao chép nội dung chuyển khoản" onClick={async () => { try { await navigator.clipboard.writeText(booking.payment!.memo); notify("Đã sao chép nội dung chuyển khoản."); } catch { notify("Không sao chép được. Bạn hãy chọn nội dung để sao chép thủ công.", "error"); } }}><Copy size={14} /></button></div></div>
            <div className="payment-polling-spinner" role="status"><span className="spinner-dot" />{countdown(booking.paymentExpiresAt) === "00:00" ? "Đang cập nhật trạng thái hết hạn…" : "Đang chờ xác nhận thanh toán từ ngân hàng…"}</div>
          </div>}
          {hasIssued && <div className="success-banner"><h2>{booking.paidAt ? "THANH TOÁN THÀNH CÔNG!" : "ĐĂNG KÝ VÉ THÀNH CÔNG!"}</h2><p>Mã đơn hàng: <strong className="booking-order-code">{booking.orderCode}</strong></p><p>{booking.paidAt ? "Vé có phí đã được phát hành và bảo lưu." : "Vé miễn phí đã được phát hành chính thức."}</p></div>}
        </>}
        {showAttendees && <div className="attendees-container"><div className="attendees-title">{hasIssued ? "Danh sách vé & Kích hoạt Face ID" : "Danh sách vé"} ({booking.items.length} vé)</div>
          {booking.items.map((item, index) => <AttendeeForm key={item.id} item={item} index={index} locked={expired || item.status === "expired" || item.status === "cancelled" || Date.parse(booking.startTime) <= clock.current.server + performance.now() - clock.current.received} pending={pending}
            claim={createClaim}
            upload={async (id, attendee, file) => { await mutate(() => customerApi.face(code, id, attendee, file, true), "Face ID đã được kiểm tra và lưu thành công."); }} />)}
          {freePending.length > 0 && !expired && <button className="btn-confirm-booking-all" disabled={!canConfirm || pending} onClick={() => { void mutate(() => customerApi.confirmFree(code), "Đã phát hành vé miễn phí chính thức.").catch(() => {}); }}>{pending ? "Đang xử lý…" : "Xác Nhận Nhận Vé Chính Thức"}<ChevronRight className="icon" /></button>}
        </div>}
        {hasIssued && <div className="issued-pass-list">{booking.items.filter(i => i.ticketCode).map(item => <details className="purchased-ticket-item" key={item.id}><summary><span>{item.ticketTypeName}</span><span className="teal">Xem mã vé</span></summary><code className="ticket-code-tag">{item.ticketCode}</code>{item.qrCodeUrl && <img className="issued-qr" src={item.qrCodeUrl} alt={`QR dự phòng vé ${item.ticketCode}`} />}<p className="booking-help">{item.hasFaceId ? "Face ID sẵn sàng cho làn nhận diện." : "Bổ sung Face ID trước khi vào làn nhận diện. Khi cần đối soát, xuất trình mã vé tại quầy hỗ trợ."}</p></details>)}<p className="booking-help">{booking.emailSent ? "Email xác nhận đã được gửi." : "Vé có hiệu lực trên hệ thống ngay cả khi chưa nhận được email xác nhận."}</p>{!embedded && <Link href="/my-tickets" className="btn-proceed-pay">Vé của tôi</Link>}</div>}
        <div className="order-summary-box"><div className="calc-row"><span>Tổng số vé</span><strong>{booking.items.length} vé</strong></div><div className="calc-row total-row"><span>Tổng thanh toán</span><strong className="total-amount-display">{money(booking.totalAmount)}</strong></div><p className="booking-help">Vé đã phát hành không được hoàn/hủy vì lý do cá nhân.</p>
          {!hasIssued && hasPending && !expired && <button className="btn-modal-back" disabled={pending} onClick={() => setCancelReview(true)}>Hủy phiên giữ chỗ</button>}
        </div>
      </section></aside>
    </main>
    {cancelReview && <div className="modal-backdrop show"><section className="modal-box" role="dialog" aria-modal="true" aria-labelledby="cancel-title"><div className="modal-header-styled"><h2 className="modal-title-bold" id="cancel-title">Hủy phiên giữ chỗ?</h2><button className="modal-close" aria-label="Đóng" disabled={pending} onClick={() => setCancelReview(false)}><X size={20} /></button></div><div className="modal-body-padded"><p>Các suất chưa phát hành sẽ được trả lại kho sự kiện. Bạn có thể đặt lại nếu còn vé.</p></div><div className="modal-footer-flex"><button className="btn-modal-back" disabled={pending} onClick={() => setCancelReview(false)}>Tiếp tục giữ chỗ</button><button className="btn-modal-confirm-pay danger-button" disabled={pending} onClick={() => { void mutate(() => customerApi.cancel(code), "Đã hủy phiên giữ chỗ.").then(() => setCancelReview(false)).catch(() => {}); }}>Xác nhận hủy</button></div></section></div>}
  </>;
}
