import axiosClient from "./axiosClient";

export interface Attendee {
  id: number;
  ticketCode: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  attendeeFaceData: string | null;
  hasFaceScan: boolean;
  status: "Valid" | "CheckedIn" | "Cancelled";
  checkedInAt: string | null;
  ticketClass: string;
}

export interface AttendeesResponse {
  items: Attendee[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
}

export const attendeeService = {
  // GET: Lấy danh sách phân trang (6 bản ghi/trang) + Lọc
  getAttendees: async (
    eventId: number,
    pageNumber: number = 1,
    keyword?: string,
    ticketClass?: string,
    status?: string,
  ): Promise<AttendeesResponse> => {
    const response = await axiosClient.get(`/api/admin/attendees/${eventId}`, {
      params: { pageNumber, keyword, ticketClass, status },
    });
    return response.data;
  },

  // POST: Nút Điểm danh thủ công
  manualCheckIn: async (id: number) => {
    const response = await axiosClient.post(
      `/api/admin/attendees/${id}/manual-checkin`,
    );
    return response.data;
  },

  // POST: Nút Khóa / Mở khóa vé
  toggleLock: async (id: number) => {
    const response = await axiosClient.post(
      `/api/admin/attendees/${id}/toggle-lock`,
    );
    return response.data;
  },

  // GET: Nút Xuất file CSV (UTF-8 BOM)
  exportReport: async (
    eventId: number,
    keyword?: string,
    ticketClass?: string,
    status?: string,
  ) => {
    const response = await axiosClient.get(
      `/api/admin/attendees/export/${eventId}`,
      {
        params: { keyword, status },
        responseType: "blob",
      },
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Danh_sach_tham_du_Event_${eventId}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};
