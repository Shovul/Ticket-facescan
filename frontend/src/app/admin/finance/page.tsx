"use client";

import React, { useState, useEffect, useCallback } from "react";
import axiosClient from "@/services/axiosClient";

interface Transaction {
  id: number;
  orderId: number;
  transactionCode: string;
  amount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  buyerEmail: string;
  eventTitle: string;
}

export default function FinanceAdminPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const [keyword, setKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Tải danh sách lịch sử giao dịch từ Backend API
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/api/admin/transactions", {
        params: {
          pageNumber: currentPage,
          keyword: keyword.trim() || undefined,
        },
      });
      setTransactions(res.data.items || []);
      setTotalCount(res.data.totalCount || 0);
    } catch (err) {
      console.error("Lỗi khi tải lịch sử giao dịch:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, keyword]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  return (
    <div className="min-h-screen bg-[#f2f7f5] text-[#023852] font-sans flex flex-col antialiased">
      {/* HEADER BAR CHUYÊN NGHIỆP (ĐÃ LƯỢC BỎ UC14 & SANDBOX) */}
      <header className="bg-white border-b-2 border-[#cfe5dc] px-8 py-4 flex items-center justify-between">
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
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Quản Lý Lịch Sử Giao Dịch VietQR</span>
          </h1>
          <p className="text-xs text-[#537583] mt-0.5">
            Giám sát dòng tiền thanh toán vé tự động thời gian thực từ cổng ngân
            hàng
          </p>
        </div>
      </header>

      {/* BODY CONTENT */}
      <main className="p-8 pb-16 max-w-[1200px] w-full mx-auto flex flex-col gap-5 flex-1">
        {/* TOOLBAR TÌM KIẾM */}
        <div className="bg-white border-2 border-[#cfe5dc] rounded-xl p-4 px-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 bg-[#f2f7f5] border-2 border-[#cfe5dc] rounded-lg px-3 py-1.5 w-[340px]">
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
              placeholder="Tìm mã đơn, mã tham chiếu FT, email..."
              value={keyword}
              onChange={handleKeywordChange}
            />
          </div>
        </div>

        {/* BẢNG DANH SÁCH LỊCH SỬ GIAO DỊCH */}
        <div className="bg-white border-2 border-[#cfe5dc] rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8fbfa] text-[#023852] border-b-2 border-[#cfe5dc]">
                <th className="p-3.5 px-4 font-extrabold uppercase text-[11.5px]">
                  Mã Giao Dịch / FT Code
                </th>
                <th className="p-3.5 px-4 font-extrabold uppercase text-[11.5px]">
                  Tài Khoản Khách Hàng
                </th>
                <th className="p-3.5 px-4 font-extrabold uppercase text-[11.5px]">
                  Tên Sự Kiện
                </th>
                <th className="p-3.5 px-4 font-extrabold uppercase text-[11.5px]">
                  Số Tiền Thực Nhận
                </th>
                <th className="p-3.5 px-4 font-extrabold uppercase text-[11.5px]">
                  Phương Thức
                </th>
                <th className="p-3.5 px-4 font-extrabold uppercase text-[11.5px]">
                  Thời Gian Giao Dịch
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3efea]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-[#537583]">
                    Đang tải dữ liệu giao dịch...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-[#537583]">
                    Không tìm thấy giao dịch nào phù hợp.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#fafdfc] transition">
                    <td className="p-3.5 px-4 font-mono font-bold text-[#079fa0]">
                      {tx.transactionCode}
                    </td>
                    <td className="p-3.5 px-4 font-bold text-[#023852]">
                      {tx.buyerEmail}
                    </td>
                    <td className="p-3.5 px-4 text-[#023852]">
                      {tx.eventTitle}
                    </td>
                    <td className="p-3.5 px-4 font-extrabold text-[#15803d]">
                      +{tx.amount?.toLocaleString("vi-VN")} VNĐ
                    </td>
                    <td className="p-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded text-[11px] bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0] font-semibold">
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3.5 px-4 text-[#537583]">
                      {new Date(tx.createdAt).toLocaleString("vi-VN")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* CỤM PHÂN TRANG */}
          <div className="flex items-center justify-between p-3.5 px-5 bg-white border-t-2 border-[#e3efea] text-xs text-[#537583]">
            <div>
              Hiển thị 6 giao dịch/trang (Tổng số giao dịch:{" "}
              <span className="font-bold text-[#023852]">{totalCount}</span>)
            </div>

            <div className="flex items-center gap-2 font-semibold text-[#023852]">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
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
                      setCurrentPage(val);
                  }}
                  className="w-12 h-7.5 text-center text-xs font-bold text-[#023852] border-2 border-[#cfe5dc] rounded outline-none focus:border-[#079fa0]"
                />
                <span>/</span>
                <span>{totalPages}</span>
              </div>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                className="w-7.5 h-7.5 rounded border-2 border-[#cfe5dc] bg-white text-[#023852] flex items-center justify-center font-extrabold disabled:opacity-40 hover:bg-[#079fa0] hover:text-white transition"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
