"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Search, LogIn, LogOut, Ticket, UserRound, ChevronDown } from "lucide-react";
import { customerApi, customerToken } from "../../services/customerApi";
import { CustomerSummary } from "../../types/customer";
import { useNotification } from "../shared/NotificationProvider";

type HeaderKind = "catalog" | "free" | "paid" | "hybrid";
const HeaderContext = createContext<{ kind: HeaderKind; setKind: (kind: HeaderKind) => void }>({ kind: "catalog", setKind: () => {} });

export function CustomerPageProvider({ children }: { children: React.ReactNode }) {
  const [kind, setKind] = useState<HeaderKind>("catalog");
  const value = useMemo(() => ({ kind, setKind }), [kind]);
  return <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>;
}

// Giữ đúng nhãn và thanh tiện ích của từng mẫu trang miễn phí, có phí hoặc kết hợp.
export function useCustomerHeaderKind(kind: HeaderKind) {
  const { setKind } = useContext(HeaderContext);
  useEffect(() => { setKind(kind); return () => setKind("catalog"); }, [kind, setKind]);
}

export default function CustomerHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { kind } = useContext(HeaderContext);
  const catalog = pathname === "/events" || kind === "catalog";
  const tag = catalog ? "TICKET" : kind === "paid" ? "CHECKOUT" : kind === "hybrid" ? "HYBRID" : "FREE";
  const utility = catalog ? "Cổng phát hành vé điện tử & Điểm danh khuôn mặt siêu tốc • Chuẩn hội trường thông minh"
    : kind === "free" ? "Sự kiện Miễn Phí • Điểm danh tự động qua cổng Kiosk Face ID < 1 giây"
      : kind === "paid" ? "Cổng thanh toán tự động VietQR • Thanh toán chuyển khoản tức thì qua mọi ứng dụng ngân hàng"
        : "Cổng phát hành vé điện tử & Kiểm soát khuôn mặt Face ID tự động • SGU Event Smart";
  const notify = useNotification();
  const query = params.get("search") || "";
  const [search, setSearch] = useState(query);
  const [identity, setIdentity] = useState<CustomerSummary | null>(null);
  const [menu, setMenu] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setSearch(query); }, [query]);
  useEffect(() => {
    let controller: AbortController | null = null;
    const refresh = async () => {
      controller?.abort(); controller = new AbortController();
      const current = controller;
      try {
        const token = customerToken();
        if (!token) { setIdentity(null); return; }
        const customer = await customerApi.customer(current.signal);
        if (!current.signal.aborted) setIdentity(customer);
      } catch { if (!current.signal.aborted) setIdentity(null); }
    };
    void refresh(); window.addEventListener("storage", refresh); window.addEventListener("focus", refresh); window.addEventListener("eventpass.booking-updated", refresh);
    return () => { controller?.abort(); window.removeEventListener("storage", refresh); window.removeEventListener("focus", refresh); window.removeEventListener("eventpass.booking-updated", refresh); };
  }, [pathname]);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!wrapper.current?.contains(event.target as Node)) setMenu(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenu(false); };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, []);

  function find(value: string) {
    const next = new URLSearchParams(pathname === "/events" ? params.toString() : "");
    if (value.trim()) next.set("search", value.trim()); else next.delete("search");
    next.delete("page"); router.replace(`/events${next.size ? `?${next}` : ""}`, { scroll: false });
  }
  function destination(url: string | undefined) {
    if (url) { window.location.assign(url); return; }
    notify("Chức năng đang được cập nhật. Vui lòng thử lại sau.", "info");
  }
  function logout() {
    sessionStorage.removeItem("access_token"); localStorage.removeItem("access_token"); localStorage.removeItem("accessToken");
    sessionStorage.removeItem("eventpass.activeBooking"); sessionStorage.removeItem("eventpass.reservationRequest");
    setIdentity(null); setMenu(false); notify("Đã đăng xuất tài khoản."); router.push("/events");
  }

  return <>
    <div className="top-bar"><span>{utility}</span><span>{catalog ? "Tổng đài hỗ trợ sự kiện:" : kind === "paid" ? "Tổng đài CSKH:" : "Hotline hỗ trợ:"} <strong>1900 888 234</strong></span></div>
    <header className="store-header"><div className="navbar-main">
      <Link href="/events" className="brand-logo">EventPass<span className="pass-tag">{tag}</span><span className="accent-dot" /></Link>
      {catalog && <form className="navbar-search-box" role="search" onSubmit={e => { e.preventDefault(); if (searchTimer.current) clearTimeout(searchTimer.current); find(search); }}>
        <input className="nav-search-input" aria-label="Tìm sự kiện" placeholder="Tìm tên sự kiện, địa điểm, đơn vị tổ chức..." maxLength={200} value={search} onChange={e => {
          const value = e.target.value; setSearch(value); if (searchTimer.current) clearTimeout(searchTimer.current);
          if (pathname === "/events") searchTimer.current = setTimeout(() => find(value), 300);
        }} /><button className="nav-search-btn" aria-label="Tìm kiếm" type="submit"><Search className="icon" /></button>
      </form>}
      <div className="nav-right-cluster">{!identity ? <div className="guest-nav-actions">
        <button className="btn-guest-login" onClick={() => destination(process.env.NEXT_PUBLIC_LOGIN_URL)}><LogIn className="icon" /><span>Đăng nhập</span></button>
        <button className="btn-guest-register" onClick={() => destination(process.env.NEXT_PUBLIC_REGISTER_URL)}>Đăng ký</button>
      </div> : <div className="logged-nav-actions">
        <button className="nav-action-link" onClick={() => destination(process.env.NEXT_PUBLIC_MY_TICKETS_URL)}><Ticket className="icon" /><span>Vé của tôi</span><span className="badge-tag-count" aria-label={`${identity.ticketCount} vé còn hiệu lực`}>{identity.ticketCount}</span></button>
        <div className="user-menu-wrapper" ref={wrapper}><button className="user-dropdown-trigger" aria-expanded={menu} aria-controls="customer-user-menu" onClick={() => setMenu(v => !v)}>
          <span className="user-avatar-tiny"><UserRound size={22} />{identity.avatarUrl && <img src={identity.avatarUrl} alt="" onError={e => { e.currentTarget.style.display = "none"; }} />}</span><span className="user-name-text">{identity.fullName}</span>{catalog && <ChevronDown className="icon" size={13} />}
        </button>{menu && <ul className="user-dropdown-menu" id="customer-user-menu">
          <li><button className="dropdown-item-link" onClick={() => { setMenu(false); destination(process.env.NEXT_PUBLIC_PROFILE_URL); }}><UserRound className="icon" />Hồ sơ &amp; Đổi mật khẩu</button></li>
          <li><button className="dropdown-item-link" onClick={() => { setMenu(false); destination(process.env.NEXT_PUBLIC_MY_TICKETS_URL); }}><Ticket className="icon" />Danh sách vé đã đặt</button></li>
          <li><button className="dropdown-item-link danger" onClick={logout}><LogOut className="icon" />Đăng xuất tài khoản</button></li>
        </ul>}</div>
      </div>}</div>
    </div></header>
  </>;
}
