"use client";

import React, { useState, useEffect, useCallback } from "react";
import axiosClient from "@/services/axiosClient";
import { Attendee, PhotoModalData } from "@/types/attendee";

import AttendeeHeader from "@/components/admin/attendees/AttendeeHeader";
import AttendeeToolbar from "@/components/admin/attendees/AttendeeToolbar";
import AttendeeTable from "@/components/admin/attendees/AttendeeTable";
import AttendeePagination from "@/components/admin/attendees/AttendeePagination";
import AttendeeModal from "@/components/admin/attendees/AttendeeModal";

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
      console.error("Lỗi tải danh sách người tham dự:", err);
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
      alert("Vé không thể điểm danh.");
    }
  };

  const handleToggleLock = async (id: number) => {
    try {
      await axiosClient.post(`/api/admin/attendees/${id}/toggle-lock`);
      showToast("Đã cập nhật trạng thái vé!");
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
        `Danh_sach_tham_du_${new Date().toISOString().slice(0, 10)}.csv`,
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
      <AttendeeHeader onExportCSV={handleExportCSV} />

      <main className="p-8 pb-16 max-w-[1200px] w-full mx-auto flex flex-col gap-5 flex-1">
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

      <AttendeeModal
        photoData={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />

      {toastMessage && (
        <div className="fixed bottom-6 left-6 bg-[#023852] text-white border-l-4 border-[#079fa0] px-5 py-3.5 rounded-lg shadow-xl text-xs font-medium z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
