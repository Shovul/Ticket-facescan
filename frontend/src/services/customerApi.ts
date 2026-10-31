import { Booking, CustomerSummary, PublicEvent, PublicEventPage, CustomerTickets, DigitalPass, ClaimLink, ClaimTicket } from "../types/customer";
import axios from "axios";

const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5162").replace(/\/$/, "").replace(/\/api\/v1$/, "");

// Mở phiên customer mẫu trước khi hiển thị các trang thử, không ghi đè token đăng nhập thật.

export class CustomerApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function customerToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("access_token") || localStorage.getItem("access_token") || localStorage.getItem("accessToken");
}

// Chỉ gửi token từ phiên đăng nhập hiện có, không tự tạo danh tính khách hàng.
async function request<T>(path: string, options: RequestInit = {}, authenticated = false): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Cache-Control", "no-cache");
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (authenticated) {
    const token = customerToken();
    if (!token) throw new CustomerApiError(401, "Vui lòng đăng nhập để tiếp tục đặt vé.");
    headers.set("Authorization", `Bearer ${token}`);
  }
  let response;
  try {
    response = await axios.request({
      url: `${base}/api/v1${path}`, method: options.method || "GET", data: options.body,
      headers: Object.fromEntries(headers.entries()), signal: options.signal || undefined,
      validateStatus: () => true
    });
  }
  catch (error) {
    if (axios.isCancel(error) || options.signal?.aborted) throw new DOMException("Yêu cầu đã được hủy.", "AbortError");
    throw new CustomerApiError(0, "Không kết nối được máy chủ. Vui lòng kiểm tra kết nối rồi thử lại.");
  }
  const data = response.data && typeof response.data === "object" ? response.data : null;
  if (response.status < 200 || response.status >= 300) {
    const validation = data?.errors ? Object.values(data.errors).flat().join(" ") : "";
    throw new CustomerApiError(response.status, data?.message || validation || (response.status === 401
      ? "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại." : "Không thể thực hiện thao tác. Vui lòng thử lại."));
  }
  return data as T;
}

export const customerApi = {
  customer: (signal?: AbortSignal) => request<CustomerSummary>("/bookings/customer-summary", { signal }, true),
  events: (search: string, sort: string, page: number, signal?: AbortSignal) => request<PublicEventPage>(
    `/public/events?${new URLSearchParams({ search, sort, page: String(page) })}`, { signal }),
  event: (id: string, signal?: AbortSignal) => request<PublicEvent>(`/public/events/${encodeURIComponent(id)}`, { signal }),
  reserve: (eventId: number, items: { ticketTypeId: number; quantity: number }[], requestKey: string) =>
    request<Booking>("/bookings", { method: "POST", body: JSON.stringify({ eventId, items, requestKey }) }, true),
  booking: (code: string, signal?: AbortSignal) => request<Booking>(`/bookings/${encodeURIComponent(code)}`, { signal }, true),
  attendee: (code: string, id: number, data: { name: string; email: string; phone: string }) =>
    request<Booking>(`/bookings/${encodeURIComponent(code)}/items/${id}/attendee`, { method: "PUT", body: JSON.stringify(data) }, true),
  face: (code: string, id: number, attendee: { name: string; email: string; phone: string }, image: File, consent: boolean) => {
    const body = new FormData(); Object.entries(attendee).forEach(([key, value]) => body.append(key, value)); body.append("Image", image); body.append("Consent", String(consent));
    return request<Booking>(`/bookings/${encodeURIComponent(code)}/items/${id}/face`, { method: "POST", body }, true);
  },
  confirmFree: (code: string) => request<Booking>(`/bookings/${encodeURIComponent(code)}/confirm-free`, { method: "POST" }, true),
  tickets: (page: number, filter: string, signal?: AbortSignal) => request<CustomerTickets>(
    `/bookings/my-tickets?${new URLSearchParams({ page: String(page), filter })}`, { signal }, true),
  pass: (code: string, id: number) => request<DigitalPass>(`/bookings/${encodeURIComponent(code)}/items/${id}/pass`, {}, true),
  cancelPart: (code: string, part: "free" | "paid") => request<Booking>(`/bookings/${encodeURIComponent(code)}/cancel/${part}`, { method: "POST" }, true),
  claimLink: (code: string, id: number) => request<ClaimLink>(`/bookings/${encodeURIComponent(code)}/items/${id}/claim-link`, { method: "POST" }, true),
  claim: (token: string, signal?: AbortSignal) => request<ClaimTicket>(`/bookings/claims/${encodeURIComponent(token)}`, { signal }),
  completeClaim: (token: string, attendee: { name: string; email: string; phone: string }, image: File) => {
    const body = new FormData(); Object.entries(attendee).forEach(([key, value]) => body.append(key, value));
    body.append("Image", image); body.append("Consent", "true");
    return request<ClaimTicket>(`/bookings/claims/${encodeURIComponent(token)}`, { method: "POST", body });
  },
  cancel: (code: string) => request<Booking>(`/bookings/${encodeURIComponent(code)}/cancel`, { method: "POST" }, true),
};

export const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
export const eventTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));

export function eventSchedule(start: string, end?: string, timeFirst = false): string {
  const date = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
  const time = (value: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
  if (end && date(start) !== date(end)) return `${date(start)} • ${time(start)} – ${date(end)} • ${time(end)}`;
  const range = `${time(start)}${end ? ` - ${time(end)}` : ""}`;
  return timeFirst ? `${range} • ${date(start)}` : `${date(start)} • ${range}`;
}
