"use client";

import React from "react";

interface Props {
  searchKeyword: string;
  selectedClass: string;
  selectedStatus: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClassChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onStatusChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onExportCSV: () => void;
}

export default function AttendeeToolbar({
  searchKeyword,
  selectedClass,
  selectedStatus,
  onSearchChange,
  onClassChange,
  onStatusChange,
  onExportCSV,
}: Props) {
  return (
    <div className="bg-white border-2 border-[#cfe5dc] rounded-xl p-4 px-5 flex flex-wrap items-center justify-between gap-3.5 shadow-sm">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[#f2f7f5] border-2 border-[#cfe5dc] rounded-lg px-3 py-1.5 w-[300px]">
          <svg
            className="w-4 h-4 text-[#537583]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="border-none bg-transparent outline-none text-xs text-[#023852] w-full placeholder:text-[#537583]"
            placeholder="Tìm tên, email, SĐT hoặc mã vé..."
            value={searchKeyword}
            onChange={onSearchChange}
          />
        </div>

        <select
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-[#cfe5dc] bg-white text-[#023852] outline-none focus:border-[#079fa0]"
          value={selectedClass}
          onChange={onClassChange}
        >
          <option value="all">Tất cả hạng vé</option>
          <option value="Vé VIP">Vé VIP</option>
          <option value="Vé Thuờng">Vé Thường (CSDL)</option>
          <option value="Vé Thường">Vé Thường</option>
          <option value="Vé Tiêu Chuẩn">Vé Tiêu Chuẩn</option>
        </select>

        <select
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-[#cfe5dc] bg-white text-[#023852] outline-none focus:border-[#079fa0]"
          value={selectedStatus}
          onChange={onStatusChange}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="Valid">Chưa vào cổng</option>
          <option value="CheckedIn">Đã vào cổng</option>
          <option value="Cancelled">Đã khóa vé</option>
        </select>
      </div>

      <button
        type="button"
        onClick={onExportCSV}
        className="px-4 py-2 bg-[#15803d] hover:bg-[#166534] text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-2 shadow-sm"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span>Xuất Báo Cáo (CSV)</span>
      </button>
    </div>
  );
}
