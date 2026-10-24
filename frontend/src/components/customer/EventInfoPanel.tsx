import { Clock3, MapPin, Users, DollarSign, FileText, Ticket } from "lucide-react";
import { PublicEvent } from "../../types/customer";
import { eventSchedule, money } from "../../services/customerApi";

// Dùng chung cột thông tin sự kiện cho màn chọn vé và các bước hoàn tất đặt vé.
export default function EventInfoPanel({ event }: { event: PublicEvent }) {
  const hasFree = event.tickets.some(t => t.price === 0);
  const hasPaid = event.tickets.some(t => t.price > 0);
  const mixed = hasFree && hasPaid;
  const prices = event.tickets.map(t => t.price);
  const price = !prices.length ? "Chưa có hạng vé" : !hasPaid ? "MIỄN PHÍ 100%" : `Từ ${money(Math.min(...prices))}`;
  return <div className="event-info-panel">
    <section className="event-main-card">
      {event.coverImage ? <img className="event-cover-hero" src={event.coverImage} alt={event.title} onError={e => { e.currentTarget.style.display = "none"; }} /> : <div className="event-cover-hero cover-fallback"><Ticket size={64} /></div>}
      <div className="event-hero-body"><div className="event-status-pill"><span className="status-dot" /><span>{mixed ? "Sự kiện kết hợp (Có hạng vé 0đ & vé thu phí)" : hasPaid ? "Vé có phí • Đăng ký tham dự" : "Vé miễn phí • Đăng ký nhận vé ngay"}</span></div>
        <h1 className="event-title-h1">{event.title}</h1>
        <div className="event-meta-grid">
          <div className="meta-item"><div className="meta-icon-box"><Clock3 className="icon" /></div><div className="meta-text-box"><div>Thời gian tổ chức</div><div>{eventSchedule(event.startTime, event.endTime, true)}</div></div></div>
          <div className="meta-item"><div className="meta-icon-box"><MapPin className="icon" /></div><div className="meta-text-box"><div>Địa điểm tổ chức</div><div>{event.location}</div></div></div>
          {!mixed && <><div className="meta-item"><div className="meta-icon-box"><Users className="icon" /></div><div className="meta-text-box"><div>Đơn vị tổ chức</div><div>{event.organizerName || "Ban tổ chức sự kiện"}</div></div></div>
            <div className="meta-item"><div className="meta-icon-box"><DollarSign className="icon" /></div><div className="meta-text-box"><div>Giá vé tham dự</div><div className="teal">{price}</div></div></div></>}
        </div>
      </div>
    </section>
    {event.description && <section className="event-description-card"><h2 className="section-heading-row"><FileText className="icon teal" />Thông tin sự kiện</h2><p className="event-desc-text preserve-lines">{event.description}</p></section>}
    {mixed ? <section className="policy-box"><h2>Chính sách điều phối thời gian giữ chỗ:</h2><ul>
      <li><strong>Nếu chỉ mua vé miễn phí (0đ):</strong> Giữ chỗ <strong>5 phút</strong> để hoàn tất thông tin và nạp Face ID.</li>
      <li><strong>Nếu mua kết hợp vé miễn phí và có phí:</strong> Thanh toán trong <strong>10 phút</strong>; tổng <strong>15 phút</strong> từ khi giữ chỗ để hoàn tất Face ID vé miễn phí. Vé có phí đã phát hành được bảo lưu.</li>
      <li>Mỗi đơn tối đa <strong>6 vé</strong>. Vé đã phát hành không hoàn/hủy vì lý do cá nhân.</li>
    </ul></section> : <section className="event-description-card"><h2 className="section-heading-row"><FileText className="icon teal" />Quy định nhận vé &amp; Điểm danh Kiosk Face ID</h2>
      <p className="event-desc-text">{hasPaid ? <>Thanh toán VietQR trong <strong>10 phút</strong>. Vé có phí được phát hành sau khi hệ thống xác nhận thanh toán; bạn có thể bổ sung Face ID sau khi nhận vé.</> : <>Sự kiện mở cửa hoàn toàn miễn phí. Mỗi lượt đăng ký có <strong>5 phút giữ chỗ tạm thời</strong> để hoàn tất thông tin và nạp ảnh khuôn mặt cho từng vé.</>} Mỗi đơn tối đa <strong>6 vé</strong>. Vé đã phát hành không được hoàn/hủy vì lý do cá nhân.</p>
    </section>}
  </div>;
}
