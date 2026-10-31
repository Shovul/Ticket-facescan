"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, ShieldCheck, Ticket, Upload, UserRound } from "lucide-react";
import { customerApi, eventTime } from "../../../services/customerApi";
import { ClaimTicket } from "../../../types/customer";
import { useNotification } from "../../../components/shared/NotificationProvider";

export default function ClaimPage() {
  const [claim, setClaim] = useState<ClaimTicket | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [expired, setExpired] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const token = useRef("");
  const busy = useRef(false);
  const notify = useNotification();

  useEffect(() => {
    token.current = window.location.hash.slice(1);
    if (!token.current) { setError("Liên kết nhận vé không hợp lệ."); return; }
    const controller = new AbortController(); let timer: ReturnType<typeof setInterval> | undefined;
    customerApi.claim(token.current, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setClaim(result);
      const received = performance.now(); const server = Date.parse(result.serverTime);
      const check = () => setExpired(server + performance.now() - received >= Date.parse(result.expiresAt));
      check(); timer = setInterval(check, 1000);
    }).catch(issue => { if (!controller.signal.aborted) setError(issue.message); });
    return () => { controller.abort(); if (timer) clearInterval(timer); };
  }, []);

  async function complete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!image || !consent || busy.current || expired) return;
    const values = new FormData(event.currentTarget);
    busy.current = true; setPending(true); setError("");
    try {
      await customerApi.completeClaim(token.current, { name: String(values.get("name")).trim(), email: String(values.get("email")).trim(), phone: String(values.get("phone")).trim() }, image);
      setDone(true); setImage(null); notify("Đã nhận vé và hoàn tất Face ID.");
      window.history.replaceState(null, "", window.location.pathname);
    } catch (issue) { setError((issue as Error).message); notify((issue as Error).message, "error"); }
    finally { busy.current = false; setPending(false); }
  }

  return <main className="storefront-main claim-page"><section className="claim-card">
    <div className="claim-card-heading"><span className="claim-heading-icon"><Ticket size={23} /></span><div><h1>Nhận vé tham dự sự kiện</h1><p>Hoàn tất thông tin và Face ID để kích hoạt vé của bạn.</p></div></div>
    {done ? <div className="claim-success"><CheckCircle2 size={32} /><div><h2>NHẬN VÉ THÀNH CÔNG!</h2><p>Face ID đã sẵn sàng cho vé của bạn. Người đặt có thể xem thẻ vé trong mục Vé của tôi.</p><Link href="/events" className="btn-proceed-pay">Khám phá sự kiện</Link></div></div> : <>
      {error && <div role="alert" className="claim-message error">{error}</div>}
      {!claim && !error && <div role="status" className="claim-message loading">Đang kiểm tra liên kết…</div>}
      {claim && <><section className="claim-event-summary"><span className="claim-ticket-icon"><Ticket size={22} /></span><div><span className="claim-event-label">VÉ ĐƯỢC CHUYỂN CHO BẠN</span><h2>{claim.eventTitle}</h2><p>{claim.ticketTypeName}</p></div><span className="claim-deadline"><Clock3 size={15} />Hạn nhận vé: {eventTime(claim.expiresAt)}</span></section>
        {expired ? <div role="alert" className="claim-message expired"><Clock3 size={20} /><div><strong>Liên kết đã hết hạn</strong><span>Vui lòng liên hệ người đặt vé để nhận liên kết mới.</span></div></div> : <form className="claim-form" onSubmit={complete}><fieldset disabled={pending}>
          <div className="claim-form-title"><UserRound size={19} /><div><h2>Thông tin người tham dự</h2><p>Thông tin này sẽ hiển thị trên vé điện tử.</p></div></div>
          <div className="attendee-input-grid"><label className="field-label">Họ và tên<input className="att-control" name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Nhập họ và tên" /></label><label className="field-label">Số điện thoại<input className="att-control" name="phone" type="tel" required pattern="[0-9]{10}" maxLength={10} autoComplete="tel" placeholder="10 chữ số" /></label><label className="field-label full-width">Email<input className="att-control" name="email" type="email" required maxLength={255} autoComplete="email" placeholder="email@example.com" /></label></div>
          <label className="face-consent"><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} /><span>Tôi đồng ý xử lý ảnh khuôn mặt để nhận diện và đối soát sự kiện. Ảnh gốc được xóa sau 30 ngày kể từ khi sự kiện kết thúc.</span></label>
          {consent ? <div className={`claim-upload ${image ? "selected" : ""}`}><span className="claim-upload-icon">{image ? <CheckCircle2 size={24} /> : <Upload size={24} />}</span><div><strong>{image ? image.name : "Ảnh chân dung để xác thực Face ID"}</strong><span>{image ? "Ảnh đã được chọn. Bạn có thể chọn lại nếu cần." : "Ảnh rõ mặt, chính diện • JPG/PNG, tối đa 5 MB"}</span><label className="btn-upload-single-face"><Upload size={13} />{image ? "Chọn ảnh khác" : "Chọn ảnh chân dung"}<input type="file" accept="image/jpeg,image/png" required onChange={event => {
              const file = event.target.files?.[0];
              if (file && (!["image/jpeg", "image/png"].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024)) { event.target.value = ""; setImage(null); notify("Chọn ảnh JPG/PNG tối đa 5 MB.", "error"); return; }
              setImage(file || null);
            }} /></label></div></div> : <div className="claim-upload-locked"><ShieldCheck size={19} />Tick đồng ý xử lý ảnh để chọn ảnh chân dung.</div>}
          <button className="btn-confirm-booking-all" disabled={pending || !image || !consent}><ShieldCheck size={18} />{pending ? "Đang kiểm tra Face ID…" : "Xác nhận nhận vé"}</button>
        </fieldset></form>}
      </>}
    </>}
  </section></main>;
}
