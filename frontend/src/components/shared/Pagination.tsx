"use client";

import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from "lucide-react";

// Chỉ hiển thị tối đa ba số trang, dồn về đầu hoặc cuối khi không còn trang liền kề.
export default function Pagination({ page, totalPages, disabled = false, onChange }: {
  page: number; totalPages: number; disabled?: boolean; onChange: (page: number) => void;
}) {
  const last = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, page), last);
  const firstVisible = Math.max(1, Math.min(current - 1, last - 2));
  const pages = Array.from({ length: Math.min(3, last) }, (_, i) => firstVisible + i);
  const firstDisabled = disabled || totalPages === 0 || current === 1;
  const lastDisabled = disabled || totalPages === 0 || current === last;
  return <nav className="eventpass-pagination" aria-label="Phân trang">
    <button type="button" title="Trang đầu" aria-label="Trang đầu" disabled={firstDisabled} onClick={() => onChange(1)}><ChevronsLeft size={15} /></button>
    <button type="button" title="Trang trước" aria-label="Trang trước" disabled={firstDisabled} onClick={() => onChange(current - 1)}><ChevronLeft size={15} /></button>
    {pages.map(number => <button type="button" key={number} aria-label={`Trang ${number}`} aria-current={number === current ? "page" : undefined} className={number === current ? "active" : ""} disabled={disabled || totalPages === 0} onClick={() => onChange(number)}>{number}</button>)}
    <button type="button" title="Trang sau" aria-label="Trang sau" disabled={lastDisabled} onClick={() => onChange(current + 1)}><ChevronRight size={15} /></button>
    <button type="button" title="Trang cuối" aria-label="Trang cuối" disabled={lastDisabled} onClick={() => onChange(last)}><ChevronsRight size={15} /></button>
  </nav>;
}
