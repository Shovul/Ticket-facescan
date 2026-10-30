"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { customerApi, customerToken } from "../../services/customerApi";
import { useNotification } from "../shared/NotificationProvider";

type HeaderKind = "catalog" | "free" | "paid" | "hybrid" | "tickets";
const HeaderContext = createContext<{ kind: HeaderKind; setKind: (kind: HeaderKind) => void }>({
  kind: "catalog",
  setKind: () => {},
});

export function CustomerPageProvider({ children }: { children: React.ReactNode }) {
  const [kind, setKind] = useState<HeaderKind>("catalog");
  const value = useMemo(() => ({ kind, setKind }), [kind]);
  return <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>;
}

export function useCustomerHeaderKind(kind: HeaderKind, enabled = true) {
  const { setKind } = useContext(HeaderContext);
  useEffect(() => {
    if (!enabled) return;
    setKind(kind);
    return () => setKind("catalog");
  }, [kind, setKind, enabled]);
}

interface HeaderUser {
  id?: number;
  fullName: string;
  avatarUrl?: string;
  ticketCount: number;
  role?: string;
  username?: string;
}

export default function CustomerHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { kind } = useContext(HeaderContext);

  const catalog = pathname === "/events" || kind === "catalog";
  const tag =
    kind === "tickets"
      ? "PASS"
      : catalog
      ? "TICKET"
      : kind === "paid"
      ? "CHECKOUT"
      : kind === "hybrid"
      ? "HYBRID"
      : "FREE";

  const utility = catalog
    ? "Cổng phát hành vé điện tử & Điểm danh khuôn mặt siêu tốc • Chuẩn hội trường thông minh"
    : kind === "free"
    ? "Sự kiện Miễn Phí • Điểm danh tự động qua cổng Kiosk Face ID < 1 giây"
    : kind === "paid"
    ? "Cổng thanh toán tự động VietQR • Thanh toán chuyển khoản tức thì qua mọi ứng dụng ngân hàng"
    : "Cổng phát hành vé điện tử & Kiểm soát khuôn mặt Face ID tự động • SGU Event Smart";

  const notify = useNotification();
  const query = params.get("search") || "";
  const [search, setSearch] = useState(query);
  const [identity, setIdentity] = useState<HeaderUser | null>(null);
  const [menu, setMenu] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearch(query);
  }, [query]);

  useEffect(() => {
    let controller: AbortController | null = null;

    const refresh = async () => {
      if (typeof window === "undefined") return;
      const token = customerToken();
      if (!token) {
        setIdentity(null);
        return;
      }

      let currentRole = "";
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          currentRole = u.role || "";
          setIdentity((prev) => ({
            id: u.userId || u.id,
            fullName: u.fullName || u.username || "Thành viên",
            avatarUrl: u.avatarUrl || prev?.avatarUrl,
            ticketCount: prev?.ticketCount ?? 0,
            role: u.role,
            username: u.username,
          }));
        } catch {}
      }

      controller?.abort();
      controller = new AbortController();
      const current = controller;

      try {
        const customer = await customerApi.customer(current.signal);
        if (!current.signal.aborted && customer) {
          setIdentity((prev) => ({
            id: customer.id,
            fullName: customer.fullName || prev?.fullName || "Thành viên",
            avatarUrl: customer.avatarUrl || prev?.avatarUrl,
            ticketCount: customer.ticketCount ?? 0,
            role: prev?.role || currentRole,
            username: prev?.username,
          }));
        }
      } catch (err: any) {
        if (!current.signal.aborted) {
          if (err?.status === 401) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("access_token");
            localStorage.removeItem("user");
            setIdentity(null);
          }
        }
      }
    };

    void refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("auth-state-change", refresh);
    window.addEventListener("eventpass.booking-updated", refresh);

    return () => {
      controller?.abort();
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("auth-state-change", refresh);
      window.removeEventListener("eventpass.booking-updated", refresh);
    };
  }, [pathname]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) {
        setMenu(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  function find(value: string) {
    const next = new URLSearchParams(pathname === "/events" ? params.toString() : "");
    if (value.trim()) next.set("search", value.trim());
    else next.delete("search");
    next.delete("page");
    router.replace(`/events${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  function logout() {
    sessionStorage.removeItem("access_token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    sessionStorage.removeItem("eventpass.activeBooking");
    sessionStorage.removeItem("eventpass.reservationRequest");
    setIdentity(null);
    setMenu(false);
    window.dispatchEvent(new Event("auth-state-change"));
    notify("Đã đăng xuất tài khoản.", "info");
    router.push("/events");
  }

  return (
    <>
      {/* 1. TOP BAR */}
      <div className="top-bar">
        <span>{utility}</span>
        <span>
          {catalog ? "Tổng đài hỗ trợ sự kiện:" : kind === "paid" ? "Tổng đài CSKH:" : "Hotline hỗ trợ:"}{" "}
          <strong>1900 888 234</strong>
        </span>
      </div>

      {/* 2. NAVBAR SỰ KIỆN */}
      <header className="store-header">
        <div className="navbar-main">
          <Link href="/events" className="brand-logo">
            EventPass<span className="pass-tag">{tag}</span>
            <span className="accent-dot" />
          </Link>

          {/* Ô TÌM KIẾM SỰ KIỆN */}
          {catalog && (
            <form
              className="navbar-search-box"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                if (searchTimer.current) clearTimeout(searchTimer.current);
                find(search);
              }}
            >
              <input
                id="eventSearchInput"
                className="nav-search-input"
                aria-label="Tìm sự kiện"
                placeholder="Tìm tên sự kiện, địa điểm, đơn vị tổ chức..."
                maxLength={200}
                value={search}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearch(value);
                  if (searchTimer.current) clearTimeout(searchTimer.current);
                  if (pathname === "/events") {
                    searchTimer.current = setTimeout(() => find(value), 300);
                  }
                }}
              />
              <button className="nav-search-btn" aria-label="Tìm kiếm" type="submit" title="Tìm kiếm">
                <svg className="icon" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </button>
            </form>
          )}

          {/* VÙNG ĐIỀU HƯỚNG TÙY BIẾN THEO TRẠNG THÁI (GUEST / LOGGED IN) */}
          <div className="nav-right-cluster">
            {!identity ? (
              /* TRẠNG THÁI 1: KHÁCH VÃNG LAI (CHƯA ĐĂNG NHẬP) */
              <div className="guest-nav-actions" id="guestNavCluster">
                <Link href="/login" className="btn-guest-login">
                  <svg className="icon" viewBox="0 0 24 24">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  <span>Đăng nhập</span>
                </Link>
                <Link href="/register" className="btn-guest-register">
                  Đăng ký
                </Link>
              </div>
            ) : (
              /* TRẠNG THÁI 2: ĐÃ ĐĂNG NHẬP */
              <div className="logged-nav-actions" id="loggedNavCluster">
                <Link href="/my-tickets" className="nav-action-link" title="Xem vé đã đăng ký">
                  <svg className="icon" viewBox="0 0 24 24">
                    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                    <path d="M13 5v2" />
                    <path d="M13 17v2" />
                    <path d="M13 11v2" />
                  </svg>
                  <span>Vé của tôi</span>
                  <span
                    className="badge-tag-count"
                    aria-label={`${identity.ticketCount} vé còn hiệu lực`}
                  >
                    {identity.ticketCount}
                  </span>
                </Link>

                <div className="user-menu-wrapper" ref={wrapper}>
                  <div
                    className="user-dropdown-trigger"
                    onClick={() => setMenu((v) => !v)}
                    aria-expanded={menu}
                    aria-controls="customer-user-menu"
                  >
                    <img
                      src={
                        identity.avatarUrl ||
                        "https://media.istockphoto.com/id/2149922267/vector/user-icon.jpg?s=612x612&w=0&k=20&c=i6jYPfB1pWjK8pll6YRxAK9fgBmf65-w5wbKH9R1dyQ="
                      }
                      className="user-avatar-tiny"
                      alt="Avatar"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://media.istockphoto.com/id/2149922267/vector/user-icon.jpg?s=612x612&w=0&k=20&c=i6jYPfB1pWjK8pll6YRxAK9fgBmf65-w5wbKH9R1dyQ=";
                      }}
                    />
                    <span className="user-name-text">{identity.fullName}</span>
                    <svg className="icon" viewBox="0 0 24 24" style={{ width: 13, height: 13 }}>
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>

                  <ul
                    className={`user-dropdown-menu ${menu ? "open" : ""}`}
                    id="customer-user-menu"
                  >
                    <li>
                      <Link
                        href="/profile"
                        className="dropdown-item-link"
                        onClick={() => setMenu(false)}
                      >
                        <svg className="icon" viewBox="0 0 24 24">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>Hồ sơ &amp; Đổi mật khẩu</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/my-tickets"
                        className="dropdown-item-link"
                        onClick={() => setMenu(false)}
                      >
                        <svg className="icon" viewBox="0 0 24 24">
                          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                        </svg>
                        <span>Danh sách vé đã đặt</span>
                      </Link>
                    </li>
                    {identity.role?.toLowerCase() === "admin" && (
                      <li>
                        <Link
                          href="/admin/events"
                          className="dropdown-item-link"
                          onClick={() => setMenu(false)}
                        >
                          <svg className="icon" viewBox="0 0 24 24">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span>Trang Quản trị (Admin)</span>
                        </Link>
                      </li>
                    )}
                    <li>
                      <button
                        type="button"
                        className="dropdown-item-link danger"
                        onClick={logout}
                        style={{
                          width: "100%",
                          background: "none",
                          border: "none",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <svg className="icon" viewBox="0 0 24 24">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                        </svg>
                        <span>Đăng xuất tài khoản</span>
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
