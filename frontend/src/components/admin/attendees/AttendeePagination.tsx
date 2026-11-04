"use client";

import React from "react";

interface Props {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export default function AttendeePagination({
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
}: Props) {
  return (
    <div className="flex items-center justify-between p-3.5 px-5 bg-white border-t-2 border-[#e3efea] text-xs text-[#537583]">
      <div>
        Hiển thị 6 bản ghi/trang (Tổng số người tham dự:{" "}
        <span className="font-bold text-[#023852]">{totalCount}</span>)
      </div>

      <div className="flex items-center gap-2 font-semibold text-[#023852]">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          className="w-7.5 h-7.5 rounded border-2 border-[#cfe5dc] bg-white text-[#023852] flex items-center justify-center font-extrabold disabled:opacity-40 hover:bg-[#079fa0] hover:text-white transition"
        >
          &lt;
        </button>

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1 && val <= totalPages)
                onPageChange(val);
            }}
            className="w-12 h-7.5 text-center text-xs font-bold text-[#023852] border-2 border-[#cfe5dc] rounded outline-none focus:border-[#079fa0]"
          />
          <span>/</span>
          <span>{totalPages}</span>
        </div>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          className="w-7.5 h-7.5 rounded border-2 border-[#cfe5dc] bg-white text-[#023852] flex items-center justify-center font-extrabold disabled:opacity-40 hover:bg-[#079fa0] hover:text-white transition"
        >
          &gt;
        </button>
      </div>
    </div>
  );
}
