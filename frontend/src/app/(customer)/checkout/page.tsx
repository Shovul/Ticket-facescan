"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import BookingCheckout from "../../../components/customer/BookingCheckout";

function Checkout() {
  const params = useSearchParams();
  const [stored, setStored] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { setStored(sessionStorage.getItem("eventpass.activeBooking")); setReady(true); }, []);
  const code = params.get("order") || stored;
  if (!ready) return <main className="storefront-main"><div className="customer-state">Đang mở đơn đặt vé…</div></main>;
  if (!code) return <main className="storefront-main"><div className="customer-state"><h1>Chưa có đơn đang đặt</h1><p>Khám phá sự kiện và chọn những tấm vé dành cho bạn.</p><Link href="/events" className="btn-proceed-pay">Khám phá sự kiện</Link></div></main>;
  return <BookingCheckout key={code} code={code} />;
}

export default function CheckoutPage() {
  return <Suspense fallback={<main className="storefront-main">Đang tải…</main>}><Checkout /></Suspense>;
}
