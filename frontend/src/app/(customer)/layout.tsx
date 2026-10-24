import type { Metadata } from "next";
import { Suspense } from "react";
import CustomerHeader, { CustomerPageProvider } from "../../components/customer/CustomerHeader";
import { NotificationProvider } from "../../components/shared/NotificationProvider";
import "../../styles/customer.css";
import "../../styles/customer-booking.css";

export const metadata: Metadata = { title: "EventPass — Khám phá sự kiện & đặt vé", description: "Khám phá sự kiện, đặt vé và hoàn tất thông tin tham dự." };

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <NotificationProvider><CustomerPageProvider><div className="customer-site"><Suspense fallback={<div className="customer-state">Đang tải…</div>}><CustomerHeader />{children}</Suspense></div></CustomerPageProvider></NotificationProvider>;
}
