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
    <div className="bg-white border-2 border-[#cfe5dc] rounded-xl p-3.5 px-5 flex flex-wrap items-center justify-between gap-3.5 shadow-sm">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[#f2f7f5] border-2 border-[#cfe5dc] rounded-lg px-3 py-1.5 w-[280px]">
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
            className="border-none bg-transparent outline-none text-xs text-[#023852] w-full"
            placeholder="Tìm theo họ tên, email, SĐT, mã vé..."
            value={searchKeyword}
            onChange={onSearchChange}
          />
        </div>

        {/* CẬP NHẬT VALUE TẠI ĐÂY */}
        <select
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-[#cfe5dc] bg-white text-[#023852] outline-none focus:border-[#079fa0]"
          value={selectedClass}
          onChange={onClassChange}
        >
          <option value="all">Tất cả hạng vé</option>
          <option value="Vé VIP">Vé VIP</option>
          <option value="Vé Thường">Vé Thường</option>
          <option value="Thuờng">Vé Thuờng (CSDL)</option>
          <option value="Tiêu Chuẩn">Vé Tiêu Chuẩn</option>
          <option value="Hội Thảo">Vé Hội Thảo</option>
        </select>

        <select
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-[#cfe5dc] bg-white text-[#023852] outline-none focus:border-[#079fa0]"
          value={selectedStatus}
          onChange={onStatusChange}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="Valid">Chưa vào cổng (Valid)</option>
          <option value="CheckedIn">Đã vào cổng (CheckedIn)</option>
          <option value="Cancelled">Đã khóa vé (Cancelled)</option>
        </select>
      </div>

      <button
        type="button"
        onClick={onExportCSV}
        className="px-4 py-2 bg-[#15803d] hover:bg-[#166534] text-white rounded-lg text-xs font-bold transition"
      >
        Export CSV
      </button>
    </div>
  );
}
