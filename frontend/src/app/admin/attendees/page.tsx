"use client";

import React, { useState, useEffect, useCallback } from "react";
import axiosClient from "@/services/axiosClient";
import { Attendee, PhotoModalData } from "@/types/attendee";

import AttendeeToolbar from "@/components/admin/attendees/AttendeeToolbar";
import AttendeeTable from "@/components/admin/attendees/AttendeeTable";
import AttendeePagination from "@/components/admin/attendees/AttendeePagination";

export default function AttendeesPage() {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [selectedPhoto, setSelectedPhoto] = useState<PhotoModalData | null>(
    null,
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchAttendees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/api/admin/attendees/1", {
        params: {
          pageNumber: currentPage,
          keyword: searchKeyword.trim() || undefined,
          ticketClass: selectedClass !== "all" ? selectedClass : undefined,
          status: selectedStatus !== "all" ? selectedStatus : undefined,
        },
      });
      setAttendees(res.data.items || []);
      setTotalCount(res.data.totalCount || 0);
    } catch (err) {
      console.error("Lỗi khi tải danh sách người tham dự:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchKeyword, selectedClass, selectedStatus]);

  useEffect(() => {
    fetchAttendees();
  }, [fetchAttendees]);

  const handleManualCheckIn = async (id: number) => {
    try {
      await axiosClient.post(`/api/admin/attendees/${id}/manual-checkin`);
      showToast("Điểm danh thủ công thành công!");
      fetchAttendees();
    } catch (err) {
      alert("Vé không thể điểm danh (có thể đã vào cổng hoặc bị khóa).");
    }
  };

  const handleToggleLock = async (id: number) => {
    try {
      await axiosClient.post(`/api/admin/attendees/${id}/toggle-lock`);
      showToast("Đã cập nhật trạng thái khóa/mở khóa vé!");
      fetchAttendees();
    } catch (err) {
      alert("Lỗi cập nhật trạng thái vé.");
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await axiosClient.get("/api/admin/attendees/export/1", {
        params: {
          keyword: searchKeyword.trim() || undefined,
          ticketClass: selectedClass !== "all" ? selectedClass : undefined,
          status: selectedStatus !== "all" ? selectedStatus : undefined,
        },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Danh_sach_tham_du_Event_1_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast("Đã xuất báo cáo CSV thành công!");
    } catch (err) {
      alert("Lỗi khi tải file báo cáo.");
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  return (
    <div className="min-h-screen bg-[#f2f7f5] text-[#023852] font-sans flex flex-col antialiased">
      {/* HEADER BAR CHUYÊN NGHIỆP (LOẠI BỎ CHỮ UC13 & SANDBOX) */}
      <header className="bg-white border-b-2 border-[#cfe5dc] px-8 py-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#023852] flex items-center gap-2.5">
            <svg
              className="w-5 h-5 text-[#079fa0]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
              />
              <circle cx="9" cy="7" r="4" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M23 21v-2a4 4 0 0 3-3.87"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 3.13a4 4 0 0 1 0 7.75"
              />
            </svg>
            <span>Danh Sách Người Tham Dự & Đối Soát Vé</span>
          </h1>
          <p className="text-xs text-[#537583] mt-0.5">
            Quản lý thông tin điểm danh, kiểm tra hồ sơ Face ID và kết xuất báo
            cáo sự kiện
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
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
      </header>

      {/* BODY CONTENT */}
      <main className="p-8 pb-16 max-w-[1200px] w-full mx-auto flex flex-col gap-5 flex-1">
        {/* Toolbar Component (Tìm kiếm & Bộ lọc) */}
        <AttendeeToolbar
          searchKeyword={searchKeyword}
          selectedClass={selectedClass}
          selectedStatus={selectedStatus}
          onSearchChange={(e) => {
            setSearchKeyword(e.target.value);
            setCurrentPage(1);
          }}
          onClassChange={(e) => {
            setSelectedClass(e.target.value);
            setCurrentPage(1);
          }}
          onStatusChange={(e) => {
            setSelectedStatus(e.target.value);
            setCurrentPage(1);
          }}
          onExportCSV={handleExportCSV}
        />

        {/* Table & Pagination Components */}
        <div className="bg-white border-2 border-[#cfe5dc] rounded-xl shadow-sm overflow-hidden">
          <AttendeeTable
            attendees={attendees}
            loading={loading}
            onViewPhoto={(photo) => setSelectedPhoto(photo)}
            onManualCheckIn={handleManualCheckIn}
            onToggleLock={handleToggleLock}
          />

          <AttendeePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      </main>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-[#023852]/50 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-white p-5 rounded-xl max-w-sm w-full flex flex-col items-center gap-3 shadow-2xl border-2 border-[#cfe5dc]">
            <h3 className="font-bold text-[#023852] text-sm text-center">
              {selectedPhoto.name} ({selectedPhoto.code})
            </h3>
            <img
              src={selectedPhoto.url}
              alt="Face Chân Dung"
              className="w-48 h-48 object-cover rounded-lg border-2 border-[#cfe5dc]"
            />
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="mt-2 px-4 py-1.5 bg-[#079fa0] hover:bg-[#058586] text-white font-bold rounded-lg text-xs transition"
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 bg-[#023852] text-white border-l-4 border-[#079fa0] px-5 py-3.5 rounded-lg shadow-xl text-xs font-medium z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
