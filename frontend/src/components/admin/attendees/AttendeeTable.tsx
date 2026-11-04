"use client";

import React from "react";
import { Attendee, PhotoModalData } from "@/types/attendee";

interface Props {
  attendees: Attendee[];
  loading: boolean;
  onViewPhoto: (photo: PhotoModalData) => void;
  onManualCheckIn: (id: number) => void;
  onToggleLock: (id: number) => void;
}

export default function AttendeeTable({
  attendees,
  loading,
  onViewPhoto,
  onManualCheckIn,
  onToggleLock,
}: Props) {
  return (
    <table className="w-full text-left border-collapse text-xs">
      <thead>
        <tr className="bg-[#f8fbfa] text-[#023852] border-b-2 border-[#cfe5dc]">
          <th className="p-3.5 px-4 font-extrabold uppercase text-[11.5px]">
            Mã Vé & Họ Tên
          </th>
          <th className="p-3.5 px-4 font-extrabold uppercase text-[11.5px]">
            Liên Hệ (SĐT / Email)
          </th>
          <th className="p-3.5 px-4 font-extrabold uppercase text-[11.5px]">
            Hạng Vé
          </th>
          <th className="p-3.5 px-4 font-extrabold uppercase text-[11.5px]">
            Sinh Trắc Face ID
          </th>
          <th className="p-3.5 px-4 font-extrabold uppercase text-[11.5px]">
            Trạng Thái Vé
          </th>
          <th className="p-3.5 px-4 font-extrabold uppercase text-[11.5px] text-right">
            Thao Tác Quản Lý
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#e3efea]">
        {loading ? (
          <tr>
            <td colSpan={6} className="text-center p-8 text-[#537583]">
              Đang tải dữ liệu danh sách...
            </td>
          </tr>
        ) : attendees.length === 0 ? (
          <tr>
            <td colSpan={6} className="text-center p-8 text-[#537583]">
              Không tìm thấy người tham dự nào phù hợp.
            </td>
          </tr>
        ) : (
          attendees.map((item) => (
            <tr key={item.id} className="hover:bg-[#fafdfc] transition">
              <td className="p-3.5 px-4 align-middle">
                <div className="font-mono font-bold text-[#079fa0]">
                  {item.ticketCode}
                </div>
                <div className="font-extrabold text-[#023852] mt-0.5">
                  {item.attendeeName}
                </div>
              </td>

              <td className="p-3.5 px-4 align-middle">
                <div className="font-mono font-bold text-[#023852]">
                  {item.attendeePhone || "N/A"}
                </div>
                <div className="text-[11.5px] text-[#537583]">
                  {item.attendeeEmail}
                </div>
              </td>

              <td className="p-3.5 px-4 align-middle font-bold text-[#023852]">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]">
                  {item.ticketClass}
                </span>
              </td>

              <td className="p-3.5 px-4 align-middle">
                {item.attendeeFaceData ? (
                  <button
                    type="button"
                    onClick={() =>
                      onViewPhoto({
                        name: item.attendeeName,
                        code: item.ticketCode,
                        url: item.attendeeFaceData!,
                      })
                    }
                    className="text-[11px] font-bold text-[#15803d] bg-[#dcfce7] border border-[#bbf7d0] px-2 py-0.5 rounded hover:bg-[#bbf7d0] transition inline-flex items-center gap-1"
                  >
                    📷 Xem hồ sơ ảnh
                  </button>
                ) : (
                  <span className="text-[#537583] font-mono text-[11px]">
                    Chưa nạp ảnh
                  </span>
                )}
              </td>

              <td className="p-3.5 px-4 align-middle">
                {item.status === "CheckedIn" ? (
                  <div className="flex flex-col">
                    <span className="text-[11px] font-extrabold text-[#15803d]">
                      ✓ Đã điểm danh
                    </span>
                    <span className="text-[10px] text-[#537583]">
                      {item.checkedInAt
                        ? new Date(item.checkedInAt).toLocaleTimeString("vi-VN")
                        : ""}
                    </span>
                  </div>
                ) : item.status === "Cancelled" ? (
                  <span className="text-[11px] font-extrabold text-[#dc2e2f]">
                    🔒 Đã tạm khóa
                  </span>
                ) : (
                  <span className="text-[11px] font-extrabold text-[#b45309]">
                    Chưa điểm danh
                  </span>
                )}
              </td>

              <td className="p-3.5 px-4 align-middle text-right space-x-2">
                {item.status === "Valid" && (
                  <button
                    type="button"
                    onClick={() => onManualCheckIn(item.id)}
                    className="bg-[#dcfce7] hover:bg-[#bbf7d0] text-[#15803d] border border-[#bbf7d0] px-2.5 py-1 rounded text-[11.5px] font-bold transition"
                  >
                    Điểm danh
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onToggleLock(item.id)}
                  className="bg-[#fee2e2] hover:bg-[#fecaca] text-[#dc2626] border border-[#fecaca] px-2.5 py-1 rounded text-[11.5px] font-bold transition"
                >
                  {item.status === "Cancelled" ? "Mở khóa vé" : "Tạm khóa vé"}
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
