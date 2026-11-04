"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useMemo } from "react";
import { CalendarDays, Clock3, MapPin, ChevronRight, Search, Building2, Ticket, X } from "lucide-react";
import { customerApi, eventSchedule, money } from "../../../services/customerApi";
import { PublicEventPage, PublicEvent } from "../../../types/customer";
import Pagination from "../../../components/shared/Pagination";
import { useNotification } from "../../../components/shared/NotificationProvider";

// "Cấu hình danh mục sự kiện chuẩn hóa theo thiết kế"
const CATEGORIES = [
  { id: "music", label: "Âm nhạc & Biểu diễn", defaultCount: 12 },
  { id: "workshop", label: "Workshop & Công nghệ", defaultCount: 8 },
  { id: "seminar", label: "Tọa đàm & Hội thảo", defaultCount: 6 },
  { id: "sports", label: "Thể thao", defaultCount: 5 },
  { id: "career", label: "Hướng nghiệp & Tuyển dụng", defaultCount: 4 },
];

export default function EventsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const catalog = useRef<HTMLElement>(null);
  const notify = useNotification();

  // "Các giá trị bộ lọc được trích xuất từ URL search params"
  const term = (params.get("search") || "").trim();
  const sort = ["time", "remaining", "name"].includes(params.get("sort") || "") ? params.get("sort")! : "time";
  const requestedPage = Number(params.get("page") || "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const urlTicketType = params.get("ticketType") || "all";
  const urlMaxPrice = params.get("maxPrice") ? Number(params.get("maxPrice")) : 500000;
  const urlCategories = useMemo(() => {
    const raw = params.get("categories");
    return raw ? raw.split(",").filter(Boolean) : [];
  }, [params]);
  const urlStartDate = params.get("startDate") || "";
  const urlEndDate = params.get("endDate") || "";

  // "State quản lý bộ lọc tương tác trên giao diện"
  const [data, setData] = useState<PublicEventPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const [freeActive, setFreeActive] = useState(urlTicketType === "free" || urlTicketType === "both");
  const [paidActive, setPaidActive] = useState(urlTicketType === "paid" || urlTicketType === "both");
  const [maxPrice, setMaxPrice] = useState(urlMaxPrice);
  const [selectedCats, setSelectedCats] = useState<string[]>(urlCategories);
  const [startDate, setStartDate] = useState(urlStartDate);
  const [endDate, setEndDate] = useState(urlEndDate);
  const [showMoreCats, setShowMoreCats] = useState(false);

  // "Đồng bộ state khi URL thay đổi"
  useEffect(() => {
    setFreeActive(urlTicketType === "free" || urlTicketType === "both");
    setPaidActive(urlTicketType === "paid" || urlTicketType === "both");
    setMaxPrice(urlMaxPrice);
    setSelectedCats(urlCategories);
    setStartDate(urlStartDate);
    setEndDate(urlEndDate);
  }, [urlTicketType, urlMaxPrice, urlCategories, urlStartDate, urlEndDate]);

  // "Tải danh sách sự kiện từ API dựa theo tham số bộ lọc ngày và loại vé"
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    let computedTicketType = "all";
    if (freeActive && paidActive) computedTicketType = "both";
    else if (freeActive) computedTicketType = "free";
    else if (paidActive) computedTicketType = "paid";

    customerApi.events({
      search: term || undefined,
      sort,
      page,
      ticketType: computedTicketType,
      minPrice: 0,
      maxPrice: maxPrice < 500000 ? maxPrice : undefined,
      categories: selectedCats.length > 0 ? selectedCats : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }, sort, page, controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch(issue => {
      if (!controller.signal.aborted) {
        setError(issue.message);
        notify(issue.message, "error");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [term, sort, page, freeActive, paidActive, maxPrice, selectedCats, startDate, endDate, retry, notify]);

  // "Điều hướng và cập nhật query params lên URL"
  function applyFiltersToUrl(updates: Record<string, string | null>) {
    const query = new URLSearchParams(params.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (!val) query.delete(key);
      else query.set(key, val);
    });
    router.replace(`/events?${query.toString()}`, { scroll: false });
    catalog.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // "Xử lý chọn loại vé: tất cả, miễn phí hoặc có phí"
  function toggleTicketType(type: "all" | "free" | "paid") {
    let nextFree = freeActive;
    let nextPaid = paidActive;

    if (type === "all") {
      nextFree = false;
      nextPaid = false;
    } else if (type === "free") {
      nextFree = !freeActive;
    } else if (type === "paid") {
      nextPaid = !paidActive;
    }

    setFreeActive(nextFree);
    setPaidActive(nextPaid);

    let nextType = "all";
    if (nextFree && nextPaid) nextType = "both";
    else if (nextFree) nextType = "free";
    else if (nextPaid) nextType = "paid";

    applyFiltersToUrl({ ticketType: nextType === "all" ? null : nextType, page: "1" });
  }

  // "Chuyển đổi trạng thái chọn của danh mục sự kiện"
  function toggleCategory(catId: string) {
    const next = selectedCats.includes(catId)
      ? selectedCats.filter(id => id !== catId)
      : [...selectedCats, catId];
    setSelectedCats(next);
    applyFiltersToUrl({ categories: next.length > 0 ? next.join(",") : null, page: "1" });
  }

  // "Xóa toàn bộ các tiêu chí lọc về mặc định"
  function resetAllFilters() {
    setFreeActive(false);
    setPaidActive(false);
    setMaxPrice(500000);
    setSelectedCats([]);
    setStartDate("");
    setEndDate("");
    applyFiltersToUrl({
      ticketType: null,
      maxPrice: null,
      categories: null,
      startDate: null,
      endDate: null,
      page: "1",
    });
  }

  // "Hiển thị nhãn giá tiền của vé sự kiện"
  function renderTicketPills(event: PublicEvent) {
    const hasFree = event.tickets.some(t => t.price === 0);
    const paidTickets = event.tickets.filter(t => t.price > 0).sort((a, b) => a.price - b.price);

    return (
      <div className="card-tier-pills">
        {hasFree && <span className="tier-pill free">Miễn phí</span>}
        {paidTickets.length > 0 && (
          <span className={`tier-pill ${paidTickets.some(t => /vip/i.test(t.name)) ? "vip" : ""}`}>
            {paidTickets.some(t => /vip/i.test(t.name)) ? `VIP từ ${money(paidTickets[0].price)}` : `Từ ${money(paidTickets[0].price)}`}
          </span>
        )}
      </div>
    );
  }

  return (
    <main className="storefront-main" ref={catalog}>
      {/* Thanh tiêu đề và sắp xếp */}
      <div className="filter-toolbar-card">
        <div className="filter-info-label">
          <CalendarDays className="icon teal" size={18} />
          <span>Danh sách sự kiện đang mở đăng ký</span>
        </div>
        <div className="sort-select-box">
          <label htmlFor="event-sort">Sắp xếp theo:</label>
          <select
            id="event-sort"
            className="sort-select"
            value={sort}
            onChange={e => applyFiltersToUrl({ sort: e.target.value, page: "1" })}
          >
            <option value="time">Thời gian: Gần nhất trước</option>
            <option value="remaining">Số lượng vé: Sắp hết trước</option>
            <option value="name">Tên sự kiện: A - Z</option>
          </select>
        </div>
      </div>

      {/* Bố cục 2 cột: Sidebar bộ lọc bên trái và Danh sách sự kiện bên phải */}
      <div className="storefront-content-wrap">
        {/* Sidebar Bộ lọc nâng cao */}
        <aside className="filter-sidebar-card">
          <div className="sidebar-header">
            <span className="sidebar-title">Bộ lọc</span>
            <button type="button" className="btn-reset-filters" onClick={resetAllFilters}>
              Xóa tất cả
            </button>
          </div>

          {/* Nhóm 1: Loại vé */}
          <div className="filter-section">
            <span className="filter-section-title">Loại vé</span>
            <div className="ticket-type-buttons">
              <button
                type="button"
                className={`btn-type-pill ${!freeActive && !paidActive ? "active" : ""}`}
                onClick={() => toggleTicketType("all")}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`btn-type-pill ${freeActive ? "active" : ""}`}
                onClick={() => toggleTicketType("free")}
              >
                Miễn phí
              </button>
              <button
                type="button"
                className={`btn-type-pill ${paidActive ? "active" : ""}`}
                onClick={() => toggleTicketType("paid")}
              >
                Có phí
              </button>
            </div>
            <p className="ticket-type-hint">
              Chọn cả hai để xem sự kiện có cả vé miễn phí và vé thu phí.
            </p>
          </div>

          {/* Nhóm 2: Khoảng giá */}
          <div className="filter-section">
            <div className="price-display-row">
              <span className="filter-section-title">Giá vé</span>
              <span className="price-value-text">0đ – {money(maxPrice)}</span>
            </div>
            <div className="price-slider-wrap">
              <input
                type="range"
                className="price-range-slider"
                min={0}
                max={500000}
                step={25000}
                value={maxPrice}
                onChange={e => setMaxPrice(Number(e.target.value))}
                onMouseUp={() => applyFiltersToUrl({ maxPrice: maxPrice < 500000 ? String(maxPrice) : null, page: "1" })}
                onTouchEnd={() => applyFiltersToUrl({ maxPrice: maxPrice < 500000 ? String(maxPrice) : null, page: "1" })}
              />
            </div>
          </div>

          {/* Nhóm 3: Loại sự kiện */}
          <div className="filter-section">
            <span className="filter-section-title">Loại sự kiện</span>
            <div className="category-checkbox-list">
              {(showMoreCats ? CATEGORIES : CATEGORIES.slice(0, 5)).map(cat => (
                <label key={cat.id} className="category-checkbox-item">
                  <span className="category-checkbox-label">
                    <input
                      type="checkbox"
                      className="category-checkbox-input"
                      checked={selectedCats.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                    />
                    <span>{cat.label}</span>
                  </span>
                  <span className="category-count-badge">
                    {data?.categoryCounts?.[cat.id] ?? cat.defaultCount}
                  </span>
                </label>
              ))}
            </div>
            {CATEGORIES.length > 5 && (
              <button
                type="button"
                className="btn-show-more-categories"
                onClick={() => setShowMoreCats(v => !v)}
              >
                {showMoreCats ? "Thu gọn" : "Xem thêm"}
              </button>
            )}
          </div>

          {/* Nhóm 4: Thời gian (chỉ lọc theo ngày) */}
          <div className="filter-section">
            <div className="date-header-row">
              <span className="filter-section-title">Thời gian</span>
              {(startDate || endDate) && (
                <button
                  type="button"
                  className="btn-clear-date"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    applyFiltersToUrl({ startDate: null, endDate: null, page: "1" });
                  }}
                >
                  Xóa ngày
                </button>
              )}
            </div>
            <div className="date-inputs-row">
              <input
                type="date"
                className="date-input-field"
                title="Từ ngày"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  applyFiltersToUrl({ startDate: e.target.value || null, page: "1" });
                }}
              />
              <span className="date-separator">–</span>
              <input
                type="date"
                className="date-input-field"
                title="Đến ngày"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  applyFiltersToUrl({ endDate: e.target.value || null, page: "1" });
                }}
              />
            </div>
          </div>

          {/* Nút lọc kết quả */}
          <button
            type="button"
            className="btn-apply-filters"
            onClick={() => catalog.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            Xem {loading ? "…" : data?.totalCount ?? 0} kết quả
          </button>
        </aside>

        {/* Nội dung kết quả bên phải */}
        <div className="catalog-content-panel">
          {/* Thanh hiển thị các bộ lọc đang chọn (Active Filter Chips) */}
          <div className="active-chips-toolbar">
            <div className="active-chips-list">
              <span className="active-count-label">
                {loading ? "Đang tải…" : `${data?.totalCount ?? 0} sự kiện`}
              </span>

              {freeActive && paidActive && (
                <span className="filter-badge-chip" onClick={() => toggleTicketType("all")}>
                  Miễn phí + Có phí <X size={12} />
                </span>
              )}
              {freeActive && !paidActive && (
                <span className="filter-badge-chip" onClick={() => toggleTicketType("free")}>
                  Miễn phí <X size={12} />
                </span>
              )}
              {!freeActive && paidActive && (
                <span className="filter-badge-chip" onClick={() => toggleTicketType("paid")}>
                  Có phí <X size={12} />
                </span>
              )}

              {selectedCats.map(catId => {
                const item = CATEGORIES.find(c => c.id === catId);
                return (
                  <span key={catId} className="filter-badge-chip" onClick={() => toggleCategory(catId)}>
                    {item?.label.split("&")[0].trim() || catId} <X size={12} />
                  </span>
                );
              })}

              {(startDate || endDate) && (
                <span
                  className="filter-badge-chip"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    applyFiltersToUrl({ startDate: null, endDate: null, page: "1" });
                  }}
                >
                  {startDate && endDate ? `${startDate} – ${endDate}` : startDate ? `Từ ${startDate}` : `Đến ${endDate}`}{" "}
                  <X size={12} />
                </span>
              )}
            </div>

            {(freeActive || paidActive || selectedCats.length > 0 || startDate || endDate || maxPrice < 500000) && (
              <button type="button" className="btn-clear-chips" onClick={resetAllFilters}>
                Xóa bộ lọc
              </button>
            )}
          </div>

          {loading && <div className="customer-state" role="status">Đang tải sự kiện…</div>}

          {!loading && error && (
            <div className="customer-state" role="alert">
              <p>{error}</p>
              <button className="btn-modal-back" onClick={() => setRetry(v => v + 1)}>
                Thử lại
              </button>
            </div>
          )}

          {!loading && !error && data?.items.length === 0 && (
            <div className="customer-state catalog-empty">
              <Search size={40} />
              <h2>Không tìm thấy sự kiện nào</h2>
              <p>{term ? "Hãy thử tìm kiếm với từ khóa khác hoặc điều chỉnh bộ lọc." : "Hiện chưa có sự kiện phù hợp với bộ lọc bạn chọn."}</p>
            </div>
          )}

          {/* Lưới danh sách sự kiện */}
          {!loading && !error && (
            <div className="event-catalog-grid">
              {data?.items.map((event, index) => (
                <article className="event-item-card" key={event.id}>
                  <Link href={`/events/${event.id}`} className={`card-cover-wrap cover-gradient-${index % 4}`} aria-label={`Xem ${event.title}`}>
                    {event.coverImage ? (
                      <img
                        className="card-cover-img"
                        src={event.coverImage}
                        alt=""
                        onError={e => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : null}
                    <span className={`card-status-badge ${event.remainingQuantity === 0 ? "upcoming" : "open"}`}>
                      {event.remainingQuantity === 0 ? "Hết vé" : "Đang mở vé"}
                    </span>
                  </Link>

                  <div className="card-body-content">
                    <div>
                      <div className="card-org-tag">
                        {event.organizerAvatarUrl ? (
                          <img
                            className="card-org-avatar"
                            src={event.organizerAvatarUrl}
                            alt=""
                            onError={e => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <Building2 size={18} />
                        )}
                        <span>{event.organizerName || "Ban tổ chức EventPass"}</span>
                      </div>
                      <h2 className="card-event-title">
                        <Link href={`/events/${event.id}`}>{event.title}</Link>
                      </h2>
                      <div className="card-meta-list">
                        <div className="meta-row">
                          <Clock3 className="icon" />
                          <span>{eventSchedule(event.startTime, event.endTime)}</span>
                        </div>
                        <div className="meta-row">
                          <MapPin className="icon" />
                          <span>{event.location}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {renderTicketPills(event)}
                      <div className="card-action-footer">
                        <span className="slot-left-info">
                          Còn <strong>{event.remainingQuantity}</strong> chỗ
                        </span>
                        <Link href={`/events/${event.id}`} className="btn-book-ticket">
                          Đặt vé ngay <ChevronRight className="icon" size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Phân trang */}
          <div className="catalog-pagination-wrap">
            <span aria-live="polite">
              {loading ? "Đang tải…" : <>Hiển thị <strong>{error ? 0 : data?.totalCount || 0}</strong> sự kiện</>}
            </span>
            <Pagination
              page={data?.page || page}
              totalPages={error ? 0 : data?.totalPages || 0}
              disabled={loading || !!error}
              onChange={next => applyFiltersToUrl({ page: String(next) })}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
